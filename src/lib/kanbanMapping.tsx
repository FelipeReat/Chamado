import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { BarChart3, Users, Calendar, Star, FileText, Hash, Settings, Package, Circle, Layout } from 'lucide-react'

export function normalizeStatusKey(label: string): string {
  // Map human-readable labels to backend status ids
  const key = String(label || '').trim().toLowerCase()
  if (key.includes('progress')) return 'in-progress'
  if (key.includes('resolved') || key.includes('resolvido')) return 'resolved'
  if (key.includes('open') || key.includes('aberto')) return 'open'
  // Allow custom statuses to pass through
  return key.replace(/\s+/g, '-')
}

export function statusIdToLabel(id: string): string {
  switch (id) {
    case 'open': return 'Open'
    case 'in-progress': return 'In Progress'
    case 'resolved': return 'Resolved'
    default: return id
  }
}

export function getIconForStatusId(id: string) {
  switch (id) {
    case 'open': return <Clock className="w-4 h-4" />
    case 'in-progress': return <AlertCircle className="w-4 h-4" />
    case 'resolved': return <CheckCircle className="w-4 h-4" />
    default: return <Clock className="w-4 h-4" />
  }
}

function getIconByName(name?: string) {
  const n = String(name || '').trim()
  const map: Record<string, React.ReactNode> = {
    Clock: <Clock className="w-4 h-4" />,
    AlertCircle: <AlertCircle className="w-4 h-4" />,
    CheckCircle: <CheckCircle className="w-4 h-4" />,
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
  return raw.map((c: any) => {
    const idsRaw = Array.isArray(c.statusIds) ? c.statusIds.map((s: any) => String(s)) : (c.statusId ? [String(c.statusId)] : [])
    const ids = idsRaw.map((s: string) => normalizeStatusKey(s))
    const primary = ids[0] || 'open'
    const iconOverride = getIconByName(c?.icon)
    return {
      id: String(c.id),
      title: String(c.name || c.title || ''),
      statusIds: ids,
      targetStatus: statusIdToLabel(primary),
      icon: iconOverride || getIconForStatusId(primary),
      color: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
    }
  })
}
