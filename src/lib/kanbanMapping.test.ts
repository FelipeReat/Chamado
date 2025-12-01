import { describe, it, expect } from 'vitest'
import { normalizeStatusKey, statusIdToLabel, deriveColumnsFromSettings } from './kanbanMapping'

describe('kanbanMapping utils', () => {
  it('normalizeStatusKey should map labels to ids', () => {
    expect(normalizeStatusKey('Open')).toBe('open')
    expect(normalizeStatusKey('In Progress')).toBe('in-progress')
    expect(normalizeStatusKey('Resolvido')).toBe('resolved')
    expect(normalizeStatusKey('Em Andamento')).toBe('in-progress')
    expect(normalizeStatusKey('Custom Status')).toBe('custom-status')
  })

  it('statusIdToLabel should map ids to labels', () => {
    expect(statusIdToLabel('open')).toBe('Open')
    expect(statusIdToLabel('in-progress')).toBe('In Progress')
    expect(statusIdToLabel('resolved')).toBe('Resolved')
    expect(statusIdToLabel('custom')).toBe('custom')
  })

  it('deriveColumnsFromSettings should build columns from settings', () => {
    const settings = {
      kanbanColumns: [
        { id: 'open', name: 'Aberto', statusId: 'open' },
        { id: 'in-progress', name: 'Em Andamento', statusIds: ['in-progress'] },
        { id: 'resolved', name: 'Resolvido', statusIds: ['resolved'] },
      ]
    }
    const cols = deriveColumnsFromSettings(settings)
    expect(cols).toHaveLength(3)
    expect(cols[0].statusIds).toEqual(['open'])
    expect(cols[1].statusIds).toEqual(['in-progress'])
    expect(cols[2].statusIds).toEqual(['resolved'])
    expect(cols[0].targetStatus).toBe('Open')
  })
})
