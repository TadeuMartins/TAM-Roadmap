import { useRef, useState, type ReactNode } from 'react'
import { Check, Download, FileJson, FolderOpen, Lock, Plus, Presentation, RotateCcw, Trash2 } from 'lucide-react'
import './App.css'
import { Inspector } from './components/Inspector'
import { SwimlaneEditor } from './components/SwimlaneEditor'
import { digitalThreads } from './core/digitalThreads'
import { emptyBenefitModel, formatDiscountedPayback, initiativeFinancials, normalizeBenefitModel, projectCashflowTimeline } from './core/financial'
import { initiativeBubble, initiativesByThread, initiativeThread, threadShort } from './core/roadmapViews'
import { siemensPortfolioOptions } from './core/siemensPortfolio'
import type { BenefitModel, Cluster, DigitalThread, FinancialAssumptions, Initiative, Pain, ProcessMap, Project, Solution, Stakeholder } from './core/types'
import { totals } from './core/validation'
import {
  firstIncompleteStep,
  missingForStep,
  validatePptReadiness,
  workflowStatus,
  workflowSteps,
  type WorkflowStepId,
} from './core/workflow'
import { blankProject, refapAssetTurnaroundAssessment } from './data/downstreamExample'

function downloadJson(project: Project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${project.client.replace(/\W+/g, '_') || 'tam_project'}_discovery.json`
  link.click()
  URL.revokeObjectURL(url)
}

function nextId(prefix: string, count: number) {
  return `${prefix}-${count + 1}`
}

function splitList(value: string) {
  return value.split(/[;,\n]/).map((item) => item.trim()).filter(Boolean)
}

function splitLines(value: string) {
  return value.split(/\n/).map((item) => item.trim()).filter(Boolean)
}

function formatMoney(value: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

function formatInputNumber(value: number) {
  return Number.isFinite(value) ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value) : '0'
}

function parseInputNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 0
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(trimmed)
      ? trimmed.replace(/\./g, '')
      : trimmed
  const parsed = Number(normalized.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function financialDefaults(project: Project): FinancialAssumptions {
  const model = normalizeBenefitModel(project.initiatives[0]?.benefitModel)
  return project.financialAssumptions || { waccPercent: model.waccPercent, benefitYears: model.benefitYears }
}

function benefitModelWithDefaults(project: Project) {
  const assumptions = financialDefaults(project)
  return { ...emptyBenefitModel, ...assumptions }
}

function formatMonths(value: number, mode: Project['timelineView'] = 'months') {
  if (!Number.isFinite(value)) return '> horizon'
  if (mode === 'years') return `${(value / 12).toFixed(1)} years`
  return value >= 12 ? `${(value / 12).toFixed(1)} years (${value.toFixed(0)} mo)` : `${value.toFixed(1)} mo`
}

function initiativeMatchesFilters(project: Project, initiative: Initiative, waveId: string, threadId: string) {
  const matchesWave = !waveId || initiative.waveId === waveId
  const matchesThread = !threadId || initiativeThread(project, initiative) === threadId
  return matchesWave && matchesThread
}

function BrandMark() {
  return <img className="brand-mark" src={`${import.meta.env.BASE_URL}siemens-logo.png`} alt="Siemens" />
}

interface StepFrameProps {
  stepId: WorkflowStepId
  project: Project
  onContinue: () => void
  children: ReactNode
  primaryLabel?: string
}

function StepFrame({ stepId, project, onContinue, children, primaryLabel = 'Continue' }: StepFrameProps) {
  const step = workflowSteps.find((item) => item.id === stepId)!
  const missing = missingForStep(project, stepId)
  return (
    <section className="step-page">
      <header className="step-hero">
        <div>
          <span className="eyebrow">{step.label}</span>
          <h2>{step.goal}</h2>
        </div>
        <div className={missing.length ? 'gate-card blocked' : 'gate-card ready'}>
          <strong>{missing.length ? 'Required to continue' : 'Ready for next step'}</strong>
          <ul>
            {(missing.length ? missing.slice(0, 4) : ['All prerequisites completed.']).map((item) => <li key={item}>{item}</li>)}
          </ul>
          {missing.length > 4 && <small>+{missing.length - 4} more checks</small>}
        </div>
      </header>
      {children}
      <footer className="step-actions">
        <button className="primary" onClick={onContinue} disabled={missing.length > 0}>{primaryLabel}</button>
      </footer>
    </section>
  )
}

interface ProjectHubProps {
  onNew: () => void
  onDemo: () => void
  onImport: (file: File) => void
}

function ProjectHub({ onNew, onDemo, onImport }: ProjectHubProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <main className="project-hub">
      <section className="hub-hero">
        <div className="hero-brand-lockup">
          <BrandMark />
          <span>Digital Transformation Roadmap</span>
        </div>
        <span className="eyebrow">Siemens executive roadmap accelerator</span>
        <h1>Build a board-ready transformation roadmap from operational evidence.</h1>
        <p>Connect process pains, root causes, Siemens Digital Threads, initiatives and financial impact into one executive story ready for PowerPoint.</p>
        <div className="hub-actions">
          <button className="primary large" onClick={onNew}><Plus size={18} /> New Roadmap</button>
          <button className="large" onClick={onDemo}><RotateCcw size={18} /> Load Downstream Example</button>
          <button className="large" onClick={() => inputRef.current?.click()}><FolderOpen size={18} /> Import JSON</button>
        </div>
        <div className="hero-proof-strip">
          <span>Digital Threads</span>
          <span>Value case</span>
          <span>Wave roadmap</span>
          <span>PPT export</span>
        </div>
        <input ref={inputRef} type="file" accept="application/json" hidden onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onImport(file)
        }} />
      </section>
      <section className="hub-preview-card">
        <span className="eyebrow">Transformation narrative</span>
        <h2>From discovery evidence to executive decisions</h2>
        <div className="transformation-flow">
          <article>
            <b>01</b>
            <strong>Operational evidence</strong>
            <span>Process observations, pains and cross-process clusters.</span>
          </article>
          <article>
            <b>02</b>
            <strong>Solution Oriented Analysis</strong>
            <span>Root causes translated into solution themes and Digital Threads.</span>
          </article>
          <article>
            <b>03</b>
            <strong>Transformational Roadmap</strong>
            <span>Waves, value case, payback timeline and PPT story.</span>
          </article>
        </div>
        <div className="executive-preview">
          <small>Executive outputs</small>
          <p>Roadmap by Wave, Digital Thread view, filtered financials, payback timeline and Siemens-style presentation export.</p>
        </div>
      </section>
    </main>
  )
}

interface WorkspaceProps {
  project: Project
  setProject: (project: Project) => void
  onBack: () => void
}

function Workspace({ project, setProject, onBack }: WorkspaceProps) {
  const [stepId, setStepId] = useState<WorkflowStepId>('setup')
  const [blockedNotice, setBlockedNotice] = useState<string[]>([])
  const [exportStatus, setExportStatus] = useState<{ type: 'ready' | 'error' | 'success'; message: string } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [activeProcessId, setActiveProcessId] = useState(project.processes[0]?.id || '')
  const [selectedStepId, setSelectedStepId] = useState<string | undefined>(project.processes[0]?.steps[0]?.id)
  const statuses = workflowStatus(project)
  const activeProcess = project.processes.find((process) => process.id === activeProcessId) || project.processes[0]
  const previewMissing = validatePptReadiness(project)

  const updateProject = (next: Project) => {
    setProject(next)
    if (!next.processes.some((process) => process.id === activeProcessId)) {
      setActiveProcessId(next.processes[0]?.id || '')
      setSelectedStepId(next.processes[0]?.steps[0]?.id)
    }
  }

  const goNext = () => {
    const index = workflowSteps.findIndex((step) => step.id === stepId)
    const next = workflowSteps[index + 1]
    if (next) {
      setBlockedNotice([])
      setStepId(next.id)
    }
  }

  const goPreview = () => setStepId(firstIncompleteStep(project) === 'preview' ? 'preview' : firstIncompleteStep(project))

  const exportPptx = async () => {
    if (previewMissing.length > 0) {
      setExportStatus({ type: 'error', message: `Complete the readiness checks before exporting: ${previewMissing[0]}` })
      return
    }

    try {
      setIsExporting(true)
      setExportStatus({ type: 'ready', message: 'Generating Siemens PowerPoint...' })
      const { exportProjectPptx } = await import('./exporters/pptxExporter')
      await exportProjectPptx(project)
      setExportStatus({ type: 'success', message: 'PowerPoint generated. Check your browser downloads.' })
    } catch (error) {
      setExportStatus({ type: 'error', message: error instanceof Error ? error.message : 'PowerPoint export failed.' })
    } finally {
      setIsExporting(false)
    }
  }

  const addProcess = () => {
    const id = nextId('process', project.processes.length)
    const process: ProcessMap = {
      id,
      name: `Process ${project.processes.length + 1}`,
      mode: 'as-is',
      lanes: [
        { id: `${id}-lane-1`, label: 'Role / area 1', ownerType: 'role' },
        { id: `${id}-lane-2`, label: 'Role / area 2', ownerType: 'role' },
        { id: `${id}-lane-3`, label: 'Systems / data', ownerType: 'system' },
      ],
      steps: [
        { id: `${id}-step-1`, label: 'Start activity', laneId: `${id}-lane-1`, kind: 'activity', x: 80, y: 40, painIds: [] },
        { id: `${id}-step-2`, label: 'Decision / hand-off', laneId: `${id}-lane-2`, kind: 'decision', x: 340, y: 170, painIds: [] },
        { id: `${id}-step-3`, label: 'Close / record', laneId: `${id}-lane-3`, kind: 'activity', x: 620, y: 300, painIds: [] },
      ],
      edges: [{ id: `${id}-edge-1`, source: `${id}-step-1`, target: `${id}-step-2`, label: 'next' }, { id: `${id}-edge-2`, source: `${id}-step-2`, target: `${id}-step-3`, label: 'next' }],
    }
    updateProject({ ...project, processes: [...project.processes, process] })
    setActiveProcessId(id)
    setSelectedStepId(process.steps[0]?.id)
  }

  const duplicateProcess = () => {
    if (!activeProcess) return
    const id = nextId('process', project.processes.length)
    const cloneId = (oldId: string) => `${id}-${oldId}`
    const process: ProcessMap = {
      ...activeProcess,
      id,
      name: `${activeProcess.name} copy`,
      lanes: activeProcess.lanes.map((lane) => ({ ...lane, id: cloneId(lane.id) })),
      steps: activeProcess.steps.map((step) => ({ ...step, id: cloneId(step.id), laneId: cloneId(step.laneId), painIds: [] })),
      edges: activeProcess.edges.map((edge) => ({ ...edge, id: cloneId(edge.id), source: cloneId(edge.source), target: cloneId(edge.target) })),
    }
    updateProject({ ...project, processes: [...project.processes, process] })
    setActiveProcessId(id)
    setSelectedStepId(process.steps[0]?.id)
  }

  const renameProcess = (name: string) => {
    if (!activeProcess) return
    updateProject({ ...project, processes: project.processes.map((process) => process.id === activeProcess.id ? { ...process, name } : process) })
  }

  const deleteProcess = () => {
    if (!activeProcess || project.processes.length <= 1) return
    const remaining = project.processes.filter((process) => process.id !== activeProcess.id)
    const removedStepIds = new Set(activeProcess.steps.map((step) => step.id))
    updateProject({
      ...project,
      processes: remaining,
      pains: project.pains.map((pain) => removedStepIds.has(pain.stepId || '') ? { ...pain, stepId: undefined, processId: undefined } : pain),
    })
    setActiveProcessId(remaining[0]?.id || '')
    setSelectedStepId(remaining[0]?.steps[0]?.id)
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-topbar">
        <div>
          <button className="link-button" onClick={onBack}>Back to projects</button>
          <h1>{project.name || project.client || 'Untitled roadmap'}</h1>
          <p>{project.industry} | {project.horizon || 'No horizon'} | {project.currency || 'No currency'}</p>
        </div>
        <div className="topbar-actions">
          <BrandMark />
          <button onClick={() => downloadJson(project)}><Download size={16} /> Save JSON</button>
          <button onClick={goPreview}><Presentation size={16} /> Preview PPT</button>
          <button className="primary" disabled={isExporting} onClick={() => void exportPptx()}><FileJson size={16} /> {isExporting ? 'Exporting...' : 'Export PPTX'}</button>
        </div>
      </header>
      {exportStatus && <div className={`export-status ${exportStatus.type}`}><strong>{exportStatus.type === 'error' ? 'Export blocked' : exportStatus.type === 'success' ? 'Export started' : 'Export'}</strong><span>{exportStatus.message}</span></div>}

      <nav className="wizard-stepper">
        {statuses.map((status, index) => (
          <button
            key={status.step.id}
            className={[stepId === status.step.id ? 'active' : '', status.complete ? 'complete' : '', status.locked ? 'locked' : ''].join(' ')}
            onClick={() => {
              if (status.locked) {
                setBlockedNotice(statuses.find((candidate) => !candidate.complete)?.missing || ['Complete previous steps first.'])
                return
              }
              setBlockedNotice([])
              setStepId(status.step.id)
            }}
          >
            <span>{status.locked ? <Lock size={14} /> : status.complete ? <Check size={14} /> : index + 1}</span>
            <b>{status.step.short}</b>
          </button>
        ))}
      </nav>

      {blockedNotice.length > 0 && <div className="locked-notice"><strong>Step locked</strong><span>{blockedNotice[0]}</span></div>}


      {stepId === 'setup' && <SetupStep project={project} setProject={updateProject} onContinue={goNext} />}
      {stepId === 'stakeholders' && <StakeholdersStep project={project} setProject={updateProject} onContinue={goNext} />}
      {stepId === 'process' && activeProcess && (
        <StepFrame stepId="process" project={project} onContinue={goNext}>
          <div className="process-selector">
            <label>Active process<select value={activeProcess.id} onChange={(event) => {
              const process = project.processes.find((candidate) => candidate.id === event.target.value)
              setActiveProcessId(event.target.value)
              setSelectedStepId(process?.steps[0]?.id)
            }}>{project.processes.map((process) => <option key={process.id} value={process.id}>{process.name}</option>)}</select></label>
            <label>Process name<input value={activeProcess.name} onChange={(event) => renameProcess(event.target.value)} /></label>
            <div className="process-actions"><button onClick={addProcess}>Add Process</button><button onClick={duplicateProcess}>Duplicate</button><button className="danger" disabled={project.processes.length <= 1} onClick={deleteProcess}>Delete</button></div>
          </div>
          <div className="process-workspace">
            <SwimlaneEditor
              process={activeProcess}
              pains={project.pains}
              stakeholders={project.stakeholders}
              onProcessChange={(process) => updateProject({ ...project, processes: project.processes.map((candidate) => candidate.id === process.id ? process : candidate) })}
              selectedStepId={selectedStepId}
              onSelectStep={setSelectedStepId}
            />
            <Inspector project={project} process={activeProcess} selectedStepId={selectedStepId} onProjectChange={updateProject} onSelectStep={setSelectedStepId} />
          </div>
        </StepFrame>
      )}
      {stepId === 'pains' && <PainsStep project={project} setProject={updateProject} onContinue={goNext} />}
      {stepId === 'rootCause' && <RootCauseStep project={project} setProject={updateProject} onContinue={goNext} />}
      {stepId === 'solutions' && <SolutionsStep project={project} setProject={updateProject} onContinue={goNext} />}
      {stepId === 'roadmap' && <RoadmapStep project={project} setProject={updateProject} onContinue={goNext} />}
      {stepId === 'financials' && <FinancialsStep project={project} setProject={updateProject} onContinue={goNext} />}
      {stepId === 'preview' && <PreviewStep project={project} setProject={updateProject} />}
    </main>
  )
}

function SetupStep({ project, setProject, onContinue }: { project: Project; setProject: (project: Project) => void; onContinue: () => void }) {
  return (
    <StepFrame stepId="setup" project={project} onContinue={onContinue} primaryLabel="Continue to Stakeholders">
      <div className="clean-form setup-grid">
        <label>Client name<input value={project.client} onChange={(event) => setProject({ ...project, client: event.target.value, name: event.target.value ? `${event.target.value} Roadmap` : project.name })} /></label>
        <label>Industry<input value={project.industry} onChange={(event) => setProject({ ...project, industry: event.target.value })} /></label>
        <label>Currency<select value={project.currency || ''} onChange={(event) => setProject({ ...project, currency: event.target.value })}><option value="">Select</option><option value="BRL">BRL</option><option value="USD">USD</option><option value="EUR">EUR</option></select></label>
        <label>Roadmap horizon<input value={project.horizon || ''} onChange={(event) => setProject({ ...project, horizon: event.target.value })} placeholder="18 months" /></label>
        <label>Output style<select value={project.outputStyle || 'Siemens Executive'} onChange={(event) => setProject({ ...project, outputStyle: event.target.value })}><option>Siemens Executive</option><option>Neutral Executive</option></select></label>
        <label className="span-2">Customer Objective<textarea value={project.objective} onChange={(event) => setProject({ ...project, objective: event.target.value })} /></label>
      </div>
    </StepFrame>
  )
}

function StakeholdersStep({ project, setProject, onContinue }: { project: Project; setProject: (project: Project) => void; onContinue: () => void }) {
  const patch = (id: string, patchValue: Partial<Stakeholder>) => setProject({ ...project, stakeholders: project.stakeholders.map((item) => item.id === id ? { ...item, ...patchValue } : item) })
  const add = () => setProject({ ...project, stakeholders: [...project.stakeholders, { id: nextId('stakeholder', project.stakeholders.length), name: '', role: '', area: '', concerns: [] }] })
  const remove = (id: string) => setProject({
    ...project,
    stakeholders: project.stakeholders.filter((stakeholder) => stakeholder.id !== id),
    pains: project.pains.map((pain) => ({ ...pain, stakeholderIds: pain.stakeholderIds.filter((stakeholderId) => stakeholderId !== id) })),
    processes: project.processes.map((process) => ({
      ...process,
      lanes: process.lanes.map((lane) => lane.stakeholderId === id ? { ...lane, stakeholderId: undefined } : lane),
    })),
  })
  return (
    <StepFrame stepId="stakeholders" project={project} onContinue={onContinue} primaryLabel="Continue to Process Map">
      <div className="list-header"><h3>People and roles interviewed</h3><button className="primary" onClick={add}><Plus size={16} /> Add Stakeholder</button></div>
      <div className="card-grid">
        {project.stakeholders.map((stakeholder) => (
          <article className="clean-card" key={stakeholder.id}>
            <div className="card-actions"><span className="eyebrow">Stakeholder</span><button className="danger icon-button" title="Delete stakeholder" aria-label="Delete stakeholder" onClick={() => remove(stakeholder.id)}><Trash2 size={15} /></button></div>
            <label>Name<input value={stakeholder.name} onChange={(event) => patch(stakeholder.id, { name: event.target.value })} /></label>
            <label>Role<input value={stakeholder.role} onChange={(event) => patch(stakeholder.id, { role: event.target.value })} /></label>
            <label>Area<input value={stakeholder.area} onChange={(event) => patch(stakeholder.id, { area: event.target.value })} /></label>
            <label>Key concerns<input value={stakeholder.concerns.join(', ')} onChange={(event) => patch(stakeholder.id, { concerns: splitList(event.target.value) })} /></label>
          </article>
        ))}
      </div>
    </StepFrame>
  )
}

function PainsStep({ project, setProject, onContinue }: { project: Project; setProject: (project: Project) => void; onContinue: () => void }) {
  const steps = project.processes.flatMap((process) => process.steps.map((step) => ({ ...step, processName: process.name })))
  const patch = (id: string, patchValue: Partial<Pain>) => setProject({ ...project, pains: project.pains.map((pain) => pain.id === id ? { ...pain, ...patchValue } : pain) })
  const add = () => setProject({ ...project, pains: [...project.pains, { id: nextId('pain', project.pains.length), code: `P${project.pains.length + 1}`, statement: '', stakeholderIds: [], evidenceIds: [], severity: 'medium', frequency: 3, impact: 3 }] })
  const remove = (id: string) => setProject({
    ...project,
    pains: project.pains.filter((pain) => pain.id !== id),
    processes: project.processes.map((process) => ({ ...process, steps: process.steps.map((step) => ({ ...step, painIds: step.painIds.filter((painId) => painId !== id) })) })),
    clusters: project.clusters.map((cluster) => ({ ...cluster, painIds: cluster.painIds.filter((painId) => painId !== id) })),
  })
  return (
    <StepFrame stepId="pains" project={project} onContinue={onContinue} primaryLabel="Continue to Root Cause">
      <div className="list-header"><h3>MECE pain inventory</h3><button className="primary" onClick={add}><Plus size={16} /> Add Pain</button></div>
      <div className="clean-table pain-table">
        <div className="table-row table-head"><span>Code</span><span>Pain statement</span><span>Linked step</span><span>Severity</span><span>Freq</span><span>Impact</span><span>Score</span><span className="action-head">Action</span></div>
        {project.pains.map((pain) => <div className="table-row" key={pain.id}>
          <input value={pain.code} onChange={(event) => patch(pain.id, { code: event.target.value })} />
          <textarea className="compact-textarea" title={pain.statement} value={pain.statement} onChange={(event) => patch(pain.id, { statement: event.target.value })} />
          <select value={pain.stepId || ''} onChange={(event) => patch(pain.id, { stepId: event.target.value || undefined })}><option value="">Select</option>{steps.map((step) => <option key={step.id} value={step.id}>{step.label} ({step.processName})</option>)}</select>
          <select value={pain.severity} onChange={(event) => patch(pain.id, { severity: event.target.value as Pain['severity'] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
          <input type="number" value={pain.frequency} onChange={(event) => patch(pain.id, { frequency: Number(event.target.value) })} />
          <input type="number" value={pain.impact} onChange={(event) => patch(pain.id, { impact: Number(event.target.value) })} />
          <strong>{pain.frequency * pain.impact}</strong>
          <button className="danger icon-button" title="Delete pain" aria-label="Delete pain" onClick={() => remove(pain.id)}><Trash2 size={15} /></button>
        </div>)}
      </div>
    </StepFrame>
  )
}

function RootCauseStep({ project, setProject, onContinue }: { project: Project; setProject: (project: Project) => void; onContinue: () => void }) {
  const [selectedClusterId, setSelectedClusterId] = useState(project.clusters[0]?.id || '')
  const selectedCluster = project.clusters.find((cluster) => cluster.id === selectedClusterId) || project.clusters[0]
  const painById = new Map(project.pains.map((pain) => [pain.id, pain]))
  const painSource = (pain: Pain) => {
    const process = project.processes.find((candidate) => candidate.steps.some((step) => step.id === pain.stepId))
    const step = process?.steps.find((candidate) => candidate.id === pain.stepId)
    return `${process?.name || 'No process'} / ${step?.label || 'No step'}`
  }
  const patchCluster = (id: string, patchValue: Partial<Cluster>) => setProject({ ...project, clusters: project.clusters.map((cluster) => cluster.id === id ? { ...cluster, ...patchValue } : cluster) })
  const addCluster = () => {
    const cluster = { id: nextId('cluster', project.clusters.length), code: `G${project.clusters.length + 1}`, theme: 'New cluster', painIds: [] }
    setProject({ ...project, clusters: [...project.clusters, cluster] })
    setSelectedClusterId(cluster.id)
  }
  const removeCluster = (id: string) => {
    const rootIdsToRemove = project.rootCauses.filter((root) => root.clusterIds.includes(id) && root.clusterIds.length <= 1).map((root) => root.id)
    setProject({
      ...project,
      clusters: project.clusters.filter((cluster) => cluster.id !== id),
      fiveWhys: project.fiveWhys.filter((why) => why.clusterId !== id && !rootIdsToRemove.includes(why.rootCauseId)),
      rootCauses: project.rootCauses
        .filter((root) => !rootIdsToRemove.includes(root.id))
        .map((root) => ({ ...root, clusterIds: root.clusterIds.filter((clusterId) => clusterId !== id) })),
      solutions: project.solutions.filter((solution) => !solution.rootCauseIds.some((rootId) => rootIdsToRemove.includes(rootId))),
      initiatives: project.initiatives.map((initiative) => ({
        ...initiative,
        solutionIds: initiative.solutionIds.filter((solutionId) => {
          const solution = project.solutions.find((candidate) => candidate.id === solutionId)
          return solution ? !solution.rootCauseIds.some((rootId) => rootIdsToRemove.includes(rootId)) : true
        }),
      })),
    })
    setSelectedClusterId(project.clusters.find((cluster) => cluster.id !== id)?.id || '')
  }
  const removeRoot = (id: string) => {
    const solutionIdsToRemove = project.solutions.filter((solution) => solution.rootCauseIds.includes(id)).map((solution) => solution.id)
    setProject({
      ...project,
      rootCauses: project.rootCauses.filter((root) => root.id !== id),
      fiveWhys: project.fiveWhys.filter((why) => why.rootCauseId !== id),
      solutions: project.solutions.filter((solution) => !solution.rootCauseIds.includes(id)),
      initiatives: project.initiatives.map((initiative) => ({ ...initiative, solutionIds: initiative.solutionIds.filter((solutionId) => !solutionIdsToRemove.includes(solutionId)) })),
    })
  }
  const rootForCluster = selectedCluster ? project.rootCauses.find((root) => root.clusterIds.includes(selectedCluster.id)) : undefined
  const whyForCluster = selectedCluster ? project.fiveWhys.find((why) => why.clusterId === selectedCluster.id) : undefined
  const upsertRoot = (statement: string) => {
    if (!selectedCluster) return
    if (rootForCluster) setProject({ ...project, rootCauses: project.rootCauses.map((root) => root.id === rootForCluster.id ? { ...root, code: selectedCluster.code, statement } : root) })
    else setProject({ ...project, rootCauses: [...project.rootCauses, { id: nextId('root', project.rootCauses.length), code: selectedCluster.code, statement, clusterIds: [selectedCluster.id] }] })
  }
  return (
    <StepFrame stepId="rootCause" project={project} onContinue={onContinue} primaryLabel="Continue to Solutions">
      <div className="split-workspace">
        <aside className="clean-list"><div className="list-header"><h3>Clusters</h3><button onClick={addCluster}>Add</button></div>{project.clusters.map((cluster) => <div className={`list-item-with-action ${cluster.id === selectedCluster?.id ? 'selected-list-item' : ''}`} key={cluster.id}><button onClick={() => setSelectedClusterId(cluster.id)}><b>{cluster.code}</b><span>{cluster.theme}</span></button><button className="danger icon-button" title="Delete cluster" aria-label="Delete cluster" onClick={() => removeCluster(cluster.id)}><Trash2 size={15} /></button></div>)}</aside>
        <section className="detail-panel">
          {selectedCluster ? <>
            <label>Cluster theme<input value={selectedCluster.theme} onChange={(event) => patchCluster(selectedCluster.id, { theme: event.target.value })} /></label>
            <label>Pains in cluster<select multiple value={selectedCluster.painIds} onChange={(event) => patchCluster(selectedCluster.id, { painIds: Array.from(event.target.selectedOptions).map((option) => option.value) })}>{project.pains.map((pain) => <option key={pain.id} value={pain.id}>{pain.code} - {pain.statement} ({painSource(pain)})</option>)}</select></label>
            <div className="linked-list">{selectedCluster.painIds.map((painId) => {
              const pain = painById.get(painId)
              return pain ? <span key={painId}>{pain.code} · {painSource(pain)}</span> : null
            })}</div>
            <FiveWhyEditor project={project} setProject={setProject} clusterId={selectedCluster.id} whyId={whyForCluster?.id} rootCauseId={rootForCluster?.id} />
            <label>Confirmed root cause<textarea value={rootForCluster?.statement || ''} onChange={(event) => upsertRoot(event.target.value)} placeholder={`${selectedCluster.code} root cause statement`} /></label>
            {rootForCluster && <button className="danger icon-button" title="Delete root cause" aria-label="Delete root cause" onClick={() => removeRoot(rootForCluster.id)}><Trash2 size={15} /></button>}
          </> : <p className="empty-state">Create a cluster to start root-cause analysis.</p>}
        </section>
      </div>
    </StepFrame>
  )
}

function FiveWhyEditor({ project, setProject, clusterId, whyId, rootCauseId }: { project: Project; setProject: (project: Project) => void; clusterId: string; whyId?: string; rootCauseId?: string }) {
  const why = project.fiveWhys.find((item) => item.id === whyId)
  const whys = why?.whys || ['', '', '', '', '']
  const update = (index: number, value: string) => {
    const nextWhys = [...whys]
    nextWhys[index] = value
    if (why) setProject({ ...project, fiveWhys: project.fiveWhys.map((item) => item.id === why.id ? { ...item, whys: nextWhys } : item) })
    else setProject({ ...project, fiveWhys: [...project.fiveWhys, { id: nextId('why', project.fiveWhys.length), clusterId, rootCauseId: rootCauseId || '', whys: nextWhys }] })
  }
  return <div className="why-ladder">{[0, 1, 2, 3, 4].map((index) => <label key={index}>Why {index + 1}<textarea className="compact-textarea" title={whys[index] || ''} value={whys[index] || ''} onChange={(event) => update(index, event.target.value)} /></label>)}</div>
}

function SolutionsStep({ project, setProject, onContinue }: { project: Project; setProject: (project: Project) => void; onContinue: () => void }) {
  const patch = (id: string, patchValue: Partial<Solution>) => setProject({ ...project, solutions: project.solutions.map((solution) => solution.id === id ? { ...solution, ...patchValue } : solution) })
  const addForRoot = (rootId: string) => setProject({ ...project, solutions: [...project.solutions, { id: nextId('solution', project.solutions.length), code: `S${project.solutions.length + 1}`, statement: '', rootCauseIds: [rootId], productHints: [], proofKpi: '', digitalThread: 'Integrated Lifecycle Management' }] })
  const remove = (id: string) => setProject({
    ...project,
    solutions: project.solutions.filter((solution) => solution.id !== id),
    initiatives: project.initiatives.map((initiative) => ({ ...initiative, solutionIds: initiative.solutionIds.filter((solutionId) => solutionId !== id) })),
  })
  return (
    <StepFrame stepId="solutions" project={project} onContinue={onContinue} primaryLabel="Continue to Roadmap">
      <div className="chain-list">
        {project.rootCauses.map((root) => <article className="chain-card" key={root.id}>
          <header><b>{root.code}</b><span>{root.statement}</span><button onClick={() => addForRoot(root.id)}>Add solution</button></header>
          {project.solutions.filter((solution) => solution.rootCauseIds.includes(root.id)).map((solution) => <div className="solution-line" key={solution.id}>
            <textarea className="compact-textarea" title={solution.statement} value={solution.statement} placeholder="Concrete solution" onChange={(event) => patch(solution.id, { statement: event.target.value })} />
            <select value={solution.digitalThread || ''} onChange={(event) => patch(solution.id, { digitalThread: event.target.value as DigitalThread })}>
              <option value="">Select Digital Thread</option>
              {digitalThreads.map((thread) => <option key={thread.id} value={thread.id}>{thread.short} - {thread.id}</option>)}
            </select>
            <textarea className="compact-textarea" title={solution.proofKpi} value={solution.proofKpi} placeholder="Success metric / KPI" onChange={(event) => patch(solution.id, { proofKpi: event.target.value })} />
            <select value={solution.initiativeId || ''} onChange={(event) => patch(solution.id, { initiativeId: event.target.value || undefined })}><option value="">No initiative</option>{project.initiatives.map((initiative) => <option key={initiative.id} value={initiative.id}>{initiative.code} - {initiative.name}</option>)}</select>
            <button className="danger icon-button" title="Delete solution" aria-label="Delete solution" onClick={() => remove(solution.id)}><Trash2 size={15} /></button>
          </div>)}
        </article>)}
      </div>
    </StepFrame>
  )
}

function RoadmapStep({ project, setProject, onContinue }: { project: Project; setProject: (project: Project) => void; onContinue: () => void }) {
  const [selectedInitiativeId, setSelectedInitiativeId] = useState(project.initiatives[0]?.id || '')
  const patch = (id: string, patchValue: Partial<Initiative>) => setProject({ ...project, initiatives: project.initiatives.map((initiative) => initiative.id === id ? { ...initiative, ...patchValue } : initiative) })
  const patchBenefit = (initiative: Initiative, patchValue: Partial<BenefitModel>) => {
    const benefitModel = normalizeBenefitModel({ ...initiative.benefitModel, ...financialDefaults(project), ...patchValue })
    patch(initiative.id, { benefitModel, annualBenefit: initiativeFinancials({ ...initiative, benefitModel }).annualBenefit })
  }
  const patchWave = (id: string, patchValue: Partial<Project['waves'][number]>) => setProject({ ...project, waves: project.waves.map((wave) => wave.id === id ? { ...wave, ...patchValue } : wave) })
  const addWave = () => setProject({ ...project, waves: [...project.waves, { id: nextId('wave', project.waves.length), label: `Wave ${project.waves.length + 1}`, title: 'New wave', horizon: 'TBD' }] })
  const add = (waveId: string) => {
    const initiative = { id: nextId('initiative', project.initiatives.length), code: `I${project.initiatives.length + 1}`, name: 'New initiative', objective: 'Describe the initiative outcome.', waveId, workstreamIds: [], solutionIds: [], kpis: [], siemensSolutionsRelated: [], investment: 0, annualBenefit: 0, benefitModel: benefitModelWithDefaults(project), assumptions: [], benefitLogic: '' }
    setProject({ ...project, initiatives: [...project.initiatives, initiative] })
    setSelectedInitiativeId(initiative.id)
  }
  const removeInitiative = (id: string) => {
    const remaining = project.initiatives.filter((initiative) => initiative.id !== id)
    setProject({
      ...project,
      initiatives: remaining,
      solutions: project.solutions.map((solution) => solution.initiativeId === id ? { ...solution, initiativeId: undefined } : solution),
    })
    setSelectedInitiativeId(remaining[0]?.id || '')
  }
  const removeWave = (id: string) => {
    if (project.waves.length <= 1) return
    const fallbackWave = project.waves.find((wave) => wave.id !== id)
    if (!fallbackWave) return
    setProject({
      ...project,
      waves: project.waves.filter((wave) => wave.id !== id),
      initiatives: project.initiatives.map((initiative) => initiative.waveId === id ? { ...initiative, waveId: fallbackWave.id } : initiative),
    })
  }
  const selected = project.initiatives.find((initiative) => initiative.id === selectedInitiativeId)
  return (
    <StepFrame stepId="roadmap" project={project} onContinue={onContinue} primaryLabel="Continue to Financials">
      <div className="roadmap-controls"><button onClick={addWave}>Add Wave</button><span>Drag initiative cards between waves. Click a card to edit details.</span></div>
      <div className="roadmap-editor">
        <div className="roadmap-board">{project.waves.map((wave) => (
          <section
            className="wave-lane"
            key={wave.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const initiativeId = event.dataTransfer.getData('text/plain')
              if (initiativeId) patch(initiativeId, { waveId: wave.id })
            }}
          >
            <header className="wave-edit-head">
              <label>Label<input value={wave.label} onChange={(event) => patchWave(wave.id, { label: event.target.value })} /></label>
              <label>Title<input value={wave.title} onChange={(event) => patchWave(wave.id, { title: event.target.value })} /></label>
              <label>Horizon<input value={wave.horizon} onChange={(event) => patchWave(wave.id, { horizon: event.target.value })} /></label>
              <button className="danger icon-button" title="Delete wave" aria-label="Delete wave" disabled={project.waves.length <= 1} onClick={() => removeWave(wave.id)}><Trash2 size={15} /></button>
            </header>
            {project.initiatives.filter((initiative) => initiative.waveId === wave.id).map((initiative) => (
              <button
                className={`initiative-summary ${initiative.id === selected?.id ? 'active' : ''}`}
                draggable
                key={initiative.id}
                onClick={() => setSelectedInitiativeId(initiative.id)}
                onDragStart={(event) => event.dataTransfer.setData('text/plain', initiative.id)}
              >
                <b>{initiative.code} {initiative.name || 'Untitled initiative'}</b>
                <span>{initiative.objective || 'No description yet.'}</span>
                <small>{threadShort(project, initiative)} | {initiative.kpis.slice(0, 2).join(', ') || 'No KPIs yet'}</small>
              </button>
            ))}
            <button onClick={() => add(wave.id)}>Add initiative</button>
          </section>
        ))}</div>
        <aside className="initiative-detail">
          {selected ? <>
            <span className="eyebrow">Initiative details</span>
            <label>Code<input value={selected.code} onChange={(event) => patch(selected.id, { code: event.target.value })} /></label>
            <label>Name<input value={selected.name} placeholder="Initiative name" onChange={(event) => patch(selected.id, { name: event.target.value })} /></label>
            <label>Objective<textarea value={selected.objective} placeholder="Objective" onChange={(event) => patch(selected.id, { objective: event.target.value })} /></label>
            <label>KPIs<input value={selected.kpis.join(', ')} placeholder="KPIs" onChange={(event) => patch(selected.id, { kpis: splitList(event.target.value) })} /></label>
            <label>Siemens Solutions Related<select multiple value={selected.siemensSolutionsRelated || []} onChange={(event) => patch(selected.id, { siemensSolutionsRelated: Array.from(event.target.selectedOptions).map((option) => option.value) })}>{siemensPortfolioOptions.map((solution) => <option key={solution} value={solution}>{solution}</option>)}</select></label>
            <label>Siemens software architecture<textarea value={(selected.softwareArchitecture || []).join('\n')} placeholder="One architecture component per line" onChange={(event) => patch(selected.id, { softwareArchitecture: splitLines(event.target.value) })} /></label>
            <label>Wave<select value={selected.waveId} onChange={(event) => patch(selected.id, { waveId: event.target.value })}>{project.waves.map((wave) => <option key={wave.id} value={wave.id}>{wave.label} - {wave.title}</option>)}</select></label>
            <label>Return starts after (months)<input type="number" value={normalizeBenefitModel(selected.benefitModel).benefitStartMonth} onChange={(event) => patchBenefit(selected, { benefitStartMonth: Number(event.target.value) })} /></label>
            <label>Linked solutions<select multiple value={selected.solutionIds} onChange={(event) => patch(selected.id, { solutionIds: Array.from(event.target.selectedOptions).map((option) => option.value) })}>{project.solutions.map((solution) => <option key={solution.id} value={solution.id}>{solution.code} - {solution.statement}</option>)}</select></label>
            <button className="danger icon-button" title="Delete initiative" aria-label="Delete initiative" onClick={() => removeInitiative(selected.id)}><Trash2 size={15} /></button>
          </> : <p className="empty-state">Select an initiative to edit details.</p>}
        </aside>
      </div>
    </StepFrame>
  )
}

function PaybackTimeline({ project, mode }: { project: Project; mode: NonNullable<Project['timelineView']> }) {
  const points = projectCashflowTimeline(project)
  const financials = totals(project)
  const width = 920
  const height = 260
  const pad = { left: 72, right: 26, top: 28, bottom: 46 }
  const maxMonth = Math.max(...points.map((point) => point.month), 1)
  const xLabel = (month: number) => mode === 'years' ? `Y${(month / 12).toFixed(month % 12 ? 1 : 0)}` : month >= 12 ? `${Math.round(month / 12)}y` : `${month}m`
  const yearTicks = Array.from({ length: Math.max(2, Math.floor(maxMonth / 12) + 1) }, (_, index) => index * 12)
  if (yearTicks[yearTicks.length - 1] < maxMonth) yearTicks.push(maxMonth)
  const ticks = mode === 'years'
    ? yearTicks
    : [0, Math.round(maxMonth / 4), Math.round(maxMonth / 2), Math.round(maxMonth * 0.75), maxMonth]
  const maxValue = Math.max(...points.flatMap((point) => [point.investment, point.discountedBenefit]), 1)
  const x = (month: number) => pad.left + (month / maxMonth) * (width - pad.left - pad.right)
  const y = (value: number) => height - pad.bottom - (value / maxValue) * (height - pad.top - pad.bottom)
  const benefitPath = points.map((point) => `${x(point.month)},${y(point.discountedBenefit)}`).join(' ')
  const investmentPath = points.map((point) => `${x(point.month)},${y(point.investment)}`).join(' ')
  const paybackX = Number.isFinite(financials.discountedPayback) ? x(financials.discountedPayback) : undefined
  const currency = project.currency || 'BRL'

  return (
    <div className="timeline-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Discounted payback timeline">
        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} />
        <polyline className="investment-line" points={investmentPath} />
        <polyline className="benefit-line" points={benefitPath} />
        {paybackX && <>
          <line className="payback-line" x1={paybackX} y1={pad.top} x2={paybackX} y2={height - pad.bottom} />
          <circle className="payback-dot" cx={paybackX} cy={y(financials.investment)} r="5" />
        </>}
        {ticks.map((month) => <text key={month} x={x(month)} y={height - 15} textAnchor="middle">{xLabel(month)}</text>)}
        {[0, maxValue / 2, maxValue].map((value) => <text key={value} x={pad.left - 10} y={y(value) + 4} textAnchor="end">{new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}</text>)}
      </svg>
      <div className="timeline-legend">
        <span><i className="investment-swatch" />Investment threshold: {formatMoney(financials.investment, currency)}</span>
        <span><i className="benefit-swatch" />Cumulative discounted gains: {formatMoney(points[points.length - 1]?.discountedBenefit || 0, currency)}</span>
        <strong>Discounted payback: {formatMonths(financials.discountedPayback, mode)}</strong>
      </div>
    </div>
  )
}

function ExecutiveRoadmap({ project, setProject }: { project: Project; setProject?: (project: Project) => void }) {
  const [waveFilter, setWaveFilter] = useState('')
  const [threadFilter, setThreadFilter] = useState('')
  const [showTimeline, setShowTimeline] = useState(true)
  const filteredInitiatives = project.initiatives.filter((initiative) => initiativeMatchesFilters(project, initiative, waveFilter, threadFilter))
  const filteredProject = { ...project, initiatives: filteredInitiatives }
  const byThread = initiativesByThread(filteredProject)
  const filteredFinancials = totals(filteredProject)
  const timelineView = project.timelineView || 'months'
  const setTimelineView = (view: NonNullable<Project['timelineView']>) => {
    if (setProject) setProject({ ...project, timelineView: view })
  }
  return <section className="executive-roadmap">
    <div className="roadmap-filter-bar">
      <label>Wave<select value={waveFilter} onChange={(event) => setWaveFilter(event.target.value)}><option value="">All waves</option>{project.waves.map((wave) => <option key={wave.id} value={wave.id}>{wave.label} - {wave.title}</option>)}</select></label>
      <label>Digital Thread<select value={threadFilter} onChange={(event) => setThreadFilter(event.target.value)}><option value="">All Digital Threads</option>{digitalThreads.map((thread) => <option key={thread.id} value={thread.id}>{thread.short} - {thread.id}</option>)}</select></label>
    </div>
    <section className="summary-strip filtered-summary">
      <div><small>Investment</small><strong>{formatMoney(filteredFinancials.investment, project.currency)}</strong></div>
      <div><small>Annual benefit</small><strong>{formatMoney(filteredFinancials.annualBenefit, project.currency)}</strong></div>
      <div><small>Payback</small><strong>{filteredFinancials.paybackMonths.toFixed(1)} mo</strong></div>
      <div><small>Discounted payback</small><strong>{formatDiscountedPayback(filteredFinancials.discountedPayback)}</strong></div>
    </section>
    <div className="matrix-panel">
      <div className="matrix-label top-left">PRIORITIZE (quick wins)</div>
      <div className="matrix-label top-right">PLAN STRATEGICALLY</div>
      <div className="matrix-label bottom-left">INCREMENTAL</div>
      <div className="matrix-label bottom-right">ASSESS / PHASE</div>
      <div className="axis-x">Implementation effort →</div>
      <div className="axis-y">Business value →</div>
      {filteredInitiatives.map((initiative) => {
        const bubble = initiativeBubble(project, initiative)
        return <div className={`roadmap-bubble thread-${threadShort(project, initiative).toLowerCase()}`} key={initiative.id} style={{ left: `${bubble.effort}%`, bottom: `${bubble.value}%`, width: bubble.size, height: bubble.size }}>{initiative.code}</div>
      })}
    </div>
    <aside className="initiative-legend">
      <h3>Initiatives</h3>
      <section className="color-legend">
        <strong>Color legend: Siemens Digital Threads</strong>
        {digitalThreads.map((thread) => <span key={thread.id}><i className={`thread-dot thread-${thread.short.toLowerCase()}`} />{thread.short} - {thread.id}</span>)}
        <small>Wave is shown as text beside each initiative.</small>
      </section>
      {filteredInitiatives.map((initiative) => <div key={initiative.id}><b>{initiative.code.replace(/\D/g, '') || initiative.code}</b><span><strong>{initiative.name}</strong><small>{threadShort(project, initiative)} · {project.waves.find((wave) => wave.id === initiative.waveId)?.label}</small></span></div>)}
      {filteredInitiatives.length === 0 && <small>No initiatives match the selected filters.</small>}
    </aside>
    <div className="thread-view">
      {byThread.map((group) => <article key={group.thread.id}><strong>{group.thread.short}</strong><h4>{group.thread.id}</h4><p>{formatMoney(group.annualBenefit, project.currency)} annual benefit</p><small>{group.initiatives.map((initiative) => initiative.code).join(', ') || 'No initiatives yet'}</small></article>)}
    </div>
    <section className="timeline-section executive-timeline">
      <header>
        <div>
          <span className="eyebrow">Filtered business case</span>
          <h3>Payback timeline</h3>
          <p>Investment vs. discounted gains using the current Wave and Digital Thread filters.</p>
        </div>
        <div className="timeline-actions">
          <div className="segmented-control" aria-label="Timeline view">
            <button className={timelineView === 'months' ? 'active' : ''} onClick={() => setTimelineView('months')}>Months</button>
            <button className={timelineView === 'years' ? 'active' : ''} onClick={() => setTimelineView('years')}>Years</button>
          </div>
          <button onClick={() => setShowTimeline((value) => !value)}>{showTimeline ? 'Hide timeline' : 'Show timeline'}</button>
        </div>
      </header>
      {showTimeline && <PaybackTimeline project={filteredProject} mode={timelineView} />}
    </section>
  </section>
}

function FinancialsStep({ project, setProject, onContinue }: { project: Project; setProject: (project: Project) => void; onContinue: () => void }) {
  const [selectedInitiativeId, setSelectedInitiativeId] = useState(project.initiatives[0]?.id || '')
  const [waveFilter, setWaveFilter] = useState('')
  const [threadFilter, setThreadFilter] = useState('')
  const assumptions = financialDefaults(project)
  const patch = (id: string, patchValue: Partial<Initiative>) => setProject({ ...project, initiatives: project.initiatives.map((initiative) => initiative.id === id ? { ...initiative, ...patchValue } : initiative) })
  const patchBenefit = (initiative: Initiative, patchValue: Partial<BenefitModel>) => {
    const benefitModel = normalizeBenefitModel({ ...initiative.benefitModel, ...assumptions, ...patchValue })
    const annualBenefit = initiativeFinancials({ ...initiative, benefitModel }).annualBenefit
    patch(initiative.id, { benefitModel, annualBenefit })
  }
  const patchAssumptions = (patchValue: Partial<FinancialAssumptions>) => {
    const nextAssumptions = { ...assumptions, ...patchValue }
    setProject({
      ...project,
      financialAssumptions: nextAssumptions,
      initiatives: project.initiatives.map((initiative) => {
        const benefitModel = normalizeBenefitModel({ ...initiative.benefitModel, ...nextAssumptions })
        return { ...initiative, benefitModel, annualBenefit: initiativeFinancials({ ...initiative, benefitModel }).annualBenefit }
      }),
    })
  }
  const filteredInitiatives = project.initiatives.filter((initiative) => initiativeMatchesFilters(project, initiative, waveFilter, threadFilter))
  const filteredProject = { ...project, initiatives: filteredInitiatives }
  const filteredFinancials = totals(filteredProject)
  const selected = filteredInitiatives.find((initiative) => initiative.id === selectedInitiativeId) || filteredInitiatives[0]
  return (
    <StepFrame stepId="financials" project={project} onContinue={onContinue} primaryLabel="Review Executive Roadmap">
      <div className="financial-guidance">
        <h3>Annual gain calculator</h3>
        <p>Fill WACC and benefit horizon once for the whole roadmap, then select each initiative and enter only the value drivers that apply.</p>
      </div>
      <section className="global-finance-card">
        <div>
          <span className="field-tag required">Global assumptions</span>
          <h3>Used by every initiative</h3>
          <p>These values are standard across the roadmap and are automatically applied to all initiatives.</p>
        </div>
        <FinanceNumberField required label="WACC" unit="%" value={assumptions.waccPercent} onChange={(value) => patchAssumptions({ waccPercent: value })} help="Company discount rate used for discounted payback." />
        <FinanceNumberField required label="Benefit horizon" unit="years" value={assumptions.benefitYears} onChange={(value) => patchAssumptions({ benefitYears: value })} help={`${Math.round(assumptions.benefitYears * 12)} months used as the discounted-payback horizon.`} />
      </section>
      <section className="finance-filter-panel">
        <label>Wave<select value={waveFilter} onChange={(event) => setWaveFilter(event.target.value)}><option value="">All waves</option>{project.waves.map((wave) => <option key={wave.id} value={wave.id}>{wave.label} - {wave.title}</option>)}</select></label>
        <label>Digital Thread<select value={threadFilter} onChange={(event) => setThreadFilter(event.target.value)}><option value="">All Digital Threads</option>{digitalThreads.map((thread) => <option key={thread.id} value={thread.id}>{thread.short} - {thread.id}</option>)}</select></label>
        <div><small>Filtered investment</small><strong>{formatMoney(filteredFinancials.investment, project.currency)}</strong></div>
        <div><small>Filtered benefit</small><strong>{formatMoney(filteredFinancials.annualBenefit, project.currency)}</strong></div>
        <div><small>Filtered payback</small><strong>{filteredFinancials.paybackMonths.toFixed(1)} mo</strong></div>
      </section>
      <div className="financial-workspace">
        <aside className="financial-list">
          {filteredInitiatives.map((initiative) => {
            const financial = initiativeFinancials(initiative)
            return <button key={initiative.id} className={initiative.id === selected?.id ? 'selected-list-item' : ''} onClick={() => setSelectedInitiativeId(initiative.id)}><b>{initiative.code}</b><span>{initiative.name}</span><small>{formatMoney(financial.annualBenefit, project.currency)} · {financial.paybackMonths.toFixed(1)} mo</small></button>
          })}
          {filteredInitiatives.length === 0 && <p className="empty-state">No initiatives match the selected filters.</p>}
        </aside>
        {selected && <FinancialEditor key={selected.id} initiative={selected} currency={project.currency} patch={patch} patchBenefit={patchBenefit} />}
      </div>
    </StepFrame>
  )
}

function FinanceNumberField({ label, value, onChange, help, unit, required = false }: { label: string; value: number; onChange: (value: number) => void; help: string; unit: string; required?: boolean }) {
  const [draft, setDraft] = useState(formatInputNumber(value))

  return (
    <label className="finance-field">
      <span>{label}<em>{unit}</em>{required && <b>Required</b>}</span>
      <input
        inputMode="decimal"
        value={draft}
        onFocus={() => {
          setDraft(String(value))
        }}
        onBlur={() => {
          setDraft(formatInputNumber(parseInputNumber(draft)))
        }}
        onChange={(event) => {
          setDraft(event.target.value)
          onChange(parseInputNumber(event.target.value))
        }}
      />
      <small>{help}</small>
    </label>
  )
}

function FinancialEditor({ initiative, currency, patch, patchBenefit }: { initiative: Initiative; currency?: string; patch: (id: string, patchValue: Partial<Initiative>) => void; patchBenefit: (initiative: Initiative, patchValue: Partial<BenefitModel>) => void }) {
  const financial = initiativeFinancials(initiative)
  const m = financial.model
  const [category, setCategory] = useState<'capital' | 'production' | 'productivity'>('capital')
  return <article className="financial-editor">
    <header><div><span className="eyebrow">Selected initiative</span><h3>{initiative.code} {initiative.name}</h3></div><strong>{formatMoney(financial.annualBenefit, currency)} annual gain</strong></header>
    <div className="financial-kpis"><b>{financial.paybackMonths.toFixed(1)} mo simple</b><b>{formatDiscountedPayback(financial.discountedPayback)} discounted</b><b>{financial.roiYear1.toFixed(0)}% ROI Y1</b></div>
    <div className="finance-category-tabs">
      <button className={category === 'capital' ? 'active' : ''} onClick={() => setCategory('capital')}>1. Base case</button>
      <button className={category === 'production' ? 'active' : ''} onClick={() => setCategory('production')}>2. Production value</button>
      <button className={category === 'productivity' ? 'active' : ''} onClick={() => setCategory('productivity')}>3. Efficiency & risk</button>
    </div>
    {category === 'capital' && <section className="finance-section">
      <div><span className="field-tag required">Always fill</span><h4>Initiative investment</h4><p>Only the investment is filled per initiative. WACC and benefit horizon are global assumptions above.</p></div>
      <div className="benefit-grid compact">
        <FinanceNumberField required label="Investment" unit={currency || 'BRL'} value={initiative.investment} onChange={(value) => patch(initiative.id, { investment: value })} help="Financial field: one-time implementation cost for this initiative." />
        <FinanceNumberField label="Return starts after" unit="months" value={m.benefitStartMonth} onChange={(value) => patchBenefit(initiative, { benefitStartMonth: value })} help="Timing field: months after implementation before annual benefits start accruing." />
      </div>
    </section>}
    {category === 'production' && <section className="finance-section">
      <div><span className="field-tag optional">Fill if applicable</span><h4>Production, utilization and reliability value</h4><p>Use this category when the solution reduces downtime, flaring losses, production loss or increases utilization.</p></div>
      <div className="benefit-grid compact">
        <FinanceNumberField label="Downtime avoided" unit="hours/year" value={m.downtimeHoursAvoided} onChange={(value) => patchBenefit(initiative, { downtimeHoursAvoided: value })} help="Operational quantity: annual critical downtime hours expected to be avoided." />
        <FinanceNumberField label="Cost per downtime hour" unit={`${currency || 'BRL'}/hour`} value={m.downtimeCostPerHour} onChange={(value) => patchBenefit(initiative, { downtimeCostPerHour: value })} help="Financial field: economic loss per hour stopped or constrained." />
        <FinanceNumberField label="Margin / production-loss uplift" unit={`${currency || 'BRL'}/year`} value={m.marginUplift} onChange={(value) => patchBenefit(initiative, { marginUplift: value })} help="Financial field: annual recovered margin, utilization or flaring-loss capture." />
      </div>
    </section>}
    {category === 'productivity' && <section className="finance-section">
      <div><span className="field-tag optional">Fill only what applies</span><h4>Efficiency, sustainability and risk levers</h4><p>Leave drivers at zero when they do not apply. The annual benefit is the sum of the populated levers.</p></div>
      <div className="benefit-grid compact">
        <FinanceNumberField label="Professional hours saved" unit="hours/year" value={m.professionalHoursSaved} onChange={(value) => patchBenefit(initiative, { professionalHoursSaved: value })} help="Operational quantity: total hours recovered across users, not per person." />
        <FinanceNumberField label="Loaded cost per hour" unit={`${currency || 'BRL'}/hour`} value={m.professionalCostPerHour} onChange={(value) => patchBenefit(initiative, { professionalCostPerHour: value })} help="Financial field: average fully loaded cost for saved hours." />
        <FinanceNumberField label="Energy savings" unit={`${currency || 'BRL'}/year`} value={m.energySavings} onChange={(value) => patchBenefit(initiative, { energySavings: value })} help="Financial field: annual energy or utility savings." />
        <FinanceNumberField label="Inventory/spares savings" unit={`${currency || 'BRL'}/year`} value={m.inventorySavings} onChange={(value) => patchBenefit(initiative, { inventorySavings: value })} help="Financial field: reduced inventory, emergency buys or spares exposure." />
        <FinanceNumberField label="Reduced rework" unit={`${currency || 'BRL'}/year`} value={m.reworkAvoided} onChange={(value) => patchBenefit(initiative, { reworkAvoided: value })} help="Financial field: avoided rework, repeat visits or duplicated engineering effort." />
        <FinanceNumberField label="CO2/compliance risk avoided" unit={`${currency || 'BRL'}/year`} value={m.complianceRiskAvoided} onChange={(value) => patchBenefit(initiative, { complianceRiskAvoided: value })} help="Financial field: avoided audit exposure, non-compliance or CO2-related cost." />
        <FinanceNumberField label="Other annual benefit" unit={`${currency || 'BRL'}/year`} value={m.otherAnnualBenefit} onChange={(value) => patchBenefit(initiative, { otherAnnualBenefit: value })} help="Financial field: use only for validated benefits not covered above." />
      </div>
    </section>}
    <label>Benefit logic<textarea value={initiative.benefitLogic || ''} onChange={(event) => patch(initiative.id, { benefitLogic: event.target.value })} placeholder="Explain how the annual gain was calculated." /></label>
    <label>Assumptions<input value={(initiative.assumptions || []).join(', ')} onChange={(event) => patch(initiative.id, { assumptions: splitList(event.target.value) })} placeholder="e.g., R$50k/h downtime, 45% capture" /></label>
  </article>
}

function PreviewStep({ project, setProject }: { project: Project; setProject: (project: Project) => void }) {
  const missing = validatePptReadiness(project)
  const slides = ['Cover', 'Executive Summary', 'Stakeholders', 'As-Is Process Map', 'Pain Inventory', 'Root Cause Analysis', 'Solution Mapping', 'Roadmap', 'Financials', 'Next Steps']
  return (
    <section className="step-page">
      <header className="step-hero"><div><span className="eyebrow">PPT Preview</span><h2>{missing.length ? 'Deck is not ready yet.' : 'Deck is ready to export.'}</h2></div><div className={missing.length ? 'gate-card blocked' : 'gate-card ready'}><strong>{missing.length ? 'Cannot export yet' : 'Ready'}</strong><ul>{(missing.length ? missing.slice(0, 5) : ['All traceability checks passed.']).map((item) => <li key={item}>{item}</li>)}</ul></div></header>
      <ExecutiveRoadmap project={project} setProject={setProject} />
      <div className="ppt-preview-grid">{slides.map((slide, index) => <article key={slide} className="slide-preview"><b>{index + 1}</b><span>{slide}</span><small>{missing.length ? 'Requires readiness checks' : 'Ready'}</small></article>)}</div>
    </section>
  )
}

function App() {
  const [project, setProject] = useState<Project | null>(null)
  const importProject = async (file: File) => setProject(JSON.parse(await file.text()) as Project)
  if (!project) return <ProjectHub onNew={() => setProject(blankProject())} onDemo={() => setProject(refapAssetTurnaroundAssessment)} onImport={(file) => void importProject(file)} />
  return <Workspace project={project} setProject={setProject} onBack={() => setProject(null)} />
}

export default App
