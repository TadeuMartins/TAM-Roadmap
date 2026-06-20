import type { DigitalThread } from './types'

export interface DigitalThreadOption {
  id: DigitalThread
  short: string
  description: string
  typicalValueLevers: string[]
}

export const digitalThreads: DigitalThreadOption[] = [
  {
    id: 'Integrated Lifecycle Management',
    short: 'ILM',
    description: 'Connects requirements, engineering, documentation, assets, changes and lifecycle governance.',
    typicalValueLevers: ['engineering rework', 'handover time', 'technical search time', 'MOC impact analysis'],
  },
  {
    id: 'Smart Manufacturing',
    short: 'SM',
    description: 'Connects operations, production, quality, energy, performance management and optimization.',
    typicalValueLevers: ['production loss', 'energy savings', 'quality losses', 'margin uplift'],
  },
  {
    id: 'Service and Asset Lifecycle Management',
    short: 'SALM',
    description: 'Connects asset health, maintenance, service execution, field workflows and reliability.',
    typicalValueLevers: ['downtime reduction', 'MTBF', 'MTTR', 'field productivity', 'spares optimization'],
  },
]

export function digitalThreadMeta(id?: DigitalThread) {
  return digitalThreads.find((thread) => thread.id === id)
}
