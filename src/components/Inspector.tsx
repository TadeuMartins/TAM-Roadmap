import type { Pain, ProcessMap, ProcessStep, Project } from '../core/types'
import { scorePain } from '../core/validation'

interface InspectorProps {
  project: Project
  process: ProcessMap
  selectedStepId?: string
  onProjectChange: (project: Project) => void
  onSelectStep: (stepId?: string) => void
}

export function Inspector({ project, process, selectedStepId, onProjectChange, onSelectStep }: InspectorProps) {
  const selectedStep = process.steps.find((step) => step.id === selectedStepId) || process.steps[0]
  const stepPains = project.pains.filter((pain) => selectedStep?.painIds.includes(pain.id))

  const patchStep = (patch: Partial<ProcessStep>) => {
    if (!selectedStep) return
    const updatedProcesses = project.processes.map((candidate) =>
      candidate.id === process.id
        ? { ...candidate, steps: candidate.steps.map((step) => (step.id === selectedStep.id ? { ...step, ...patch } : step)) }
        : candidate,
    )
    onProjectChange({ ...project, processes: updatedProcesses })
  }

  const addPainToStep = () => {
    if (!selectedStep) return
    const id = `pain-${project.pains.length + 1}`
    const codePrefix = process.name.toLowerCase().includes('change') ? 'C' : 'D'
    const code = `${codePrefix}${project.pains.filter((pain) => pain.code.startsWith(codePrefix)).length + 1}`
    const pain: Pain = {
      id,
      code,
      statement: 'Describe the business pain in concrete terms.',
      processId: process.id,
      stepId: selectedStep.id,
      stakeholderIds: [],
      evidenceIds: [],
      severity: 'medium',
      frequency: 3,
      impact: 3,
    }
    const updatedProcesses = project.processes.map((candidate) =>
      candidate.id === process.id
        ? { ...candidate, steps: candidate.steps.map((step) => (step.id === selectedStep.id ? { ...step, painIds: [...step.painIds, id] } : step)) }
        : candidate,
    )
    onProjectChange({ ...project, processes: updatedProcesses, pains: [...project.pains, pain] })
  }

  const deleteStep = () => {
    if (!selectedStep || process.steps.length <= 1) return
    const remainingSteps = process.steps.filter((step) => step.id !== selectedStep.id)
    const updatedProcesses = project.processes.map((candidate) =>
      candidate.id === process.id
        ? {
          ...candidate,
          steps: remainingSteps,
          edges: candidate.edges.filter((edge) => edge.source !== selectedStep.id && edge.target !== selectedStep.id),
        }
        : candidate,
    )
    onProjectChange({
      ...project,
      processes: updatedProcesses,
      pains: project.pains.map((pain) => pain.stepId === selectedStep.id ? { ...pain, stepId: undefined, processId: undefined } : pain),
    })
    onSelectStep(remainingSteps[0]?.id)
  }

  return (
    <aside className="inspector">
      <span className="eyebrow">Step inspector</span>
      {selectedStep ? (
        <>
          <label>
            Step label
            <input value={selectedStep.label} onChange={(event) => patchStep({ label: event.target.value })} />
          </label>
          <label>
            Step type
            <select value={selectedStep.kind} onChange={(event) => patchStep({ kind: event.target.value as ProcessStep['kind'] })}>
              <option value="activity">Activity</option>
              <option value="decision">Decision</option>
              <option value="document">Document</option>
              <option value="system">System</option>
              <option value="handoff">Hand-off</option>
            </select>
          </label>
          <label>
            System / artifact
            <input value={selectedStep.system || ''} onChange={(event) => patchStep({ system: event.target.value })} placeholder="SAP, Excel, COMOS, paper" />
          </label>
          <label>
            Notes
            <textarea value={selectedStep.notes || ''} onChange={(event) => patchStep({ notes: event.target.value })} placeholder="What did the TAM observe?" />
          </label>
          <button className="danger" disabled={process.steps.length <= 1} onClick={deleteStep}>Delete process card</button>
          <div className="inspector-row">
            <strong>Pains on this step</strong>
            <button onClick={addPainToStep}>Add pain</button>
          </div>
          <div className="mini-list">
            {stepPains.map((pain) => (
              <div key={pain.id} className="mini-card">
                <b>{pain.code}</b>
                <span>{pain.statement}</span>
                <em>score {scorePain(pain)}</em>
              </div>
            ))}
            {stepPains.length === 0 && <p className="muted">No pain attached yet. Add one to keep traceability at the process step level.</p>}
          </div>
        </>
      ) : (
        <p className="muted">Select a process step.</p>
      )}
    </aside>
  )
}
