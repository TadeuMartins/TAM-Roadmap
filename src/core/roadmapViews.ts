import { digitalThreadMeta, digitalThreads } from './digitalThreads'
import { initiativeAnnualBenefit } from './financial'
import type { DigitalThread, Initiative, Project } from './types'

export function initiativeThread(project: Project, initiative: Initiative): DigitalThread | undefined {
  const solution = project.solutions.find((candidate) => initiative.solutionIds.includes(candidate.id) && candidate.digitalThread)
  return solution?.digitalThread
}

export function initiativeBubble(project: Project, initiative: Initiative) {
  const annualBenefit = initiativeAnnualBenefit(initiative)
  const benefitValues = project.initiatives.map((item) => initiativeAnnualBenefit(item))
  const maxBenefit = Math.max(...benefitValues, 1)
  const effort = Math.max(10, Math.min(90, 18 + (initiative.investment / Math.max(...project.initiatives.map((item) => item.investment), 1)) * 70))
  const value = Math.max(10, Math.min(90, 18 + (annualBenefit / maxBenefit) * 70))
  const size = Math.max(34, Math.min(78, 34 + (annualBenefit / maxBenefit) * 44))
  return { effort, value, size, annualBenefit, thread: initiativeThread(project, initiative) }
}

export function initiativesByThread(project: Project) {
  return digitalThreads.map((thread) => {
    const initiatives = project.initiatives.filter((initiative) => initiativeThread(project, initiative) === thread.id)
    return {
      thread,
      initiatives,
      investment: initiatives.reduce((sum, initiative) => sum + initiative.investment, 0),
      annualBenefit: initiatives.reduce((sum, initiative) => sum + initiativeAnnualBenefit(initiative), 0),
    }
  })
}

export function threadShort(project: Project, initiative: Initiative) {
  return digitalThreadMeta(initiativeThread(project, initiative))?.short || 'TBD'
}
