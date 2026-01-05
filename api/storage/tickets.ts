import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { getOrCreateDefaultBoardId } from './boards.js'

export interface TicketRecord {
  id: string
  title: string
  description: string
  category: 'Hardware' | 'Software' | 'Network' | 'Other'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  status: string
  board_id: string | null
  requester_id: string
  assigned_to_id: string | null
  custom_fields?: Record<string, any>
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface TicketCommentRecord {
  id: string
  ticket_id: string
  user_id: string
  content: string
  created_at: string
}

export interface TicketAuditRecord {
  id: string
  timestamp: string
  change: {
    status: { before: string; after: string }
    board_id: { before: string | null; after: string | null }
    assigned_to_id: { before: string | null; after: string | null }
  }
}

const dataDir = path.join(process.cwd(), 'data')
const ticketsFile = path.join(dataDir, 'tickets.json')
const commentsFile = path.join(dataDir, 'ticket_comments.json')
const auditFile = path.join(dataDir, 'ticket_audit.json')

function ensureFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, JSON.stringify([]), 'utf-8')
  if (!fs.existsSync(commentsFile)) fs.writeFileSync(commentsFile, JSON.stringify([]), 'utf-8')
  if (!fs.existsSync(auditFile)) fs.writeFileSync(auditFile, JSON.stringify([]), 'utf-8')
}

// Normaliza status mantendo valores customizados; só corrige variações conhecidas
function sanitizeStatus(input: any): string {
  const raw = String(input || '').trim().toLowerCase()
  if (!raw) return 'Open'
  if (raw === 'open' || raw.includes('abert')) return 'Open'
  if (raw.includes('progress') || raw.includes('andament')) return 'In Progress'
  if (raw.includes('resolv')) return 'Resolved'
  // fallback: mantém valor original (custom status)
  return String(input || '').trim()
}

// Normaliza categoria para enum canônico
function sanitizeCategory(input: any): 'Hardware' | 'Software' | 'Network' | 'Other' {
  const raw = String(input || '').trim().toLowerCase()
  if (!raw) return 'Other'
  if (raw.startsWith('hard')) return 'Hardware'
  if (raw.startsWith('soft')) return 'Software'
  if (raw.includes('network') || raw.includes('rede')) return 'Network'
  // "email", "sistema", "other", "outro" e demais caem em Other
  return 'Other'
}

export function getTickets(): TicketRecord[] {
  ensureFiles()
  try {
    const raw = JSON.parse(fs.readFileSync(ticketsFile, 'utf-8'))
    // Normaliza registros antigos que não têm board_id
    return (Array.isArray(raw) ? raw : []).map((t: any) => ({
      ...t,
      board_id: (t.board_id ?? null) as string | null,
      resolved_at: t.resolved_at ?? null,
      status: sanitizeStatus(t.status),
    }))
  } catch {
    return []
  }
}

export function saveTickets(tickets: TicketRecord[]) {
  ensureFiles()
  fs.writeFileSync(ticketsFile, JSON.stringify(tickets, null, 2), 'utf-8')
}

export function getComments(ticketId?: string): TicketCommentRecord[] {
  ensureFiles()
  try {
    const list: TicketCommentRecord[] = JSON.parse(fs.readFileSync(commentsFile, 'utf-8'))
    return ticketId ? list.filter(c => c.ticket_id === ticketId) : list
  } catch {
    return []
  }
}

export function saveComments(comments: TicketCommentRecord[]) {
  ensureFiles()
  fs.writeFileSync(commentsFile, JSON.stringify(comments, null, 2), 'utf-8')
}

export function getAudit(ticketId?: string): TicketAuditRecord[] {
  ensureFiles()
  try {
    const list: TicketAuditRecord[] = JSON.parse(fs.readFileSync(auditFile, 'utf-8'))
    const existingIds = new Set(getTickets().map(t => t.id))
    const filtered = (Array.isArray(list) ? list : []).filter(a => existingIds.has(a.id)).map(a => ({
      ...a,
      change: {
        ...a.change,
        status: { before: sanitizeStatus(a.change?.status?.before), after: sanitizeStatus(a.change?.status?.after) },
        board_id: { before: a.change?.board_id?.before ?? null, after: a.change?.board_id?.after ?? null },
        assigned_to_id: { before: a.change?.assigned_to_id?.before ?? null, after: a.change?.assigned_to_id?.after ?? null }
      }
    }))
    return ticketId ? filtered.filter(a => a.id === ticketId) : filtered
  } catch {
    return []
  }
}

export function findTicket(id: string): TicketRecord | undefined {
  return getTickets().find(t => t.id === id)
}

export function createTicket(data: Partial<TicketRecord>): TicketRecord {
  const tickets = getTickets()
  const now = new Date().toISOString()
  // Define board padrão quando não informado
  const defaultBoardId = getOrCreateDefaultBoardId('Geral')
  const record: TicketRecord = {
    id: randomUUID(),
    title: data.title || 'Sem título',
    description: data.description || '',
    category: sanitizeCategory((data.category as any) || 'Other'),
    priority: (data.priority as any) || 'Low',
    status: sanitizeStatus((data.status as any) || 'Open'),
    board_id: ((data.board_id as any) ?? defaultBoardId) as string,
    requester_id: (data.requester_id as string) || '',
    assigned_to_id: (data.assigned_to_id as string) || null,
    custom_fields: (data as any).custom_fields && typeof (data as any).custom_fields === 'object' ? (data as any).custom_fields : {},
    created_at: now,
    updated_at: now,
    resolved_at: null,
  }
  tickets.push(record)
  saveTickets(tickets)
  return record
}

export function updateTicket(id: string, updates: Partial<TicketRecord>): TicketRecord | undefined {
  const tickets = getTickets()
  const idx = tickets.findIndex(t => t.id === id)
  if (idx === -1) return undefined
  const before = tickets[idx]
  const next: TicketRecord = { 
    ...before, 
    ...updates, 
    category: sanitizeCategory((updates as any).category ?? before.category),
    status: sanitizeStatus((updates as any).status ?? before.status),
    custom_fields: (updates as any).custom_fields && typeof (updates as any).custom_fields === 'object' ? (updates as any).custom_fields : before.custom_fields,
    updated_at: new Date().toISOString() 
  }

  // Auditoria de movimentações e updates
  try {
    const audits = JSON.parse(fs.readFileSync(auditFile, 'utf-8'))
    const entry = {
      id,
      timestamp: new Date().toISOString(),
      change: {
        status: { before: before.status, after: next.status },
        board_id: { before: before.board_id ?? null, after: next.board_id ?? null },
        assigned_to_id: { before: before.assigned_to_id ?? null, after: next.assigned_to_id ?? null },
      }
    }
    audits.push(entry)
    fs.writeFileSync(auditFile, JSON.stringify(audits, null, 2), 'utf-8')
  } catch (e) {
    console.warn('Falha ao registrar auditoria de ticket:', e)
  }

  // Backup antes de salvar
  try {
    fs.writeFileSync(path.join(dataDir, 'tickets.backup.json'), JSON.stringify(tickets, null, 2), 'utf-8')
  } catch (e) {
    console.warn('Falha ao criar backup de tickets:', e)
  }

  // Persistência segura
  try {
    tickets[idx] = next
    saveTickets(tickets)
  } catch (e) {
    console.error('Erro ao salvar tickets, restaurando backup:', e)
    try {
      const backup = JSON.parse(fs.readFileSync(path.join(dataDir, 'tickets.backup.json'), 'utf-8'))
      saveTickets(backup)
    } catch (restoreErr) {
      console.error('Falha ao restaurar backup de tickets:', restoreErr)
    }
  }
  return next
}

export function addComment(ticketId: string, userId: string, content: string): TicketCommentRecord {
  const comments = getComments()
  const record: TicketCommentRecord = {
    id: randomUUID(),
    ticket_id: ticketId,
    user_id: userId,
    content,
    created_at: new Date().toISOString(),
  }
  comments.push(record)
  saveComments(comments)
  return record
}

export function purgeAllTickets() {
  ensureFiles()
  const deleted = getTickets().length
  saveTickets([])
  saveComments([])
  fs.writeFileSync(auditFile, JSON.stringify([], null, 2), 'utf-8')
  return { deleted }
}
