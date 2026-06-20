import { useEffect, useMemo } from 'react'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Lane, Pain, ProcessMap, ProcessStep, Stakeholder } from '../core/types'

interface SwimlaneEditorProps {
  process: ProcessMap
  pains: Pain[]
  stakeholders: Stakeholder[]
  onProcessChange: (process: ProcessMap) => void
  onSelectStep: (stepId: string) => void
  selectedStepId?: string
}

type StepNodeData = {
  label: string
  kind: ProcessStep['kind']
  system?: string
  painCodes: string[]
  selected: boolean
}

type LaneNodeData = {
  label: string
  ownerType: Lane['ownerType']
  stakeholder?: string
  width: number
}

const laneHeight = 128
const laneOffsetY = 24
const laneLabelWidth = 150
const laneWidth = 1850
const stepTopPadding = 22

function StepNode({ data }: NodeProps<Node<StepNodeData>>) {
  const classNames = ['step-node', `kind-${data.kind}`]
  if (data.selected) classNames.push('selected')

  return (
    <div className={classNames.join(' ')}>
      <Handle type="target" position={Position.Left} className="flow-handle target" />
      <div className="node-topline">
        <span>{data.kind}</span>
        {data.system && <b>{data.system}</b>}
      </div>
      <strong>{data.label}</strong>
      <div className="pain-badges">
        {data.painCodes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="flow-handle source" />
    </div>
  )
}

function LaneNode({ data }: NodeProps<Node<LaneNodeData>>) {
  return <div className="lane-node" style={{ width: data.width, height: laneHeight - 10 }}>
    <div className="lane-node-label"><strong>{data.label}</strong><span>{data.ownerType}</span>{data.stakeholder && <em>{data.stakeholder}</em>}</div>
  </div>
}

const nodeTypes = { step: StepNode, lane: LaneNode }

function toNodes(process: ProcessMap, pains: Pain[], stakeholderById: Map<string, Stakeholder>, selectedStepId?: string): Node<StepNodeData | LaneNodeData>[] {
  const painById = new Map(pains.map((pain) => [pain.id, pain]))
  const laneNodes: Node<LaneNodeData>[] = process.lanes.map((lane, index) => ({
    id: `lane-bg-${lane.id}`,
    type: 'lane',
    position: { x: 0, y: laneOffsetY + index * laneHeight },
    draggable: false,
    selectable: false,
    connectable: false,
    zIndex: -1,
    data: { label: lane.label, ownerType: lane.ownerType, stakeholder: lane.stakeholderId ? stakeholderById.get(lane.stakeholderId)?.name : undefined, width: laneWidth },
  }))
  const stepNodes: Node<StepNodeData>[] = process.steps.map((step) => {
    const laneIndex = Math.max(0, process.lanes.findIndex((lane) => lane.id === step.laneId))
    return {
      id: step.id,
      type: 'step',
      position: { x: laneLabelWidth + Math.max(16, step.x), y: laneOffsetY + laneIndex * laneHeight + Math.max(stepTopPadding, Math.min(step.y, laneHeight - 86)) },
      zIndex: 2,
      data: {
        label: step.label,
        kind: step.kind,
        system: step.system,
        painCodes: step.painIds.map((painId) => painById.get(painId)?.code || painId),
        selected: selectedStepId === step.id,
      },
    }
  })
  return [...laneNodes, ...stepNodes]
}

function toEdges(process: ProcessMap): Edge[] {
  return process.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: false,
    className: 'process-edge',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#00bedc' },
  }))
}

function laneForPosition(process: ProcessMap, y: number) {
  const index = Math.min(process.lanes.length - 1, Math.max(0, Math.floor((y - laneOffsetY) / laneHeight)))
  return process.lanes[index]?.id || process.lanes[0]?.id
}

export function SwimlaneEditor({ process, pains, stakeholders, onProcessChange, onSelectStep, selectedStepId }: SwimlaneEditorProps) {
  const stakeholderById = useMemo(() => new Map(stakeholders.map((stakeholder) => [stakeholder.id, stakeholder])), [stakeholders])
  const initialNodes = useMemo(() => toNodes(process, pains, stakeholderById, selectedStepId), [pains, process, selectedStepId, stakeholderById])
  const initialEdges = useMemo(() => toEdges(process), [process])
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(toNodes(process, pains, stakeholderById, selectedStepId))
    setEdges(toEdges(process))
  }, [pains, process, selectedStepId, setEdges, setNodes, stakeholderById])

  const syncProcessFromNodes = (nextNodes: Node<StepNodeData | LaneNodeData>[], nextEdges = edges) => {
    const updatedSteps = process.steps.map((step) => {
      const node = nextNodes.find((candidate) => candidate.id === step.id)
      if (!node) return step
      const laneId = laneForPosition(process, node.position.y)
      const laneIndex = Math.max(0, process.lanes.findIndex((lane) => lane.id === laneId))
      return {
        ...step,
        laneId,
        x: Math.max(16, Math.round(node.position.x - laneLabelWidth)),
        y: Math.max(stepTopPadding, Math.min(laneHeight - 86, Math.round(node.position.y - laneOffsetY - laneIndex * laneHeight))),
      }
    })
    const updatedEdges = nextEdges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, label: String(edge.label || '') || undefined }))
    onProcessChange({ ...process, steps: updatedSteps, edges: updatedEdges })
  }

  const onConnect = (connection: Connection) => {
    const nextEdges = addEdge({ ...connection, id: `edge-${process.edges.length + 1}`, className: 'process-edge', label: 'next', markerEnd: { type: MarkerType.ArrowClosed, color: '#00bedc' } }, edges)
    setEdges(nextEdges)
    syncProcessFromNodes(nodes, nextEdges)
  }

  const addStep = (kind: ProcessStep['kind']) => {
    const lane = process.lanes[0]
    if (!lane) return
    const id = `step-${process.steps.length + 1}`
    const newStep: ProcessStep = {
      id,
      label: kind === 'decision' ? 'New decision' : 'New activity',
      kind,
      laneId: lane.id,
      x: 120,
      y: 24,
      painIds: [],
    }
    onProcessChange({ ...process, steps: [...process.steps, newStep] })
    onSelectStep(id)
  }

  const patchProcess = (patch: Partial<ProcessMap>) => {
    onProcessChange({ ...process, ...patch })
  }

  const patchLane = (laneId: string, patch: Partial<Lane>) => {
    onProcessChange({
      ...process,
      lanes: process.lanes.map((lane) => (lane.id === laneId ? { ...lane, ...patch } : lane)),
    })
  }

  const linkStakeholder = (laneId: string, stakeholderId: string) => {
    const stakeholder = stakeholders.find((item) => item.id === stakeholderId)
    patchLane(laneId, {
      stakeholderId: stakeholderId || undefined,
      label: stakeholder ? stakeholder.role : process.lanes.find((lane) => lane.id === laneId)?.label || 'Lane',
      ownerType: stakeholder ? 'role' : process.lanes.find((lane) => lane.id === laneId)?.ownerType || 'role',
    })
  }

  const addLane = () => {
    const id = `lane-${process.lanes.length + 1}`
    onProcessChange({
      ...process,
      lanes: [...process.lanes, { id, label: `New lane ${process.lanes.length + 1}`, ownerType: 'role' }],
    })
  }

  const removeLane = (laneId: string) => {
    if (process.lanes.length <= 1) return
    const fallbackLane = process.lanes.find((lane) => lane.id !== laneId)
    if (!fallbackLane) return
    onProcessChange({
      ...process,
      lanes: process.lanes.filter((lane) => lane.id !== laneId),
      steps: process.steps.map((step) => (step.laneId === laneId ? { ...step, laneId: fallbackLane.id, y: 24 } : step)),
    })
  }

  const moveLane = (laneId: string, direction: -1 | 1) => {
    const index = process.lanes.findIndex((lane) => lane.id === laneId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= process.lanes.length) return
    const lanes = [...process.lanes]
    const [lane] = lanes.splice(index, 1)
    lanes.splice(target, 0, lane)
    onProcessChange({ ...process, lanes })
  }

  const flowHeight = Math.max(620, laneOffsetY + process.lanes.length * laneHeight + 70)

  return (
    <section className="swimlane-shell">
      <div className="section-head compact">
        <div>
          <span className="eyebrow">Interactive swimlane</span>
          <input
            className="process-name-input"
            value={process.name}
            onChange={(event) => patchProcess({ name: event.target.value })}
            aria-label="Process map name"
          />
        </div>
        <div className="toolbar">
          <button onClick={() => addStep('activity')}>Add activity</button>
          <button onClick={() => addStep('decision')}>Add decision</button>
          <button onClick={() => addStep('handoff')}>Add hand-off</button>
          <span className="toolbar-hint">Create arrows by dragging the blue dot on a card to another card.</span>
        </div>
      </div>

      <details className="lane-config">
        <summary>
          <span>Configure swimlane stakeholders and lanes</span>
          <small>Add, rename, reorder and link lanes to stakeholders.</small>
        </summary>
        <div className="lane-config-grid">
          {process.lanes.map((lane, index) => (
            <article className="lane-config-card" key={lane.id}>
              <div className="lane-card-head">
                <b>{index + 1}</b>
                <span>{lane.ownerType}</span>
              </div>
              <label>
                Lane name
                <input value={lane.label} onChange={(event) => patchLane(lane.id, { label: event.target.value })} />
              </label>
              <label>
                Link stakeholder
                <select value={lane.stakeholderId || ''} onChange={(event) => linkStakeholder(lane.id, event.target.value)}>
                  <option value="">None / custom lane</option>
                  {stakeholders.map((stakeholder) => (
                    <option key={stakeholder.id} value={stakeholder.id}>{stakeholder.role} - {stakeholder.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Lane type
                <select value={lane.ownerType} onChange={(event) => patchLane(lane.id, { ownerType: event.target.value as Lane['ownerType'] })}>
                  <option value="role">Role</option>
                  <option value="area">Area</option>
                  <option value="system">System</option>
                  <option value="external">External</option>
                </select>
              </label>
              <div className="lane-actions">
                <button onClick={() => moveLane(lane.id, -1)} disabled={index === 0}>Up</button>
                <button onClick={() => moveLane(lane.id, 1)} disabled={index === process.lanes.length - 1}>Down</button>
                <button className="danger" onClick={() => removeLane(lane.id)} disabled={process.lanes.length <= 1}>Remove</button>
              </div>
            </article>
          ))}
          <button className="add-lane-card" onClick={addLane}>Add swimlane</button>
        </div>
      </details>

      <div className="flow-wrap" style={{ height: flowHeight }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={(changes) => {
            onNodesChange(changes)
          }}
          onNodeDragStop={(_, __, nextNodes) => {
            setNodes(nextNodes)
            syncProcessFromNodes(nextNodes)
          }}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => {
            if (node.type === 'step') onSelectStep(node.id)
          }}
          zoomOnScroll={false}
          panOnScroll
          preventScrolling={false}
          fitView
          fitViewOptions={{ padding: 0.18 }}
        >
          <Panel position="top-left" className="flow-help">Drag canvas to pan. Use controls for full zoom. Drag blue dots to connect cards.</Panel>
          <Background color="#2b4773" gap={28} />
          <MiniMap pannable zoomable nodeColor="#00bedc" maskColor="rgba(0,0,40,.68)" />
          <Controls />
        </ReactFlow>
      </div>
    </section>
  )
}
