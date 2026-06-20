import type { Project } from '../core/types'
import { traceabilityCoverage, validateProject } from '../core/validation'

interface TraceabilityPanelProps {
  project: Project
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`
}

export function TraceabilityPanel({ project }: TraceabilityPanelProps) {
  const issues = validateProject(project)
  const coverage = traceabilityCoverage(project)
  const errors = issues.filter((issue) => issue.severity === 'error').length
  const warnings = issues.filter((issue) => issue.severity === 'warning').length

  return (
    <section className="trace-panel">
      <div className="metric-card">
        <span>Pains anchored</span>
        <strong>{pct(coverage.painsAnchored)}</strong>
        <small>pain {'->'} process step</small>
      </div>
      <div className="metric-card">
        <span>Roots solved</span>
        <strong>{pct(coverage.rootsSolved)}</strong>
        <small>root cause {'->'} solution</small>
      </div>
      <div className="metric-card">
        <span>Roadmapped</span>
        <strong>{pct(coverage.solutionsRoadmapped)}</strong>
        <small>solution {'->'} initiative</small>
      </div>
      <div className="metric-card status">
        <span>Validation</span>
        <strong>{errors}E / {warnings}W</strong>
        <small>{issues.length ? 'open issues' : 'clean traceability'}</small>
      </div>
      <div className="issue-list">
        {issues.slice(0, 5).map((issue) => (
          <div key={issue.id} className={`issue ${issue.severity}`}>
            <b>{issue.area}</b>
            <span>{issue.message}</span>
          </div>
        ))}
        {issues.length > 5 && <p className="muted">+{issues.length - 5} more issues</p>}
      </div>
    </section>
  )
}
