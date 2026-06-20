import type { Initiative, Project, RoadmapWave } from '../core/types'
import { totals } from '../core/validation'

interface RoadmapViewProps {
  project: Project
  onProjectChange: (project: Project) => void
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function splitList(value: string) {
  return value.split(/[;,\n]/).map((item) => item.trim()).filter(Boolean)
}

function payback(investment: number, annualBenefit: number) {
  return annualBenefit > 0 ? (investment / annualBenefit) * 12 : 0
}

export function RoadmapView({ project, onProjectChange }: RoadmapViewProps) {
  const financials = totals(project)
  const solutionById = new Map(project.solutions.map((solution) => [solution.id, solution]))
  const solutionIdByCode = new Map(project.solutions.map((solution) => [solution.code.toLowerCase(), solution.id]))

  const patchWave = (id: string, patch: Partial<RoadmapWave>) => {
    onProjectChange({ ...project, waves: project.waves.map((wave) => (wave.id === id ? { ...wave, ...patch } : wave)) })
  }

  const addWave = () => {
    onProjectChange({
      ...project,
      waves: [...project.waves, { id: `wave-${project.waves.length + 1}`, label: `Wave ${project.waves.length + 1}`, title: 'New wave', horizon: 'TBD' }],
    })
  }

  const patchInitiative = (id: string, patch: Partial<Initiative>) => {
    onProjectChange({ ...project, initiatives: project.initiatives.map((initiative) => (initiative.id === id ? { ...initiative, ...patch } : initiative)) })
  }

  const addInitiative = (waveId = project.waves[0]?.id || '') => {
    const id = `initiative-${project.initiatives.length + 1}`
    onProjectChange({
      ...project,
      initiatives: [
        ...project.initiatives,
        {
          id,
          code: `I${project.initiatives.length + 1}`,
          name: 'New roadmap initiative',
          objective: 'Describe the business outcome this initiative will deliver.',
          waveId,
          workstreamIds: [],
          solutionIds: [],
          kpis: [],
          investment: 0,
          annualBenefit: 0,
        },
      ],
    })
  }

  const removeInitiative = (id: string) => {
    onProjectChange({
      ...project,
      initiatives: project.initiatives.filter((initiative) => initiative.id !== id),
      solutions: project.solutions.map((solution) => (solution.initiativeId === id ? { ...solution, initiativeId: undefined } : solution)),
    })
  }

  return (
    <section className="roadmap-view editor-view">
      <div className="section-head compact">
        <div>
          <span className="eyebrow">Roadmap and business-case editor</span>
          <h2>Waves, initiatives, financials and proof KPIs</h2>
        </div>
        <div className="finance-strip">
          <b>{brl.format(financials.investment)}</b><span>investment</span>
          <b>{brl.format(financials.annualBenefit)}</b><span>annual benefit</span>
          <b>{financials.paybackMonths.toFixed(1)} mo</b><span>payback</span>
          <b>{financials.roiYear1.toFixed(0)}%</b><span>year-1 ROI</span>
        </div>
      </div>

      <details className="lane-config roadmap-config">
        <summary><span>Configure roadmap waves</span><small>Rename phases and horizons to fit any TAM engagement.</small></summary>
        <div className="lane-config-grid">
          {project.waves.map((wave) => (
            <article className="lane-config-card" key={wave.id}>
              <label>Label<input value={wave.label} onChange={(event) => patchWave(wave.id, { label: event.target.value })} /></label>
              <label>Title<input value={wave.title} onChange={(event) => patchWave(wave.id, { title: event.target.value })} /></label>
              <label>Horizon<input value={wave.horizon} onChange={(event) => patchWave(wave.id, { horizon: event.target.value })} /></label>
            </article>
          ))}
          <button className="add-lane-card" onClick={addWave}>Add wave</button>
        </div>
      </details>

      <div className="roadmap-grid editable-roadmap">
        {project.waves.map((wave) => (
          <div className="wave-column" key={wave.id}>
            <div className="wave-head">
              <span>{wave.label}</span>
              <strong>{wave.title}</strong>
              <small>{wave.horizon}</small>
            </div>
            {project.initiatives
              .filter((initiative) => initiative.waveId === wave.id)
              .map((initiative) => {
                const initiativePayback = payback(initiative.investment, initiative.annualBenefit)
                return (
                  <article className="initiative-card editable" key={initiative.id}>
                    <div className="inline-fields">
                      <label>Code<input value={initiative.code} onChange={(event) => patchInitiative(initiative.id, { code: event.target.value })} /></label>
                      <label>Name<input value={initiative.name} onChange={(event) => patchInitiative(initiative.id, { name: event.target.value })} /></label>
                    </div>
                    <label>Objective<textarea value={initiative.objective} onChange={(event) => patchInitiative(initiative.id, { objective: event.target.value })} /></label>
                    <div className="inline-fields three">
                      <label>Investment<input type="number" value={initiative.investment} onChange={(event) => patchInitiative(initiative.id, { investment: Number(event.target.value) })} /></label>
                      <label>Annual benefit<input type="number" value={initiative.annualBenefit} onChange={(event) => patchInitiative(initiative.id, { annualBenefit: Number(event.target.value) })} /></label>
                      <label>Payback<input readOnly value={`${initiativePayback.toFixed(1)} months`} /></label>
                    </div>
                    <label>Proof KPIs<input value={initiative.kpis.join(', ')} onChange={(event) => patchInitiative(initiative.id, { kpis: splitList(event.target.value) })} /></label>
                    <label>Solution codes backing this initiative<input value={initiative.solutionIds.map((solutionId) => solutionById.get(solutionId)?.code).filter(Boolean).join(', ')} onChange={(event) => patchInitiative(initiative.id, { solutionIds: splitList(event.target.value).map((code) => solutionIdByCode.get(code.toLowerCase())).filter(Boolean) as string[] })} /></label>
                    <label>
                      Wave
                      <select value={initiative.waveId} onChange={(event) => patchInitiative(initiative.id, { waveId: event.target.value })}>
                        {project.waves.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label} - {candidate.title}</option>)}
                      </select>
                    </label>
                    <small>{initiative.solutionIds.length} solution links | {brl.format(initiative.investment)} investment | {brl.format(initiative.annualBenefit)} benefit</small>
                    <button className="danger ghost" onClick={() => removeInitiative(initiative.id)}>Remove initiative</button>
                  </article>
                )
              })}
            <button className="add-initiative" onClick={() => addInitiative(wave.id)}>Add initiative to {wave.label}</button>
          </div>
        ))}
      </div>
    </section>
  )
}
