import type { Project } from './types'
import { initiativeAnnualBenefit, normalizeBenefitModel } from './financial'

export type WorkflowStepId =
  | 'setup'
  | 'stakeholders'
  | 'process'
  | 'pains'
  | 'rootCause'
  | 'solutions'
  | 'roadmap'
  | 'financials'
  | 'preview'

export interface StepDefinition {
  id: WorkflowStepId
  label: string
  short: string
  goal: string
}

export interface StepStatus {
  step: StepDefinition
  complete: boolean
  locked: boolean
  missing: string[]
}

export const workflowSteps: StepDefinition[] = [
  { id: 'setup', label: 'Project Setup', short: 'Setup', goal: 'Define the engagement context and output expectations.' },
  { id: 'stakeholders', label: 'Stakeholders', short: 'People', goal: 'Identify the roles that own the process, pains and decisions.' },
  { id: 'process', label: 'Process Map', short: 'Map', goal: 'Map the current process before proposing solutions.' },
  { id: 'pains', label: 'Pain Inventory', short: 'Pains', goal: 'Turn observations into MECE, scored business pains.' },
  { id: 'rootCause', label: 'Root Cause', short: 'Root', goal: 'Cluster pains and confirm root causes using 5 Whys.' },
  { id: 'solutions', label: 'Solutions', short: 'Solve', goal: 'Map every root cause to concrete solutions and proof KPIs.' },
  { id: 'roadmap', label: 'Initiatives', short: 'Init.', goal: 'Convert solutions into sequenced initiatives before calculating the business case.' },
  { id: 'financials', label: 'Return', short: 'Return', goal: 'Review annual gains by initiative and edit return assumptions only when needed.' },
  { id: 'preview', label: 'Executive Roadmap', short: 'Roadmap', goal: 'Review the executive roadmap, Digital Thread view and PPT readiness.' },
]

export function validateSetup(project: Project): string[] {
  const missing: string[] = []
  if (!project.client.trim() && !project.name.trim()) missing.push('Add a client or project name.')
  if (!project.industry.trim()) missing.push('Select or enter the industry.')
  if (!project.objective.trim()) missing.push('Write the TAM engagement objective.')
  if (!project.currency) missing.push('Select the business-case currency.')
  if (!project.horizon) missing.push('Define the roadmap horizon.')
  return missing
}

export function validateStakeholders(project: Project): string[] {
  const missing: string[] = []
  if (project.stakeholders.length === 0) missing.push('Add at least one stakeholder.')
  project.stakeholders.forEach((stakeholder) => {
    if (!stakeholder.name.trim() || !stakeholder.role.trim() || !stakeholder.area.trim()) {
      missing.push(`Complete name, role and area for stakeholder "${stakeholder.name || stakeholder.id}".`)
    }
  })
  return missing
}

export function validateProcess(project: Project): string[] {
  const missing: string[] = []
  if (project.processes.length === 0) return ['Create at least one process map.']
  const hasValidProcess = project.processes.some((process) => process.lanes.length >= 2 && process.steps.length >= 3)
  if (!hasValidProcess) missing.push('Create a process with at least 2 lanes and 3 steps.')
  project.processes.forEach((process) => {
    const laneIds = new Set(process.lanes.map((lane) => lane.id))
    process.steps.forEach((step) => {
      if (!laneIds.has(step.laneId)) missing.push(`Assign step "${step.label}" to a valid lane.`)
    })
  })
  return missing
}

export function validatePains(project: Project): string[] {
  const missing: string[] = []
  if (project.pains.length < 3) missing.push('Capture at least 3 business pains.')
  const codes = new Set<string>()
  project.pains.forEach((pain) => {
    if (!pain.code.trim()) missing.push('Every pain needs a unique code.')
    if (codes.has(pain.code.toLowerCase())) missing.push(`Duplicate pain code ${pain.code}.`)
    codes.add(pain.code.toLowerCase())
    if (!pain.statement.trim()) missing.push(`${pain.code} needs a pain statement.`)
    if (!pain.stepId && pain.stakeholderIds.length === 0) missing.push(`${pain.code} must link to a process step or stakeholder.`)
    if (pain.frequency <= 0 || pain.impact <= 0) missing.push(`${pain.code} needs frequency and impact scores.`)
  })
  return missing
}

export function validateRootCause(project: Project): string[] {
  const missing: string[] = []
  if (project.clusters.length === 0) missing.push('Create at least one pain cluster.')
  project.clusters.forEach((cluster) => {
    if (cluster.painIds.length === 0) missing.push(`${cluster.code} must include at least one pain.`)
  })
  if (project.rootCauses.length === 0) missing.push('Confirm at least one root cause.')
  project.rootCauses.forEach((rootCause) => {
    if (!rootCause.statement.trim()) missing.push(`${rootCause.code} needs a root-cause statement.`)
    if (rootCause.clusterIds.length === 0) missing.push(`${rootCause.code} must link to at least one cluster.`)
  })
  project.clusters.forEach((cluster) => {
    if (!project.fiveWhys.some((why) => why.clusterId === cluster.id && why.whys.filter(Boolean).length >= 3)) {
      missing.push(`${cluster.code} needs a 5 Whys chain with at least 3 levels.`)
    }
  })
  return missing
}

export function validateSolutions(project: Project): string[] {
  const missing: string[] = []
  project.rootCauses.forEach((rootCause) => {
    if (!project.solutions.some((solution) => solution.rootCauseIds.includes(rootCause.id))) {
      missing.push(`${rootCause.code} has no mapped solution.`)
    }
  })
  project.solutions.forEach((solution) => {
    if (!solution.statement.trim()) missing.push(`${solution.code} needs a concrete solution statement.`)
    if (solution.rootCauseIds.length === 0) missing.push(`${solution.code} must link to a root cause.`)
    if (!solution.proofKpi.trim()) missing.push(`${solution.code} needs a proof KPI.`)
    if (!solution.digitalThread) missing.push(`${solution.code} needs a Siemens Digital Thread.`)
  })
  return missing
}

export function validateRoadmap(project: Project): string[] {
  const missing: string[] = []
  if (project.initiatives.length === 0) missing.push('Create at least one roadmap initiative.')
  project.solutions.forEach((solution) => {
    if (!solution.initiativeId && !project.initiatives.some((initiative) => initiative.solutionIds.includes(solution.id))) {
      missing.push(`${solution.code} is not mapped to an initiative.`)
    }
  })
  project.initiatives.forEach((initiative) => {
    if (!initiative.name.trim() || !initiative.objective.trim()) missing.push(`${initiative.code} needs a name and objective.`)
    if (!initiative.waveId) missing.push(`${initiative.code} must be assigned to a wave.`)
    if (initiative.solutionIds.length === 0) missing.push(`${initiative.code} must link to at least one solution.`)
    if (initiative.kpis.length === 0) missing.push(`${initiative.code} needs at least one KPI.`)
  })
  return missing
}

export function validateFinancials(project: Project): string[] {
  const missing: string[] = []
  project.initiatives.forEach((initiative) => {
    if (initiative.investment <= 0) missing.push(`${initiative.code} needs investment.`)
    if (initiativeAnnualBenefit(initiative) <= 0) missing.push(`${initiative.code} needs annual benefit drivers.`)
    if (normalizeBenefitModel(initiative.benefitModel).waccPercent <= 0) missing.push(`${initiative.code} needs company WACC for discounted payback.`)
  })
  return missing
}

export function missingForStep(project: Project, stepId: WorkflowStepId): string[] {
  const validators: Record<WorkflowStepId, (project: Project) => string[]> = {
    setup: validateSetup,
    stakeholders: validateStakeholders,
    process: validateProcess,
    pains: validatePains,
    rootCause: validateRootCause,
    solutions: validateSolutions,
    roadmap: validateRoadmap,
    financials: validateFinancials,
    preview: validatePptReadiness,
  }
  return validators[stepId](project)
}

export function validatePptReadiness(project: Project): string[] {
  return [
    ...validateSetup(project),
    ...validateStakeholders(project),
    ...validateProcess(project),
    ...validatePains(project),
    ...validateRootCause(project),
    ...validateSolutions(project),
    ...validateRoadmap(project),
    ...validateFinancials(project),
  ]
}

export function workflowStatus(project: Project): StepStatus[] {
  let locked = false
  return workflowSteps.map((step) => {
    const missing = missingForStep(project, step.id)
    const status = { step, missing, complete: missing.length === 0, locked }
    if (!status.complete) locked = true
    return status
  })
}

export function firstIncompleteStep(project: Project): WorkflowStepId {
  return workflowStatus(project).find((status) => !status.complete)?.step.id || 'preview'
}
