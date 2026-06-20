import type { Cluster, FiveWhy, Project, RootCause, Solution } from '../core/types'

interface MappingTablesProps {
  project: Project
  onProjectChange: (project: Project) => void
}

function splitCodes(value: string) {
  return value.split(/[;,\n]/).map((item) => item.trim()).filter(Boolean)
}

export function MappingTables({ project, onProjectChange }: MappingTablesProps) {
  const painById = new Map(project.pains.map((pain) => [pain.id, pain]))
  const painIdByCode = new Map(project.pains.map((pain) => [pain.code.toLowerCase(), pain.id]))
  const clusterIdByCode = new Map(project.clusters.map((cluster) => [cluster.code.toLowerCase(), cluster.id]))
  const rootById = new Map(project.rootCauses.map((root) => [root.id, root]))
  const rootIdByCode = new Map(project.rootCauses.map((root) => [root.code.toLowerCase(), root.id]))
  const initiativeById = new Map(project.initiatives.map((initiative) => [initiative.id, initiative]))

  const patchCluster = (id: string, patch: Partial<Cluster>) => {
    onProjectChange({ ...project, clusters: project.clusters.map((cluster) => (cluster.id === id ? { ...cluster, ...patch } : cluster)) })
  }

  const addCluster = () => {
    const id = `cluster-${project.clusters.length + 1}`
    onProjectChange({
      ...project,
      clusters: [...project.clusters, { id, code: `G${project.clusters.length + 1}`, theme: 'New pain cluster', painIds: [] }],
    })
  }

  const removeCluster = (id: string) => {
    onProjectChange({
      ...project,
      clusters: project.clusters.filter((cluster) => cluster.id !== id),
      rootCauses: project.rootCauses.map((root) => ({ ...root, clusterIds: root.clusterIds.filter((clusterId) => clusterId !== id) })),
      fiveWhys: project.fiveWhys.filter((why) => why.clusterId !== id),
    })
  }

  const patchRootCause = (id: string, patch: Partial<RootCause>) => {
    onProjectChange({ ...project, rootCauses: project.rootCauses.map((root) => (root.id === id ? { ...root, ...patch } : root)) })
  }

  const addRootCause = () => {
    const id = `root-${project.rootCauses.length + 1}`
    onProjectChange({
      ...project,
      rootCauses: [...project.rootCauses, { id, code: `R${project.rootCauses.length + 1}`, statement: 'Describe the root cause.', clusterIds: [] }],
    })
  }

  const removeRootCause = (id: string) => {
    onProjectChange({
      ...project,
      rootCauses: project.rootCauses.filter((root) => root.id !== id),
      fiveWhys: project.fiveWhys.filter((why) => why.rootCauseId !== id),
      solutions: project.solutions.map((solution) => ({ ...solution, rootCauseIds: solution.rootCauseIds.filter((rootId) => rootId !== id) })),
    })
  }

  const patchFiveWhy = (id: string, patch: Partial<FiveWhy>) => {
    onProjectChange({ ...project, fiveWhys: project.fiveWhys.map((why) => (why.id === id ? { ...why, ...patch } : why)) })
  }

  const addFiveWhy = () => {
    const cluster = project.clusters[0]
    const root = project.rootCauses[0]
    if (!cluster || !root) return
    onProjectChange({
      ...project,
      fiveWhys: [...project.fiveWhys, { id: `why-${project.fiveWhys.length + 1}`, clusterId: cluster.id, rootCauseId: root.id, whys: ['', '', '', '', ''] }],
    })
  }

  const patchSolution = (id: string, patch: Partial<Solution>) => {
    onProjectChange({ ...project, solutions: project.solutions.map((solution) => (solution.id === id ? { ...solution, ...patch } : solution)) })
  }

  const addSolution = () => {
    const id = `solution-${project.solutions.length + 1}`
    onProjectChange({
      ...project,
      solutions: [...project.solutions, { id, code: `S${project.solutions.length + 1}`, statement: 'Describe the concrete solution.', rootCauseIds: [], productHints: [], proofKpi: '' }],
    })
  }

  const removeSolution = (id: string) => {
    onProjectChange({
      ...project,
      solutions: project.solutions.filter((solution) => solution.id !== id),
      initiatives: project.initiatives.map((initiative) => ({ ...initiative, solutionIds: initiative.solutionIds.filter((solutionId) => solutionId !== id) })),
    })
  }

  return (
    <section className="mapping-tables editor-view">
      <div className="section-head compact">
        <div>
          <span className="eyebrow">Discovery synthesis editor</span>
          <h2>Pain {'->'} cluster {'->'} 5 Whys {'->'} root cause {'->'} solution</h2>
        </div>
      </div>

      <div className="editor-sections">
        <details className="editor-stack editor-section" open>
          <summary><span>Pain clusters</span><small>Group repeated pains into MECE themes.</small></summary>
          <div className="editor-title-row"><h3>Pain clusters</h3><button onClick={addCluster}>Add cluster</button></div>
          {project.clusters.map((cluster) => (
            <article className="editor-card" key={cluster.id}>
              <div className="inline-fields">
                <label>Code<input value={cluster.code} onChange={(event) => patchCluster(cluster.id, { code: event.target.value })} /></label>
                <label>Theme<input value={cluster.theme} onChange={(event) => patchCluster(cluster.id, { theme: event.target.value })} /></label>
              </div>
              <label>
                Pain codes in this cluster
                <input
                  value={cluster.painIds.map((painId) => painById.get(painId)?.code).filter(Boolean).join(', ')}
                  placeholder="D1, D2, C3"
                  onChange={(event) => patchCluster(cluster.id, { painIds: splitCodes(event.target.value).map((code) => painIdByCode.get(code.toLowerCase())).filter(Boolean) as string[] })}
                />
              </label>
              <button className="danger ghost" onClick={() => removeCluster(cluster.id)}>Remove cluster</button>
            </article>
          ))}
        </details>

        <details className="editor-stack editor-section" open>
          <summary><span>Root causes</span><small>Define the structural reasons behind each cluster.</small></summary>
          <div className="editor-title-row"><h3>Root causes</h3><button onClick={addRootCause}>Add root cause</button></div>
          {project.rootCauses.map((root) => (
            <article className="editor-card" key={root.id}>
              <div className="inline-fields">
                <label>Code<input value={root.code} onChange={(event) => patchRootCause(root.id, { code: event.target.value })} /></label>
                <label>Cluster codes<input value={root.clusterIds.map((clusterId) => project.clusters.find((cluster) => cluster.id === clusterId)?.code).filter(Boolean).join(', ')} onChange={(event) => patchRootCause(root.id, { clusterIds: splitCodes(event.target.value).map((code) => clusterIdByCode.get(code.toLowerCase())).filter(Boolean) as string[] })} /></label>
              </div>
              <label>Root cause statement<textarea value={root.statement} onChange={(event) => patchRootCause(root.id, { statement: event.target.value })} /></label>
              <button className="danger ghost" onClick={() => removeRootCause(root.id)}>Remove root cause</button>
            </article>
          ))}
        </details>

        <details className="editor-stack editor-section">
          <summary><span>5 Whys</span><small>Capture the logic from cluster to root cause.</small></summary>
          <div className="editor-title-row"><h3>5 Whys</h3><button onClick={addFiveWhy}>Add 5 Whys</button></div>
          {project.fiveWhys.map((why) => (
            <article className="editor-card" key={why.id}>
              <div className="inline-fields">
                <label>
                  Cluster
                  <select value={why.clusterId} onChange={(event) => patchFiveWhy(why.id, { clusterId: event.target.value })}>
                    {project.clusters.map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.code} - {cluster.theme}</option>)}
                  </select>
                </label>
                <label>
                  Root cause
                  <select value={why.rootCauseId} onChange={(event) => patchFiveWhy(why.id, { rootCauseId: event.target.value })}>
                    {project.rootCauses.map((root) => <option key={root.id} value={root.id}>{root.code} - {root.statement}</option>)}
                  </select>
                </label>
              </div>
              <div className="why-grid">
                {[0, 1, 2, 3, 4].map((index) => (
                  <label key={index}>Why {index + 1}<input value={why.whys[index] || ''} onChange={(event) => {
                    const whys = [...why.whys]
                    whys[index] = event.target.value
                    patchFiveWhy(why.id, { whys })
                  }} /></label>
                ))}
              </div>
            </article>
          ))}
        </details>

        <details className="editor-stack editor-section">
          <summary><span>Solutions</span><small>Map root causes to concrete actions and initiatives.</small></summary>
          <div className="editor-title-row"><h3>Solutions</h3><button onClick={addSolution}>Add solution</button></div>
          {project.solutions.map((solution) => (
            <article className="editor-card" key={solution.id}>
              <div className="inline-fields">
                <label>Code<input value={solution.code} onChange={(event) => patchSolution(solution.id, { code: event.target.value })} /></label>
                <label>Root cause codes<input value={solution.rootCauseIds.map((rootId) => rootById.get(rootId)?.code).filter(Boolean).join(', ')} onChange={(event) => patchSolution(solution.id, { rootCauseIds: splitCodes(event.target.value).map((code) => rootIdByCode.get(code.toLowerCase())).filter(Boolean) as string[] })} /></label>
              </div>
              <label>Concrete solution<textarea value={solution.statement} onChange={(event) => patchSolution(solution.id, { statement: event.target.value })} /></label>
              <label>Siemens / technology hints<input value={solution.productHints.join(', ')} onChange={(event) => patchSolution(solution.id, { productHints: splitCodes(event.target.value) })} /></label>
              <div className="inline-fields">
                <label>Proof KPI<input value={solution.proofKpi} onChange={(event) => patchSolution(solution.id, { proofKpi: event.target.value })} /></label>
                <label>
                  Roadmap initiative
                  <select value={solution.initiativeId || ''} onChange={(event) => patchSolution(solution.id, { initiativeId: event.target.value || undefined })}>
                    <option value="">Not mapped</option>
                    {project.initiatives.map((initiative) => <option key={initiative.id} value={initiative.id}>{initiative.code} - {initiative.name}</option>)}
                  </select>
                </label>
              </div>
              <small>{solution.rootCauseIds.map((rootId) => rootById.get(rootId)?.code).filter(Boolean).join(', ') || 'No root'} {'->'} {solution.initiativeId ? initiativeById.get(solution.initiativeId)?.code : 'No initiative'}</small>
              <button className="danger ghost" onClick={() => removeSolution(solution.id)}>Remove solution</button>
            </article>
          ))}
        </details>
      </div>
    </section>
  )
}
