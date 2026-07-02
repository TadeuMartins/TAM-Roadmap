import { describe, expect, it } from 'vitest'
import { blankProject, refapAssetTurnaroundAssessment as downstreamExample } from '../data/downstreamExample'
import { firstIncompleteStep, validatePptReadiness, workflowStatus } from './workflow'

describe('MECE workflow gatekeeping', () => {
  it('blocks a blank project at stakeholders after setup is valid', () => {
    const project = blankProject()
    const statuses = workflowStatus(project)

    expect(firstIncompleteStep(project)).toBe('stakeholders')
    expect(statuses.find((status) => status.step.id === 'setup')?.complete).toBe(true)
    expect(statuses.find((status) => status.step.id === 'process')?.locked).toBe(true)
  })

  it('allows the downstream example to reach PPT readiness', () => {
    expect(validatePptReadiness(downstreamExample)).toHaveLength(0)
    expect(firstIncompleteStep(downstreamExample)).toBe('preview')
  })
})
