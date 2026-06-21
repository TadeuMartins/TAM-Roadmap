import pptxgen from 'pptxgenjs'
import { digitalThreadMeta } from '../core/digitalThreads'
import { formatDiscountedPayback, initiativeFinancials, projectCashflowTimeline, projectTotals } from '../core/financial'
import { initiativeBubble, initiativesByThread, threadShort } from '../core/roadmapViews'
import type { Pain, ProcessMap, Project } from '../core/types'

const NAVY = '000028'
const PANEL = '0E2A52'
const PANEL2 = '09244C'
const LINE = '2B4773'
const CYAN = '00BEDC'
const GREEN = '00D7A0'
const PETROL = '009999'
const BLUE = '0087BE'
const WHITE = 'FFFFFF'
const MUTED = 'A9BBD3'
const AMBER = 'F0A53A'
const RED = 'E5736A'
const RECT = 'rect'
const OVAL = 'ellipse'
const SHAPE_LINE = 'line'

function money(value: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

function compactMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function timelinePayback(value: number, mode: Project['timelineView']) {
  if (!Number.isFinite(value)) return '> horizon'
  return mode === 'years' ? `${(value / 12).toFixed(1)} years` : `${value.toFixed(1)} months`
}

function addTitle(slide: pptxgen.Slide, title: string, subtitle?: string) {
  slide.background = { color: NAVY }
  slide.addText(title, { x: 0.45, y: 0.35, w: 12.2, h: 0.45, fontFace: 'Segoe UI', fontSize: 21, bold: true, color: WHITE, margin: 0, fit: 'shrink' })
  slide.addShape(RECT, { x: 0.45, y: 0.95, w: 1.08, h: 0.06, fill: { color: CYAN }, line: { color: CYAN } })
  if (subtitle) slide.addText(subtitle, { x: 0.45, y: 1.13, w: 12.1, h: 0.32, fontFace: 'Segoe UI', fontSize: 10, italic: true, color: MUTED, margin: 0, fit: 'shrink' })
}

function card(slide: pptxgen.Slide, x: number, y: number, w: number, h: number, title: string, body: string, accent = CYAN) {
  slide.addShape(RECT, { x, y, w, h, fill: { color: PANEL }, line: { color: LINE, transparency: 10 } })
  slide.addShape(RECT, { x, y, w: 0.06, h, fill: { color: accent }, line: { color: accent } })
  slide.addText(title, { x: x + 0.16, y: y + 0.12, w: w - 0.28, h: 0.25, fontFace: 'Segoe UI', fontSize: 9.5, bold: true, color: WHITE, margin: 0, fit: 'shrink' })
  slide.addText(body, { x: x + 0.16, y: y + 0.42, w: w - 0.28, h: h - 0.5, fontFace: 'Segoe UI', fontSize: 8.1, color: MUTED, margin: 0, fit: 'shrink' })
}

function horizontalLine(slide: pptxgen.Slide, x1: number, y: number, x2: number, color = CYAN, width = 1.2, arrow = false) {
  if (Math.abs(x2 - x1) < 0.01) return
  const fromLeft = x2 >= x1
  slide.addShape(SHAPE_LINE, {
    x: fromLeft ? x1 : x2,
    y,
    w: Math.max(Math.abs(x2 - x1), 0.01),
    h: 0.01,
    line: { color, width, beginArrowType: arrow && !fromLeft ? 'triangle' : 'none', endArrowType: arrow && fromLeft ? 'triangle' : 'none' },
  })
}

function verticalLine(slide: pptxgen.Slide, x: number, y1: number, y2: number, color = CYAN, width = 1.2) {
  if (Math.abs(y2 - y1) < 0.01) return
  slide.addShape(SHAPE_LINE, {
    x,
    y: Math.min(y1, y2),
    w: 0.01,
    h: Math.max(Math.abs(y2 - y1), 0.01),
    line: { color, width, beginArrowType: 'none', endArrowType: 'none' },
  })
}

function connector(slide: pptxgen.Slide, x1: number, y1: number, x2: number, y2: number, color = CYAN, width = 1.2) {
  if (Math.abs(y2 - y1) < 0.05) {
    horizontalLine(slide, x1, y1, x2, color, width, true)
    return
  }
  const midX = (x1 + x2) / 2
  horizontalLine(slide, x1, y1, midX, color, width)
  verticalLine(slide, midX, y1, y2, color, width)
  horizontalLine(slide, midX, y2, x2, color, width, true)
}

function processPainCodes(stepPainIds: string[], painById: Map<string, Pain>) {
  return stepPainIds.map((painId) => painById.get(painId)?.code).filter(Boolean).join(' ')
}

function addProcessSwimlaneSlide(pptx: pptxgen, project: Project, process: ProcessMap) {
  const slide = pptx.addSlide()
  addTitle(slide, `As-Is process map | ${process.name}`, 'Process evidence captured during TAM discovery')
  const painById = new Map(project.pains.map((pain) => [pain.id, pain]))
  const laneTop = 1.55
  const laneLabelW = 1.52
  const areaX = 0.52 + laneLabelW
  const areaW = 11.9 - laneLabelW
  const laneH = Math.min(0.82, 4.7 / Math.max(process.lanes.length, 1))
  const orderedSteps = [...process.steps].sort((a, b) => a.x - b.x)
  const slotW = areaW / Math.max(orderedSteps.length, 1)
  const cardW = Math.min(1.12, Math.max(0.72, slotW - 0.08))
  const cardH = 0.42
  const stepX = new Map(orderedSteps.map((step, index) => [step.id, areaX + index * slotW + Math.max((slotW - cardW) / 2, 0.02)]))

  process.lanes.forEach((lane, index) => {
    const y = laneTop + index * laneH
    slide.addShape(RECT, { x: 0.52, y, w: laneLabelW, h: laneH, fill: { color: index % 2 ? BLUE : PANEL }, line: { color: LINE } })
    slide.addText(lane.label, { x: 0.6, y: y + 0.08, w: laneLabelW - 0.16, h: laneH - 0.12, fontSize: 7.4, bold: true, color: WHITE, align: 'center', valign: 'middle', margin: 0, fit: 'shrink' })
    slide.addShape(RECT, { x: areaX, y, w: areaW, h: laneH, fill: { color: index % 2 ? '0A2046' : '0E2A52', transparency: 5 }, line: { color: LINE, transparency: 20 } })
  })

  const boxes = new Map<string, { x: number; y: number; w: number; h: number; cy: number }>()
  orderedSteps.forEach((step) => {
    const laneIndex = Math.max(0, process.lanes.findIndex((lane) => lane.id === step.laneId))
    const x = stepX.get(step.id) || areaX
    const y = laneTop + laneIndex * laneH + laneH / 2 - cardH / 2
    boxes.set(step.id, { x, y, w: cardW, h: cardH, cy: y + cardH / 2 })
  })

  process.edges.forEach((edge) => {
    const a = boxes.get(edge.source)
    const b = boxes.get(edge.target)
    if (!a || !b) return
    const forward = b.x >= a.x
    connector(slide, forward ? a.x + a.w : a.x, a.cy, forward ? b.x : b.x + b.w, b.cy, CYAN, 0.65)
  })

  orderedSteps.forEach((step) => {
    const box = boxes.get(step.id)
    if (!box) return
    const fill = step.kind === 'decision' ? '4A3213' : step.kind === 'handoff' ? '0C2E2A' : '123059'
    const border = step.kind === 'decision' ? AMBER : step.kind === 'handoff' ? GREEN : CYAN
    slide.addShape(RECT, { x: box.x, y: box.y, w: box.w, h: box.h, fill: { color: fill }, line: { color: border, width: 1 } })
    slide.addText(step.label, { x: box.x + 0.04, y: box.y + 0.04, w: box.w - 0.08, h: 0.18, fontSize: orderedSteps.length > 9 ? 4.9 : 5.8, bold: true, color: WHITE, align: 'center', margin: 0, fit: 'shrink' })
    if (step.system) slide.addText(step.system, { x: box.x + 0.04, y: box.y + 0.25, w: box.w - 0.08, h: 0.09, fontSize: orderedSteps.length > 9 ? 4.1 : 4.8, color: MUTED, align: 'center', margin: 0, fit: 'shrink' })
    const codes = processPainCodes(step.painIds, painById)
    if (codes) slide.addText(codes, { x: box.x + 0.04, y: box.y + box.h - 0.1, w: box.w - 0.08, h: 0.08, fontSize: 4.5, bold: true, color: RED, align: 'center', margin: 0, fit: 'shrink' })
  })

  slide.addShape(RECT, { x: 0.52, y: 6.48, w: 12.25, h: 0.42, fill: { color: '0A2046' }, line: { color: LINE } })
  slide.addText('Pain badges above steps show exactly where business pain was observed in the process.', { x: 0.7, y: 6.6, w: 11.8, h: 0.16, fontSize: 7.5, italic: true, color: MUTED, margin: 0 })
}

function painSource(project: Project, pain: Pain) {
  const process = project.processes.find((candidate) => candidate.steps.some((step) => step.id === pain.stepId))
  const step = process?.steps.find((candidate) => candidate.id === pain.stepId)
  return `${process?.name || 'No process'} / ${step?.label || 'No step'}`
}

function initiativeWave(project: Project, waveId: string) {
  const wave = project.waves.find((candidate) => candidate.id === waveId)
  return wave ? `${wave.label} | ${wave.horizon}` : 'Wave TBD'
}

function threadColor(short?: string) {
  return short === 'SM' ? PETROL : short === 'SALM' ? CYAN : BLUE
}

function addStrategicThesisSlide(pptx: pptxgen, project: Project, currency: string) {
  const slide = pptx.addSlide()
  const totals = projectTotals(project)
  addTitle(slide, 'Strategic transformation thesis', 'Why these initiatives matter and how the story connects end-to-end')
  card(slide, 0.55, 1.48, 2.8, 1.0, 'Value at stake', `${money(totals.annualBenefit, currency)} annual benefit\n${formatDiscountedPayback(totals.discountedPayback)} discounted payback`, GREEN)
  card(slide, 3.55, 1.48, 2.8, 1.0, 'Discovery evidence', `${project.processes.length} process maps\n${project.pains.length} scored pains`, CYAN)
  card(slide, 6.55, 1.48, 2.8, 1.0, 'Executive focus', `${project.clusters.length} cross-process clusters\n${project.rootCauses.length} root causes`, PETROL)
  card(slide, 9.55, 1.48, 2.8, 1.0, 'Delivery vehicle', `${project.solutions.length} solutions\n${project.initiatives.length} initiatives`, BLUE)
  card(slide, 0.55, 2.92, 5.85, 1.28, 'Strategic logic', 'The roadmap is not a technology list. It starts with observable operational pains, clusters common failure patterns, confirms root causes, then maps Siemens Digital Threads to value-backed initiatives.', CYAN)
  card(slide, 6.75, 2.92, 5.85, 1.28, 'Decision logic', 'Executives can prioritize by value, implementation effort, Digital Thread concentration and wave sequencing while preserving traceability back to the original process evidence.', GREEN)
  card(slide, 0.55, 4.62, 12.05, 1.15, 'Board-level narrative', 'Move from fragmented, reactive operation to connected industrial intelligence: real-time asset and emissions visibility, governed data context, closed-loop workflows and risk-based prioritization of actions and CAPEX.', PETROL)
}

function addTraceabilitySlides(pptx: pptxgen, project: Project) {
  const clusterPages = Math.max(1, Math.ceil(project.clusters.length / 4))
  const painById = new Map(project.pains.map((pain) => [pain.id, pain]))
  const rootByClusterId = new Map(project.rootCauses.flatMap((root) => root.clusterIds.map((clusterId) => [clusterId, root])))

  for (let page = 0; page < clusterPages; page += 1) {
    const slide = pptx.addSlide()
    addTitle(slide, page === 0 ? 'Traceability map | pains to roadmap' : `Traceability map | pains to roadmap (${page + 1})`, 'Business pains and clusters connected to root causes, Siemens solutions and initiatives')
    const headers = ['Pain cluster', 'Confirmed root cause', 'Siemens solution response', 'Roadmap initiative']
    const colX = [0.55, 3.25, 6.25, 9.45]
    const colW = [2.45, 2.75, 2.95, 2.85]
    headers.forEach((header, index) => {
      slide.addShape(RECT, { x: colX[index], y: 1.42, w: colW[index], h: 0.32, fill: { color: PANEL }, line: { color: LINE } })
      slide.addText(header, { x: colX[index] + 0.08, y: 1.51, w: colW[index] - 0.16, h: 0.12, fontSize: 7.5, bold: true, color: CYAN, margin: 0 })
    })

    project.clusters.slice(page * 4, page * 4 + 4).forEach((cluster, index) => {
      const y = 1.9 + index * 1.14
      const root = rootByClusterId.get(cluster.id)
      const solutions = project.solutions.filter((solution) => root && solution.rootCauseIds.includes(root.id))
      const initiatives = project.initiatives.filter((initiative) => solutions.some((solution) => initiative.solutionIds.includes(solution.id) || solution.initiativeId === initiative.id))
      const pains = cluster.painIds.map((painId) => painById.get(painId)?.code).filter(Boolean).join(', ')
      card(slide, colX[0], y, colW[0], 0.9, `${cluster.code} ${cluster.theme}`, `Pains: ${pains}`, CYAN)
      card(slide, colX[1], y, colW[1], 0.9, root?.code || 'Root TBD', root?.statement || 'Root cause not confirmed yet.', PETROL)
      card(slide, colX[2], y, colW[2], 0.9, solutions.map((solution) => solution.code).join(', ') || 'Solution TBD', solutions.map((solution) => solution.statement).join('\n'), BLUE)
      card(slide, colX[3], y, colW[3], 0.9, initiatives.map((initiative) => initiative.code).join(', ') || 'Initiative TBD', initiatives.map((initiative) => `${initiative.name} (${initiativeWave(project, initiative.waveId)})`).join('\n'), GREEN)
      horizontalLine(slide, colX[0] + colW[0], y + 0.45, colX[1], CYAN, 0.55, true)
      horizontalLine(slide, colX[1] + colW[1], y + 0.45, colX[2], CYAN, 0.55, true)
      horizontalLine(slide, colX[2] + colW[2], y + 0.45, colX[3], CYAN, 0.55, true)
    })
  }
}

function addDigitalThreadStrategySlide(pptx: pptxgen, project: Project, currency: string) {
  const slide = pptx.addSlide()
  addTitle(slide, 'Digital Thread investment logic', 'How Siemens threads concentrate value and guide executive sequencing')
  initiativesByThread(project).forEach((group, index) => {
    const x = 0.55 + index * 4.12
    const color = threadColor(group.thread.short)
    const solutionIds = new Set(group.initiatives.flatMap((initiative) => initiative.solutionIds))
    const solutions = project.solutions.filter((solution) => solutionIds.has(solution.id))
    card(slide, x, 1.45, 3.75, 1.05, `${group.thread.short} | ${group.thread.id}`, `${money(group.annualBenefit, currency)} annual benefit\n${money(group.investment, currency)} investment`, color)
    slide.addText(group.thread.description, { x: x + 0.12, y: 2.72, w: 3.45, h: 0.48, fontSize: 7.6, color: MUTED, margin: 0, fit: 'shrink' })
    slide.addShape(RECT, { x, y: 3.45, w: 3.75, h: 1.15, fill: { color: PANEL2 }, line: { color: LINE } })
    slide.addText('Solutions', { x: x + 0.12, y: 3.58, w: 1.2, h: 0.12, fontSize: 7.5, bold: true, color: CYAN, margin: 0 })
    slide.addText(solutions.map((solution) => `${solution.code} ${solution.statement}`).join('\n') || 'No solutions yet', { x: x + 0.12, y: 3.78, w: 3.45, h: 0.58, fontSize: 6.4, color: WHITE, margin: 0, fit: 'shrink' })
    slide.addShape(RECT, { x, y: 4.9, w: 3.75, h: 1.1, fill: { color: PANEL }, line: { color: LINE } })
    slide.addText('Initiatives / waves', { x: x + 0.12, y: 5.02, w: 1.9, h: 0.12, fontSize: 7.5, bold: true, color: CYAN, margin: 0 })
    slide.addText(group.initiatives.map((initiative) => `${initiative.code} ${initiative.name} | ${initiativeWave(project, initiative.waveId)}`).join('\n') || 'No initiatives yet', { x: x + 0.12, y: 5.22, w: 3.45, h: 0.5, fontSize: 6.4, color: WHITE, margin: 0, fit: 'shrink' })
  })
}

function addInitiativeArchitectureSlide(pptx: pptxgen, project: Project) {
  const slide = pptx.addSlide()
  addTitle(slide, 'Siemens software architecture by initiative', 'Which Siemens components are used and what role each one plays')
  project.initiatives.slice(0, 6).forEach((initiative, index) => {
    const x = index % 2 === 0 ? 0.55 : 6.75
    const y = 1.42 + Math.floor(index / 2) * 1.66
    const architecture = initiative.softwareArchitecture?.length
      ? initiative.softwareArchitecture
      : initiative.siemensSolutionsRelated?.map((solution) => `${solution}: architecture role to be defined`) || []
    card(slide, x, y, 5.75, 1.28, `${initiative.code} ${initiative.name}`, architecture.join('\n'), index % 2 === 0 ? CYAN : PETROL)
  })
}

function addRoadmapMatrix(slide: pptxgen.Slide, project: Project) {
  slide.addShape(RECT, { x: 0.45, y: 1.28, w: 8.15, h: 5.35, fill: { color: PANEL2 }, line: { color: LINE } })
  slide.addShape(RECT, { x: 4.52, y: 1.28, w: 0.01, h: 5.35, fill: { color: LINE }, line: { color: LINE } })
  slide.addShape(RECT, { x: 0.45, y: 3.95, w: 8.15, h: 0.01, fill: { color: LINE }, line: { color: LINE } })
  slide.addText('PRIORITIZE (quick wins)', { x: 0.62, y: 1.42, w: 2.8, h: 0.18, fontSize: 8, bold: true, color: GREEN, margin: 0 })
  slide.addText('PLAN STRATEGICALLY', { x: 4.72, y: 1.42, w: 2.8, h: 0.18, fontSize: 8, bold: true, color: CYAN, margin: 0 })
  slide.addText('INCREMENTAL', { x: 0.62, y: 6.2, w: 2.0, h: 0.18, fontSize: 8, bold: true, color: MUTED, margin: 0 })
  slide.addText('ASSESS / PHASE', { x: 4.72, y: 6.2, w: 2.2, h: 0.18, fontSize: 8, bold: true, color: AMBER, margin: 0 })
  project.initiatives.forEach((initiative) => {
    const bubble = initiativeBubble(project, initiative)
    const thread = threadShort(project, initiative)
    const color = thread === 'SM' ? PETROL : thread === 'SALM' ? CYAN : BLUE
    const size = bubble.size / 72
    const x = 0.45 + (bubble.effort / 100) * 8.15 - size / 2
    const y = 1.28 + (1 - bubble.value / 100) * 5.35 - size / 2
    slide.addShape(OVAL, { x, y, w: size, h: size, fill: { color }, line: { color: WHITE, width: 1.2 } })
    slide.addText(initiative.code, { x, y: y + size / 2 - 0.08, w: size, h: 0.16, fontSize: 8, bold: true, color: WHITE, align: 'center', margin: 0 })
  })
}

function addPaybackTimelineSlide(pptx: pptxgen, project: Project, currency: string) {
  const slide = pptx.addSlide()
  const mode = project.timelineView || 'months'
  const totals = projectTotals(project)
  const points = projectCashflowTimeline(project)
  const maxMonth = Math.max(...points.map((point) => point.month), 1)
  const maxValue = Math.max(...points.flatMap((point) => [point.investment, point.discountedBenefit]), 1)
  const chart = { x: 0.72, y: 1.68, w: 11.45, h: 3.55 }
  const x = (month: number) => chart.x + (month / maxMonth) * chart.w
  const y = (value: number) => chart.y + chart.h - (value / maxValue) * chart.h
  const axisLabel = (month: number) => mode === 'years' ? `Y${(month / 12).toFixed(month % 12 ? 1 : 0)}` : month >= 12 ? `${Math.round(month / 12)}y` : `${month}m`
  const sampleStep = mode === 'years' ? 12 : Math.max(1, Math.ceil(maxMonth / 18))
  const chartPoints = points.filter((point) => point.month % sampleStep === 0 || point.month === maxMonth)
  const yearTicks = Array.from({ length: Math.max(2, Math.floor(maxMonth / 12) + 1) }, (_, index) => index * 12)
  if (yearTicks[yearTicks.length - 1] < maxMonth) yearTicks.push(maxMonth)
  const ticks = mode === 'years'
    ? yearTicks
    : [0, Math.round(maxMonth / 4), Math.round(maxMonth / 2), Math.round(maxMonth * 0.75), maxMonth]

  addTitle(slide, 'Investment vs. discounted gains timeline', `Configurable ${mode === 'years' ? 'annual executive' : 'monthly execution'} view with benefit-start timing included`)
  slide.addShape(RECT, { x: 0.55, y: 1.42, w: 12.18, h: 4.55, fill: { color: PANEL2 }, line: { color: LINE } })
  horizontalLine(slide, chart.x, chart.y + chart.h, chart.x + chart.w, LINE, 0.8)
  verticalLine(slide, chart.x, chart.y, chart.y + chart.h, LINE, 0.8)

  ticks.forEach((month) => {
    const tickX = x(month)
    verticalLine(slide, tickX, chart.y + chart.h, chart.y + chart.h + 0.08, MUTED, 0.5)
    slide.addText(axisLabel(month), { x: tickX - 0.18, y: chart.y + chart.h + 0.14, w: 0.42, h: 0.16, fontSize: 6.8, color: MUTED, align: 'center', margin: 0 })
  })

  ;[0, maxValue / 2, maxValue].forEach((value) => {
    const tickY = y(value)
    horizontalLine(slide, chart.x - 0.08, tickY, chart.x, MUTED, 0.5)
    slide.addText(compactMoney(value), { x: chart.x - 0.62, y: tickY - 0.08, w: 0.5, h: 0.14, fontSize: 6.5, color: MUTED, align: 'right', margin: 0 })
  })

  horizontalLine(slide, chart.x, y(totals.investment), chart.x + chart.w, AMBER, 1.4)
  chartPoints.slice(1).forEach((point, index) => {
    const previous = chartPoints[index]
    const previousX = x(previous.month)
    const currentX = x(point.month)
    const previousY = y(previous.discountedBenefit)
    const currentY = y(point.discountedBenefit)
    horizontalLine(slide, previousX, previousY, currentX, CYAN, 1.2)
    verticalLine(slide, currentX, previousY, currentY, CYAN, 1.2)
  })

  if (Number.isFinite(totals.discountedPayback)) {
    const px = x(totals.discountedPayback)
    verticalLine(slide, px, chart.y, chart.y + chart.h, WHITE, 1.0)
    slide.addShape(OVAL, { x: px - 0.055, y: y(totals.investment) - 0.055, w: 0.11, h: 0.11, fill: { color: CYAN }, line: { color: WHITE, width: 0.7 } })
  }

  card(slide, 0.72, 6.18, 2.85, 0.72, 'Investment threshold', money(totals.investment, currency), AMBER)
  card(slide, 3.85, 6.18, 3.2, 0.72, 'Discounted gains at horizon', money(points[points.length - 1]?.discountedBenefit || 0, currency), CYAN)
  card(slide, 7.35, 6.18, 2.35, 0.72, 'Discounted payback', timelinePayback(totals.discountedPayback, mode), GREEN)
  card(slide, 9.98, 6.18, 2.35, 0.72, 'View', mode === 'years' ? 'Years' : 'Months', PETROL)
}

export async function exportProjectPptx(project: Project) {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'TAM Roadmap Builder'
  pptx.subject = project.objective
  pptx.company = 'Siemens'
  pptx.theme = { headFontFace: 'Segoe UI', bodyFontFace: 'Segoe UI' }

  const totals = projectTotals(project)
  const currency = project.currency || 'BRL'

  let slide = pptx.addSlide()
  slide.background = { color: NAVY }
  slide.addText(project.name || `${project.client} Roadmap`, { x: 0.65, y: 1.42, w: 10.2, h: 0.82, fontFace: 'Segoe UI', fontSize: 32, bold: true, color: WHITE, margin: 0, fit: 'shrink' })
  slide.addText(project.objective, { x: 0.68, y: 2.43, w: 8.7, h: 0.58, fontFace: 'Segoe UI', fontSize: 13, color: MUTED, margin: 0, fit: 'shrink' })
  slide.addShape(RECT, { x: 0.68, y: 3.28, w: 2.0, h: 0.08, fill: { color: CYAN }, line: { color: CYAN } })
  slide.addText(`Industry: ${project.industry}\nHorizon: ${project.horizon}\nCurrency: ${currency}`, { x: 0.68, y: 3.68, w: 5.2, h: 0.7, fontFace: 'Segoe UI', fontSize: 11, color: WHITE, margin: 0 })

  slide = pptx.addSlide()
  addTitle(slide, 'Roadmap workflow', 'The deck follows the same MECE logic as the app')
  const steps = ['Setup', 'Stakeholders', 'Process maps', 'Pains', 'Root causes', 'Solutions', 'Initiatives', 'Financials', 'Executive roadmap']
  steps.forEach((step, index) => {
    const x = 0.55 + (index % 3) * 4.13
    const y = 1.55 + Math.floor(index / 3) * 1.18
    card(slide, x, y, 3.75, 0.78, `${index + 1}. ${step}`, index === 8 ? 'Export-ready executive story' : 'Validated before the next step unlocks', index === 8 ? GREEN : CYAN)
  })

  slide = pptx.addSlide()
  addTitle(slide, 'Executive summary', 'Validated TAM discovery narrative and quantified business case')
  card(slide, 0.55, 1.65, 2.85, 1.1, 'Investment', money(totals.investment, currency), GREEN)
  card(slide, 3.65, 1.65, 2.85, 1.1, 'Annual benefit', money(totals.annualBenefit, currency), CYAN)
  card(slide, 6.75, 1.65, 2.85, 1.1, 'Simple payback', `${totals.paybackMonths.toFixed(1)} months`, PETROL)
  card(slide, 9.85, 1.65, 2.85, 1.1, 'Discounted payback', formatDiscountedPayback(totals.discountedPayback), GREEN)
  card(slide, 0.55, 3.13, 12.15, 1.45, 'Transformation logic', 'Process evidence is linked to pains, cross-process clusters, root causes, solutions, Digital Threads, initiatives and financial returns. This avoids orphan solutions and creates an executive decision narrative.', CYAN)

  addStrategicThesisSlide(pptx, project, currency)

  slide = pptx.addSlide()
  addTitle(slide, 'Stakeholders and discovery scope')
  project.stakeholders.slice(0, 6).forEach((stakeholder, index) => {
    const x = 0.55 + (index % 3) * 4.12
    const y = 1.55 + Math.floor(index / 3) * 1.55
    card(slide, x, y, 3.75, 1.16, stakeholder.role, `${stakeholder.name}\n${stakeholder.area}\n${stakeholder.concerns.join(', ')}`, CYAN)
  })

  project.processes.forEach((process) => addProcessSwimlaneSlide(pptx, project, process))

  slide = pptx.addSlide()
  addTitle(slide, 'Pain inventory', 'Highest-scored business pains from process discovery')
  const topPains = [...project.pains].sort((a, b) => b.frequency * b.impact - a.frequency * a.impact).slice(0, 9)
  topPains.forEach((pain, index) => {
    const y = 1.45 + index * 0.52
    slide.addText(pain.code, { x: 0.6, y, w: 0.55, h: 0.2, fontSize: 9, bold: true, color: CYAN, margin: 0 })
    slide.addText(pain.statement, { x: 1.22, y, w: 7.2, h: 0.24, fontSize: 8.2, color: WHITE, margin: 0, fit: 'shrink' })
    slide.addText(painSource(project, pain), { x: 8.62, y, w: 2.8, h: 0.2, fontSize: 6.4, color: MUTED, margin: 0, fit: 'shrink' })
    slide.addText(`score ${pain.frequency * pain.impact}`, { x: 11.65, y, w: 0.85, h: 0.2, fontSize: 7, color: GREEN, bold: true, margin: 0 })
  })

  slide = pptx.addSlide()
  addTitle(slide, 'Cross-process pain clusters', 'Common pains across maintenance, emissions, ESG and executive decision processes')
  project.clusters.slice(0, 6).forEach((cluster, index) => {
    const x = index % 2 === 0 ? 0.55 : 6.75
    const y = 1.48 + Math.floor(index / 2) * 1.45
    const pains = cluster.painIds.map((painId) => project.pains.find((pain) => pain.id === painId)?.code).filter(Boolean).join(', ')
    card(slide, x, y, 5.75, 1.1, `${cluster.code} ${cluster.theme}`, `Pains: ${pains}`, index % 2 === 0 ? CYAN : PETROL)
  })

  slide = pptx.addSlide()
  addTitle(slide, 'Root cause analysis', 'MECE clusters and confirmed root causes')
  project.rootCauses.slice(0, 8).forEach((root, index) => {
    const x = index % 2 === 0 ? 0.55 : 6.75
    const y = 1.5 + Math.floor(index / 2) * 1.12
    card(slide, x, y, 5.75, 0.88, root.code, root.statement, PETROL)
  })

  addTraceabilitySlides(pptx, project)

  slide = pptx.addSlide()
  addTitle(slide, 'Solution map by Siemens Digital Thread')
  project.solutions.slice(0, 8).forEach((solution, index) => {
    const x = index % 2 === 0 ? 0.55 : 6.75
    const y = 1.42 + Math.floor(index / 2) * 1.08
    const thread = digitalThreadMeta(solution.digitalThread)
    card(slide, x, y, 5.75, 0.86, `${solution.code} | ${thread?.short || 'Thread TBD'}`, `${solution.statement}\nKPI: ${solution.proofKpi}`, thread?.short === 'SM' ? PETROL : thread?.short === 'SALM' ? CYAN : GREEN)
  })

  addDigitalThreadStrategySlide(pptx, project, currency)

  slide = pptx.addSlide()
  addTitle(slide, 'Initiatives and financial readiness', 'Initiatives become roadmap candidates only after benefits are quantified')
  project.initiatives.slice(0, 7).forEach((initiative, index) => {
    const f = initiativeFinancials(initiative)
    const y = 1.45 + index * 0.58
    slide.addText(`${initiative.code} ${initiative.name}`, { x: 0.55, y, w: 4.0, h: 0.22, fontSize: 8.2, bold: true, color: WHITE, margin: 0, fit: 'shrink' })
    slide.addText(threadShort(project, initiative), { x: 4.7, y, w: 0.65, h: 0.18, fontSize: 7, color: CYAN, bold: true, margin: 0 })
    slide.addText(money(initiative.investment, currency), { x: 5.5, y, w: 1.45, h: 0.2, fontSize: 7.5, color: MUTED, margin: 0 })
    slide.addText(money(f.annualBenefit, currency), { x: 7.1, y, w: 1.45, h: 0.2, fontSize: 7.5, color: GREEN, bold: true, margin: 0 })
    slide.addText(`${f.paybackMonths.toFixed(1)} mo`, { x: 8.8, y, w: 0.9, h: 0.2, fontSize: 7.5, color: CYAN, margin: 0 })
    slide.addText(formatDiscountedPayback(f.discountedPayback), { x: 10.05, y, w: 1.0, h: 0.2, fontSize: 7.5, color: CYAN, margin: 0 })
  })

  addInitiativeArchitectureSlide(pptx, project)

  slide = pptx.addSlide()
  addTitle(slide, 'Executive roadmap matrix', 'Value vs. implementation effort after financial quantification')
  addRoadmapMatrix(slide, project)
  slide.addShape(RECT, { x: 8.9, y: 1.28, w: 3.95, h: 5.35, fill: { color: PANEL }, line: { color: LINE } })
  slide.addText('INITIATIVES', { x: 9.1, y: 1.48, w: 2.8, h: 0.25, fontSize: 12, bold: true, color: CYAN, margin: 0 })
  project.initiatives.slice(0, 8).forEach((initiative, index) => {
    const y = 1.92 + index * 0.52
    slide.addShape(OVAL, { x: 9.1, y, w: 0.24, h: 0.24, fill: { color: CYAN }, line: { color: CYAN } })
    slide.addText(initiative.code.replace(/\D/g, '') || initiative.code, { x: 9.1, y: y + 0.04, w: 0.24, h: 0.12, fontSize: 7, bold: true, color: NAVY, margin: 0, align: 'center' })
    slide.addText(`${initiative.name}\n${threadShort(project, initiative)} · ${project.waves.find((wave) => wave.id === initiative.waveId)?.label || 'Wave TBD'}`, { x: 9.45, y: y - 0.02, w: 3.0, h: 0.36, fontSize: 7.3, bold: true, color: WHITE, margin: 0, fit: 'shrink' })
  })

  addPaybackTimelineSlide(pptx, project, currency)

  slide = pptx.addSlide()
  addTitle(slide, 'Roadmap by wave', 'Sequenced initiatives across transformation waves')
  const colW = 3.9
  project.waves.slice(0, 3).forEach((wave, waveIndex) => {
    const x = 0.55 + waveIndex * 4.18
    slide.addShape(RECT, { x, y: 1.35, w: colW, h: 0.55, fill: { color: PANEL }, line: { color: LINE } })
    slide.addText(`${wave.label}\n${wave.title}`, { x: x + 0.12, y: 1.45, w: colW - 0.24, h: 0.32, fontSize: 8.5, bold: true, color: WHITE, margin: 0, fit: 'shrink' })
    project.initiatives.filter((initiative) => initiative.waveId === wave.id).slice(0, 5).forEach((initiative, index) => {
      card(slide, x, 2.12 + index * 0.76, colW, 0.56, `${initiative.code} ${initiative.name}`, `${threadShort(project, initiative)} | ${initiative.kpis.slice(0, 2).join(', ')}`, CYAN)
    })
  })

  slide = pptx.addSlide()
  addTitle(slide, 'Roadmap by Siemens Digital Thread', 'Value concentration and initiatives by transformation thread')
  initiativesByThread(project).forEach((group, index) => {
    const x = 0.65 + index * 4.12
    card(slide, x, 1.55, 3.75, 1.15, `${group.thread.short} | ${group.thread.id}`, `${money(group.annualBenefit, currency)} annual benefit\n${group.initiatives.map((initiative) => initiative.code).join(', ') || 'No initiatives'}`, index === 0 ? GREEN : index === 1 ? PETROL : CYAN)
    slide.addText(group.thread.description, { x: x + 0.05, y: 2.9, w: 3.6, h: 0.6, fontSize: 8, color: MUTED, margin: 0, fit: 'shrink' })
  })

  slide = pptx.addSlide()
  addTitle(slide, 'Next steps')
  card(slide, 0.65, 1.7, 3.75, 1.35, '1. Validate assumptions', 'Confirm downtime cost, professional loaded cost, WACC, flaring losses and benefit capture with Finance and Operations.', CYAN)
  card(slide, 4.8, 1.7, 3.75, 1.35, '2. Select pilots', 'Pick Wave 1 initiatives with clear owners, data availability and measurable KPIs.', GREEN)
  card(slide, 8.95, 1.7, 3.75, 1.35, '3. Mobilize roadmap', 'Define governance, success metrics and executive cadence for value realization.', PETROL)

  await pptx.writeFile({ fileName: `${project.client || 'TAM'}_Siemens_Roadmap.pptx` })
}
