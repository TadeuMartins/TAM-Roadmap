import type { BenefitModel, Initiative, Project } from './types'

export const emptyBenefitModel: BenefitModel = {
  downtimeHoursAvoided: 0,
  downtimeCostPerHour: 0,
  professionalHoursSaved: 0,
  professionalCostPerHour: 0,
  reworkAvoided: 0,
  energySavings: 0,
  inventorySavings: 0,
  complianceRiskAvoided: 0,
  marginUplift: 0,
  otherAnnualBenefit: 0,
  waccPercent: 12,
  benefitYears: 5,
  benefitStartMonth: 0,
}

export function normalizeBenefitModel(model?: Partial<BenefitModel>): BenefitModel {
  return { ...emptyBenefitModel, ...model }
}

export function calculateAnnualBenefit(model?: Partial<BenefitModel>) {
  const m = normalizeBenefitModel(model)
  return (
    m.downtimeHoursAvoided * m.downtimeCostPerHour +
    m.professionalHoursSaved * m.professionalCostPerHour +
    m.reworkAvoided +
    m.energySavings +
    m.inventorySavings +
    m.complianceRiskAvoided +
    m.marginUplift +
    m.otherAnnualBenefit
  )
}

export function discountedPaybackMonths(investment: number, annualBenefit: number, waccPercent: number, years = 5, benefitStartMonth = 0) {
  if (investment <= 0 || annualBenefit <= 0) return 0
  const monthlyRate = Math.pow(1 + Math.max(waccPercent, 0) / 100, 1 / 12) - 1
  const startMonth = Math.max(0, Math.round(benefitStartMonth))
  const maxMonths = Math.max(1, Math.round(years * 12) + startMonth)
  let cumulative = 0
  for (let month = 1; month <= maxMonths; month += 1) {
    const previous = cumulative
    if (month > startMonth) cumulative += annualBenefit / 12 / Math.pow(1 + monthlyRate, month)
    if (cumulative >= investment) {
      const monthlyGain = cumulative - previous
      return monthlyGain > 0 ? month - 1 + (investment - previous) / monthlyGain : month
    }
  }
  return Infinity
}

export interface TimelinePoint {
  month: number
  investment: number
  cumulativeBenefit: number
  discountedBenefit: number
  netDiscounted: number
}

export function projectCashflowTimeline(project: Project): TimelinePoint[] {
  const totals = project.initiatives.reduce((sum, initiative) => sum + initiative.investment, 0)
  const assumptions = project.financialAssumptions
  const waccPercent = assumptions?.waccPercent ?? (project.initiatives.length
    ? project.initiatives.reduce((sum, initiative) => sum + normalizeBenefitModel(initiative.benefitModel).waccPercent, 0) / project.initiatives.length
    : 0)
  const benefitYears = assumptions?.benefitYears ?? 5
  const maxStartMonth = project.initiatives.reduce((max, initiative) => Math.max(max, normalizeBenefitModel(initiative.benefitModel).benefitStartMonth), 0)
  const months = Math.max(12, Math.round(benefitYears * 12 + maxStartMonth))
  const monthlyRate = Math.pow(1 + Math.max(waccPercent, 0) / 100, 1 / 12) - 1
  const points: TimelinePoint[] = []
  let cumulativeBenefit = 0
  let discountedBenefit = 0

  for (let month = 0; month <= months; month += 1) {
    if (month > 0) {
      project.initiatives.forEach((initiative) => {
        const model = normalizeBenefitModel(initiative.benefitModel)
        if (month > Math.max(0, Math.round(model.benefitStartMonth))) {
          const monthlyBenefit = initiativeAnnualBenefit(initiative) / 12
          cumulativeBenefit += monthlyBenefit
          discountedBenefit += monthlyBenefit / Math.pow(1 + monthlyRate, month)
        }
      })
    }

    points.push({
      month,
      investment: totals,
      cumulativeBenefit,
      discountedBenefit,
      netDiscounted: discountedBenefit - totals,
    })
  }

  return points
}

function paybackFromTimeline(points: TimelinePoint[], discounted: boolean) {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const previousValue = discounted ? previous.discountedBenefit : previous.cumulativeBenefit
    const currentValue = discounted ? current.discountedBenefit : current.cumulativeBenefit
    if (current.investment <= 0) return 0
    if (currentValue >= current.investment) {
      const monthlyGain = currentValue - previousValue
      if (monthlyGain <= 0) return current.month
      return previous.month + (current.investment - previousValue) / monthlyGain
    }
  }
  return points.some((point) => point.investment > 0) ? Infinity : 0
}

export function initiativeAnnualBenefit(initiative: Initiative) {
  const calculated = calculateAnnualBenefit(initiative.benefitModel)
  return calculated > 0 ? calculated : initiative.annualBenefit
}

export function initiativeFinancials(initiative: Initiative) {
  const model = normalizeBenefitModel(initiative.benefitModel)
  const annualBenefit = initiativeAnnualBenefit(initiative)
  const paybackMonths = annualBenefit > 0 ? model.benefitStartMonth + (initiative.investment / annualBenefit) * 12 : 0
  const discountedPayback = discountedPaybackMonths(initiative.investment, annualBenefit, model.waccPercent, model.benefitYears, model.benefitStartMonth)
  const roiYear1 = initiative.investment > 0 ? ((annualBenefit - initiative.investment) / initiative.investment) * 100 : 0
  return { annualBenefit, paybackMonths, discountedPayback, roiYear1, model }
}

export function projectTotals(project: Project) {
  const investment = project.initiatives.reduce((sum, initiative) => sum + initiative.investment, 0)
  const annualBenefit = project.initiatives.reduce((sum, initiative) => sum + initiativeAnnualBenefit(initiative), 0)
  const avgWacc = project.financialAssumptions?.waccPercent ?? (project.initiatives.length
    ? project.initiatives.reduce((sum, initiative) => sum + normalizeBenefitModel(initiative.benefitModel).waccPercent, 0) / project.initiatives.length
    : 0)
  const benefitYears = project.financialAssumptions?.benefitYears ?? 5
  const timeline = projectCashflowTimeline(project)
  const paybackMonths = paybackFromTimeline(timeline, false)
  const discountedPayback = paybackFromTimeline(timeline, true)
  const roiYear1 = investment > 0 ? ((annualBenefit - investment) / investment) * 100 : 0
  return { investment, annualBenefit, paybackMonths, discountedPayback, roiYear1, avgWacc, benefitYears }
}

export function formatDiscountedPayback(value: number) {
  if (!Number.isFinite(value)) return '> horizon'
  return `${value.toFixed(1)} mo`
}
