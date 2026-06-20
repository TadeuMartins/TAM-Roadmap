import type { Project } from './types'
import { initiativeAnnualBenefit, projectTotals } from './financial'

export type ValidationSeverity = 'error' | 'warning'

export interface ValidationIssue {
  id: string
  severity: ValidationSeverity
  area: 'process' | 'pain' | 'root-cause' | 'solution' | 'initiative' | 'roadmap'
  message: string
  entityId?: string
}

const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((item) => [item.id, item]))

export function validateProject(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const processes = byId(project.processes)
  const pains = byId(project.pains)
  const clusters = byId(project.clusters)
  const rootCauses = byId(project.rootCauses)
  const solutions = byId(project.solutions)
  const initiatives = byId(project.initiatives)
  const stakeholders = byId(project.stakeholders)

  const stepIds = new Set(project.processes.flatMap((process) => process.steps.map((step) => step.id)))

  project.processes.forEach((process) => {
    process.lanes.forEach((lane) => {
      if (lane.stakeholderId && !stakeholders.has(lane.stakeholderId)) {
        issues.push({
          id: `lane-stakeholder-${lane.id}`,
          severity: 'warning',
          area: 'process',
          entityId: lane.id,
          message: `Lane "${lane.label}" is linked to a missing stakeholder.`,
        })
      }
    })

    process.steps.forEach((step) => {
      if (!process.lanes.some((lane) => lane.id === step.laneId)) {
        issues.push({
          id: `step-lane-${step.id}`,
          severity: 'error',
          area: 'process',
          entityId: step.id,
          message: `Step "${step.label}" is assigned to a missing lane.`,
        })
      }
      step.painIds.forEach((painId) => {
        if (!pains.has(painId)) {
          issues.push({
            id: `step-pain-${step.id}-${painId}`,
            severity: 'error',
            area: 'process',
            entityId: step.id,
            message: `Step "${step.label}" references a missing pain (${painId}).`,
          })
        }
      })
    })

    process.edges.forEach((edge) => {
      const localStepIds = new Set(process.steps.map((step) => step.id))
      if (!localStepIds.has(edge.source) || !localStepIds.has(edge.target)) {
        issues.push({
          id: `edge-${edge.id}`,
          severity: 'error',
          area: 'process',
          entityId: edge.id,
          message: `Connector "${edge.label || edge.id}" points to a missing process step.`,
        })
      }
    })
  })

  project.pains.forEach((pain) => {
    if (!pain.statement.trim()) {
      issues.push({ id: `pain-empty-${pain.id}`, severity: 'error', area: 'pain', entityId: pain.id, message: `${pain.code} has no statement.` })
    }
    if (pain.processId && !processes.has(pain.processId)) {
      issues.push({ id: `pain-process-${pain.id}`, severity: 'error', area: 'pain', entityId: pain.id, message: `${pain.code} references a missing process.` })
    }
    if (pain.stepId && !stepIds.has(pain.stepId)) {
      issues.push({ id: `pain-step-${pain.id}`, severity: 'error', area: 'pain', entityId: pain.id, message: `${pain.code} is not linked to a valid process step.` })
    }
    if (!pain.stepId) {
      issues.push({ id: `pain-orphan-step-${pain.id}`, severity: 'warning', area: 'pain', entityId: pain.id, message: `${pain.code} is not anchored to a process step.` })
    }
    if (pain.evidenceIds.length === 0) {
      issues.push({ id: `pain-evidence-${pain.id}`, severity: 'warning', area: 'pain', entityId: pain.id, message: `${pain.code} has no evidence attached.` })
    }
  })

  project.clusters.forEach((cluster) => {
    if (cluster.painIds.length === 0) {
      issues.push({ id: `cluster-empty-${cluster.id}`, severity: 'warning', area: 'pain', entityId: cluster.id, message: `${cluster.code} has no pains.` })
    }
    cluster.painIds.forEach((painId) => {
      if (!pains.has(painId)) {
        issues.push({ id: `cluster-pain-${cluster.id}-${painId}`, severity: 'error', area: 'pain', entityId: cluster.id, message: `${cluster.code} references a missing pain.` })
      }
    })
  })

  project.rootCauses.forEach((rootCause) => {
    if (rootCause.clusterIds.length === 0) {
      issues.push({ id: `root-cluster-empty-${rootCause.id}`, severity: 'error', area: 'root-cause', entityId: rootCause.id, message: `${rootCause.code} is not linked to any cluster.` })
    }
    rootCause.clusterIds.forEach((clusterId) => {
      if (!clusters.has(clusterId)) {
        issues.push({ id: `root-cluster-${rootCause.id}-${clusterId}`, severity: 'error', area: 'root-cause', entityId: rootCause.id, message: `${rootCause.code} references a missing cluster.` })
      }
    })
  })

  project.fiveWhys.forEach((fiveWhy) => {
    if (!clusters.has(fiveWhy.clusterId)) {
      issues.push({ id: `why-cluster-${fiveWhy.id}`, severity: 'error', area: 'root-cause', entityId: fiveWhy.id, message: `5 Whys item references a missing cluster.` })
    }
    if (!rootCauses.has(fiveWhy.rootCauseId)) {
      issues.push({ id: `why-root-${fiveWhy.id}`, severity: 'error', area: 'root-cause', entityId: fiveWhy.id, message: `5 Whys item references a missing root cause.` })
    }
    if (fiveWhy.whys.filter(Boolean).length < 3) {
      issues.push({ id: `why-depth-${fiveWhy.id}`, severity: 'warning', area: 'root-cause', entityId: fiveWhy.id, message: `5 Whys item has fewer than three why levels.` })
    }
  })

  project.solutions.forEach((solution) => {
    if (solution.rootCauseIds.length === 0) {
      issues.push({ id: `solution-root-empty-${solution.id}`, severity: 'error', area: 'solution', entityId: solution.id, message: `${solution.code} is orphaned: no root cause linkage.` })
    }
    solution.rootCauseIds.forEach((rootCauseId) => {
      if (!rootCauses.has(rootCauseId)) {
        issues.push({ id: `solution-root-${solution.id}-${rootCauseId}`, severity: 'error', area: 'solution', entityId: solution.id, message: `${solution.code} references a missing root cause.` })
      }
    })
    if (!solution.initiativeId) {
      issues.push({ id: `solution-initiative-empty-${solution.id}`, severity: 'warning', area: 'solution', entityId: solution.id, message: `${solution.code} is not mapped to a roadmap initiative.` })
    } else if (!initiatives.has(solution.initiativeId)) {
      issues.push({ id: `solution-initiative-${solution.id}`, severity: 'error', area: 'solution', entityId: solution.id, message: `${solution.code} references a missing initiative.` })
    }
  })

  project.initiatives.forEach((initiative) => {
    if (initiative.solutionIds.length === 0) {
      issues.push({ id: `initiative-solution-empty-${initiative.id}`, severity: 'error', area: 'initiative', entityId: initiative.id, message: `${initiative.code} is not backed by any solution.` })
    }
    initiative.solutionIds.forEach((solutionId) => {
      if (!solutions.has(solutionId)) {
        issues.push({ id: `initiative-solution-${initiative.id}-${solutionId}`, severity: 'error', area: 'initiative', entityId: initiative.id, message: `${initiative.code} references a missing solution.` })
      }
    })
    if (initiative.kpis.length === 0) {
      issues.push({ id: `initiative-kpi-${initiative.id}`, severity: 'warning', area: 'initiative', entityId: initiative.id, message: `${initiative.code} has no proof KPI.` })
    }
    if (initiative.investment <= 0 || initiativeAnnualBenefit(initiative) <= 0) {
      issues.push({ id: `initiative-finance-${initiative.id}`, severity: 'warning', area: 'initiative', entityId: initiative.id, message: `${initiative.code} has incomplete business-case numbers.` })
    }
  })

  project.waves.forEach((wave) => {
    if (!project.initiatives.some((initiative) => initiative.waveId === wave.id)) {
      issues.push({ id: `wave-empty-${wave.id}`, severity: 'warning', area: 'roadmap', entityId: wave.id, message: `${wave.label} has no initiatives.` })
    }
  })

  return issues
}

export function scorePain(pain: { frequency: number; impact: number }): number {
  return pain.frequency * pain.impact
}

export function totals(project: Project) {
  return projectTotals(project)
}

export function traceabilityCoverage(project: Project) {
  const rootCauseIdsWithSolution = new Set(project.solutions.flatMap((solution) => solution.rootCauseIds))
  const solutionIdsWithInitiative = new Set(project.initiatives.flatMap((initiative) => initiative.solutionIds))
  const painsWithStep = project.pains.filter((pain) => pain.stepId).length
  return {
    painsAnchored: project.pains.length ? painsWithStep / project.pains.length : 1,
    rootsSolved: project.rootCauses.length ? rootCauseIdsWithSolution.size / project.rootCauses.length : 1,
    solutionsRoadmapped: project.solutions.length ? solutionIdsWithInitiative.size / project.solutions.length : 1,
  }
}
