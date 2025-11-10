import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export interface TicketRecord {
  id: string
  title: string
  description: string
  category: 'Hardware' | 'Software' | 'Network' | 'Other'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  status: 'Open' | 'In Progress' | 'Resolved'
  requester_id: string
  assigned_to_id: string | null
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

const dataDir = path.join(process.cwd(), 'data')
const ticketsFile = path.join(dataDir, 'tickets.json')
const commentsFile = path.join(dataDir, 'ticket_comments.json')

function ensureFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, JSON.stringify([]), 'utf-8')
  if (!fs.existsSync(commentsFile)) fs.writeFileSync(commentsFile, JSON.stringify([]), 'utf-8')
}

export function getTickets(): TicketRecord[] {
  ensureFiles()
  try {
    return JSON.parse(fs.readFileSync(ticketsFile, 'utf-8'))
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

export function findTicket(id: string): TicketRecord | undefined {
  return getTickets().find(t => t.id === id)
}

export function createTicket(data: Partial<TicketRecord>): TicketRecord {
  const tickets = getTickets()
  const now = new Date().toISOString()
  const record: TicketRecord = {
    id: randomUUID(),
    title: data.title || 'Sem título',
    description: data.description || '',
    category: (data.category as any) || 'Other',
    priority: (data.priority as any) || 'Low',
    status: (data.status as any) || 'Open',
    requester_id: (data.requester_id as string) || '',
    assigned_to_id: (data.assigned_to_id as string) || null,
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
  tickets[idx] = { ...tickets[idx], ...updates, updated_at: new Date().toISOString() }
  saveTickets(tickets)
  return tickets[idx]
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