export type Severity = 'low' | 'medium' | 'high' | 'critical'

export type StepKind = 'activity' | 'decision' | 'document' | 'system' | 'handoff'

export type EvidenceType = 'quote' | 'kpi' | 'observation' | 'document'

export type DigitalThread = 'Integrated Lifecycle Management' | 'Smart Manufacturing' | 'Service and Asset Lifecycle Management'

export interface BenefitModel {
  downtimeHoursAvoided: number
  downtimeCostPerHour: number
  professionalHoursSaved: number
  professionalCostPerHour: number
  reworkAvoided: number
  energySavings: number
  inventorySavings: number
  complianceRiskAvoided: number
  marginUplift: number
  otherAnnualBenefit: number
  waccPercent: number
  benefitYears: number
  benefitStartMonth: number
}

export interface FinancialAssumptions {
  waccPercent: number
  benefitYears: number
}

export interface Stakeholder {
  id: string
  name: string
  role: string
  area: string
  concerns: string[]
}

export interface Lane {
  id: string
  label: string
  ownerType: 'role' | 'area' | 'system' | 'external'
  stakeholderId?: string
}

export interface ProcessStep {
  id: string
  label: string
  laneId: string
  kind: StepKind
  x: number
  y: number
  system?: string
  painIds: string[]
  notes?: string
}

export interface ProcessEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface ProcessMap {
  id: string
  name: string
  mode: 'as-is' | 'to-be'
  lanes: Lane[]
  steps: ProcessStep[]
  edges: ProcessEdge[]
}

export interface Evidence {
  id: string
  type: EvidenceType
  text: string
  source?: string
}

export interface Pain {
  id: string
  code: string
  statement: string
  processId?: string
  stepId?: string
  stakeholderIds: string[]
  evidenceIds: string[]
  severity: Severity
  frequency: number
  impact: number
}

export interface Cluster {
  id: string
  code: string
  theme: string
  painIds: string[]
}

export interface FiveWhy {
  id: string
  clusterId: string
  whys: string[]
  rootCauseId: string
}

export interface RootCause {
  id: string
  code: string
  statement: string
  clusterIds: string[]
}

export interface Solution {
  id: string
  code: string
  statement: string
  rootCauseIds: string[]
  initiativeId?: string
  digitalThread?: DigitalThread
  productHints: string[]
  proofKpi: string
}

export interface Initiative {
  id: string
  code: string
  name: string
  objective: string
  waveId: string
  workstreamIds: string[]
  solutionIds: string[]
  kpis: string[]
  investment: number
  annualBenefit: number
  benefitModel?: BenefitModel
  benefitLogic?: string
  assumptions?: string[]
}

export interface RoadmapWave {
  id: string
  label: string
  title: string
  horizon: string
}

export interface Workstream {
  id: string
  label: string
  description: string
}

export interface Project {
  id: string
  name: string
  industry: string
  client: string
  objective: string
  currency?: string
  horizon?: string
  outputStyle?: string
  timelineView?: 'months' | 'years'
  financialAssumptions?: FinancialAssumptions
  stakeholders: Stakeholder[]
  processes: ProcessMap[]
  evidence: Evidence[]
  pains: Pain[]
  clusters: Cluster[]
  fiveWhys: FiveWhy[]
  rootCauses: RootCause[]
  solutions: Solution[]
  initiatives: Initiative[]
  waves: RoadmapWave[]
  workstreams: Workstream[]
}
