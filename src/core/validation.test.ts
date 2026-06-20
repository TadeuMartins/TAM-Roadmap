import { describe, expect, it } from 'vitest'
import { downstreamExample } from '../data/downstreamExample'
import { totals, traceabilityCoverage, validateProject } from './validation'

describe('TAM traceability validation', () => {
  it('accepts the downstream starter example as traceable', () => {
    const issues = validateProject(downstreamExample)
    const errors = issues.filter((issue) => issue.severity === 'error')

    expect(errors).toHaveLength(0)
    expect(traceabilityCoverage(downstreamExample)).toEqual({
      painsAnchored: 1,
      rootsSolved: 1,
      solutionsRoadmapped: 1,
    })
  })

  it('flags orphan solutions and initiatives without backing solutions', () => {
    const broken = {
      ...downstreamExample,
      solutions: [{ ...downstreamExample.solutions[0], id: 'orphan-solution', code: 'S999', rootCauseIds: [], initiativeId: undefined }],
      initiatives: [{ ...downstreamExample.initiatives[0], solutionIds: [] }],
    }

    const messages = validateProject(broken).map((issue) => issue.message)

    expect(messages).toContain('S999 is orphaned: no root cause linkage.')
    expect(messages).toContain('I1 is not backed by any solution.')
  })

  it('calculates roadmap business-case totals', () => {
    const result = totals(downstreamExample)

    expect(result.investment).toBe(23800000)
    expect(result.annualBenefit).toBe(26298000)
    expect(result.paybackMonths).toBeCloseTo(21.42, 2)
    expect(result.discountedPayback).toBeCloseTo(23.30, 2)
    expect(result.roiYear1).toBeCloseTo(10.5, 1)
  })
})
