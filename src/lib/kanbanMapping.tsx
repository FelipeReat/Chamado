import { AlertCircle, CheckCircle, Clock, Archive } from 'lucide-react'
import { BarChart3, Users, Calendar, Star, FileText, Hash, Settings, Package, Circle, Layout } from 'lucide-react'

export function normalizeStatusKey(label: string): string {
  // Map human-readable labels to backend status ids
  const key = String(label || '').trim().toLowerCase()
  if (key.includes('progress') || key.includes('andament')) return 'in-progress'
  if (key.includes('resolved') || key.includes('resolvido')) return 'resolved'
  if (key.includes('open') || key.includes('aberto')) return 'open'
  if (key.includes('archiv') || key.includes('arquiv')) return 'archived'
  // Allow custom statuses to pass through
  return key.replace(/\s+/g, '-')
}

export function statusIdToLabel(id: string): string {
  switch (id) {
    case 'open': return 'Open'
    case 'in-progress': return 'In Progress'
    case 'resolved': return 'Resolved'
    case 'archived': return 'Archived'
    default: return id
  }
}

export function getIconForStatusId(id: string) {
  switch (id) {
    case 'open': return <Clock className="w-4 h-4" />
    case 'in-progress': return <AlertCircle className="w-4 h-4" />
    case 'resolved': return <CheckCircle className="w-4 h-4" />
    case 'archived': return <Archive className="w-4 h-4" />
    default: return <Clock className="w-4 h-4" />
  }
}

function getIconByName(name?: string) {
  const n = String(name || '').trim()
  const map: Record<string, React.ReactNode> = {
    Clock: <Clock className="w-4 h-4" />,
    AlertCircle: <AlertCircle className="w-4 h-4" />,
    CheckCircle: <CheckCircle className="w-4 h-4" />,
    Archive: <Archive className="w-4 h-4" />,
    BarChart3: <BarChart3 className="w-4 h-4" />,
    Users: <Users className="w-4 h-4" />,
    Calendar: <Calendar className="w-4 h-4" />,
    Star: <Star className="w-4 h-4" />,
    FileText: <FileText className="w-4 h-4" />,
    Hash: <Hash className="w-4 h-4" />,
    Settings: <Settings className="w-4 h-4" />,
    Package: <Package className="w-4 h-4" />,
    Circle: <Circle className="w-4 h-4" />,
    Layout: <Layout className="w-4 h-4" />,
  }
  return map[n] || null
}

export function deriveColumnsFromSettings(settings: any) {
  const raw = Array.isArray(settings?.kanbanColumns) ? settings.kanbanColumns : []
  const allStatuses = Array.isArray(settings?.statuses) ? settings.statuses : []
  const idToName: Record<string, string> = {}
  for (const s of allStatuses) {
    if (s && typeof s.id === 'string') {
      idToName[String(s.id)] = String(s.name || s.id)
    }
  }

  return raw.map((c: any) => {
    const idsRaw = Array.isArray(c.statusIds) ? c.statusIds.map((s: any) => String(s)) : (c.statusId ? [String(c.statusId)] : [])
    const normalizedIds = idsRaw.map((sid: string) => normalizeStatusKey(idToName[sid] || sid))
    const primaryId = idsRaw[0] || 'open'
    const primaryKey = normalizeStatusKey(idToName[primaryId] || primaryId)
    const iconOverride = getIconByName(c?.icon)
    const targetLabel = idToName[primaryId] || statusIdToLabel(primaryKey)

    return {
      id: String(c.id),
      title: String(c.name || c.title || ''),
      statusIds: normalizedIds,
      targetStatus: targetLabel,
      icon: iconOverride || getIconForStatusId(primaryKey),
      color: typeof c?.color === 'string' && c.color ? String(c.color) : (
        primaryKey === 'open' ? '#3B82F6' : primaryKey === 'in-progress' ? '#F59E0B' : primaryKey === 'resolved' ? '#10B981' : '#6B7280'
      ),
      boardId: typeof c?.boardId === 'string' && c.boardId ? String(c.boardId) : null
    }
  })
}
