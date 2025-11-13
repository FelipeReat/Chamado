import type { CSSProperties } from 'react'
import { normalizeStatusKey } from './kanbanMapping'

export function statusStyleFromSettings(statuses: any[], statusName: string): CSSProperties {
  const list = Array.isArray(statuses) ? statuses : []
  const targetKey = normalizeStatusKey(statusName)
  const s =
    list.find((x: any) => normalizeStatusKey(String(x.name)) === targetKey) ||
    list.find((x: any) => String(x.name).toLowerCase() === String(statusName).toLowerCase()) ||
    null
  const hex = s?.color || '#3b82f6'
  const text = pickTextColor(hex)
  return { backgroundColor: hex, color: text }
}

function pickTextColor(hex: string): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? '#111827' : '#ffffff'
}
