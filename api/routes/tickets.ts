import { Router, type NextFunction, type Request, type Response } from 'express'
import { getTickets as fsGetTickets, createTicket as fsCreateTicket, updateTicket as fsUpdateTicket, getComments as fsGetComments, addComment as fsAddComment, findTicket as fsFindTicket, getAudit as fsGetAudit, purgeAllTickets as fsPurgeAllTickets } from '../storage/tickets.js'
import type { TicketAuditRecord, TicketCommentRecord, TicketRecord } from '../storage/tickets.js'
import { getPool } from '../db/pool.js'
import { dbGetTickets, dbCreateTicket, dbUpdateTicket, dbGetComments, dbAddComment, dbFindTicket, dbPurgeAllTickets } from '../db/ticketsRepo.js'
import { getOrCreateDefaultBoardId, getBoards } from '../storage/boards.js'
import { findUserById } from '../storage/users.js'
import jwt from 'jsonwebtoken'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

type AuthUser = { sub: string; role?: string; email?: string; name?: string }
type AuthedRequest = Request & { user?: AuthUser }

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ success: false, error: 'Não autenticado' })
  try {
    const verified = jwt.verify(token, JWT_SECRET)
    if (typeof verified !== 'object' || verified === null) {
      return res.status(401).json({ success: false, error: 'Token inválido' })
    }
    const payload = verified as jwt.JwtPayload & Record<string, unknown>
    const sub = typeof payload.sub === 'string' ? payload.sub : ''
    if (!sub) return res.status(401).json({ success: false, error: 'Token inválido' })

    const role = typeof payload.role === 'string' ? payload.role : undefined
    const email = typeof payload.email === 'string' ? payload.email : undefined
    const name = typeof payload.name === 'string' ? payload.name : undefined

    ;(req as AuthedRequest).user = { sub, role, email, name }
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Token inválido' })
  }
}

router.post('/purge', requireAuth, async (req, res) => {
  const actor = (req as AuthedRequest).user
  if (!actor) return res.status(401).json({ success: false, error: 'Não autenticado' })
  if (actor.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Apenas administradores podem excluir todos os cards' })
  }
  const confirm = String((req.body || {}).confirm || '')
  if (confirm !== 'DELETE_ALL_TICKETS') {
    return res.status(400).json({ success: false, error: 'Confirmação inválida' })
  }
  const pool = getPool()
  try {
    let result: { deleted: number }
    let storage: 'db' | 'fs' = pool ? 'db' : 'fs'
    if (pool) {
      try {
        result = (await dbPurgeAllTickets()) as { deleted: number }
      } catch (e) {
        storage = 'fs'
        result = fsPurgeAllTickets()
        const errMsg = e instanceof Error ? e.message : String(e)
        try { console.warn('[API] POST /tickets/purge fallback fs', { error: errMsg }) } catch { void 0 }
      }
    } else {
      result = fsPurgeAllTickets()
    }
    try { console.warn('[API] POST /tickets/purge', { deleted: result.deleted ?? 0, by: actor.email, storage }) } catch { void 0 }
    res.json({ success: true, data: result, meta: { storage } })
  } catch (e) {
    console.error('Erro ao excluir todos os tickets:', e)
    const errMsg = e instanceof Error ? e.message : String(e)
    res.status(500).json({ success: false, error: 'Falha ao excluir todos os cards', details: errMsg })
  }
})

router.get('/', requireAuth, async (req, res) => {
  const boardId = typeof req.query.board_id === 'string' ? req.query.board_id : undefined
  const pool = getPool()
  let list: TicketRecord[] = []
  if (pool) {
    try {
      list = (await dbGetTickets(boardId ? String(boardId) : undefined)) as TicketRecord[]
    } catch {
      list = fsGetTickets().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      if (boardId) list = list.filter(t => t.board_id === boardId)
    }
  } else {
    list = fsGetTickets().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (boardId) list = list.filter(t => t.board_id === boardId)
  }
  try { console.info('[API] GET /tickets', { board_id: boardId, total: list.length, storage: pool ? 'db' : 'fs' }) } catch { void 0 }
  res.json({ success: true, data: list })
})

router.post('/', requireAuth, async (req, res) => {
  const data = req.body || {}
  const pool = getPool()
  let record: TicketRecord
  if (pool) {
    try {
      record = (await dbCreateTicket({ ...data, requester_id: (req as AuthedRequest).user?.sub || '' })) as TicketRecord
    } catch {
      record = fsCreateTicket({ ...data, requester_id: (req as AuthedRequest).user?.sub || '' })
    }
  } else {
    record = fsCreateTicket({ ...data, requester_id: (req as AuthedRequest).user?.sub || '' })
  }
  res.json({ success: true, data: record })
})

router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const updates = (req.body || {}) as Record<string, unknown>
  const actor = (req as AuthedRequest).user
  if (!actor) return res.status(401).json({ success: false, error: 'Não autenticado' })
  // Valida integridade dos updates
  const allowedCategories = ['Hardware', 'Software', 'Network', 'Other', 'Rede', 'Email', 'Sistema', 'Outro']
  const allowedPriorities = ['Low', 'Medium', 'High', 'Urgent']
  if (updates.category !== undefined) {
    if (typeof updates.category !== 'string' || !allowedCategories.includes(updates.category)) {
      return res.status(400).json({ success: false, error: 'Categoria inválida' })
    }
  }
  if (updates.priority !== undefined) {
    if (typeof updates.priority !== 'string' || !allowedPriorities.includes(updates.priority)) {
      return res.status(400).json({ success: false, error: 'Prioridade inválida' })
    }
  }
  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string') return res.status(400).json({ success: false, error: 'Título inválido' })
  }
  if (updates.description !== undefined) {
    if (typeof updates.description !== 'string') return res.status(400).json({ success: false, error: 'Descrição inválida' })
  }
  if (updates.assigned_to_id !== undefined) {
    if (updates.assigned_to_id !== null && typeof updates.assigned_to_id !== 'string') {
      return res.status(400).json({ success: false, error: 'assigned_to_id inválido' })
    }
    if (updates.assigned_to_id) {
      const targetUser = findUserById(String(updates.assigned_to_id))
      if (!targetUser) return res.status(400).json({ success: false, error: 'Usuário atribuído não existe' })
    }
  }
  if (updates.board_id !== undefined) {
    if (updates.board_id !== null && typeof updates.board_id !== 'string') {
      return res.status(400).json({ success: false, error: 'board_id inválido' })
    }
    if (updates.board_id) {
      const exists = getBoards().some(b => b.id === String(updates.board_id))
      if (!exists) return res.status(400).json({ success: false, error: 'Board não existe' })
    }
  }
  // Permissões: usuário comum só pode atualizar seus próprios chamados e não pode mudar status para Resolved
  // Técnico/Admin: podem atualizar status e board
  if (actor.role === 'user') {
    const ticket = fsFindTicket(id)
    if (!ticket || ticket.requester_id !== actor.sub) {
      return res.status(403).json({ success: false, error: 'Acesso negado ao chamado' })
    }
    // Bloquear alterações não permitidas por usuário comum
    const forbiddenKeys = ['status', 'board_id', 'assigned_to_id']
    const hasForbidden = Object.keys(updates).some(k => forbiddenKeys.includes(k))
    if (hasForbidden) {
      return res.status(403).json({ success: false, error: 'Usuário não pode alterar status, board ou atribuição' })
    }
  }
  // Logs detalhados para rastrear board_id/status
  try {
    console.info('[API] PUT /tickets/:id RECEBIDO', {
      id,
      updates,
      board_id_type: typeof updates.board_id,
      status_type: typeof updates.status,
    })
  } catch { void 0 }
  let before: TicketRecord | undefined
  let record: TicketRecord | undefined
  const pool = getPool()
  if (pool) {
    try {
      before = (await dbFindTicket(id)) as TicketRecord
      record = (await dbUpdateTicket(id, updates)) as TicketRecord
    } catch {
      before = fsFindTicket(id)
      record = fsUpdateTicket(id, updates)
    }
  } else {
    before = fsFindTicket(id)
    record = fsUpdateTicket(id, updates)
  }
  try {
    console.info('[API] PUT /tickets/:id RESULTADO', {
      id,
      updates,
      before_board_id: before?.board_id ?? null,
      after_board_id: record?.board_id ?? null,
      before_status: before?.status ?? null,
      after_status: record?.status ?? null,
    })
  } catch { void 0 }
  if (!record) return res.status(404).json({ success: false, error: 'Chamado não encontrado' })
  res.json({ success: true, data: record })
})

// Associação em massa de tickets a um board específico
router.post('/bulk-assign', requireAuth, (req, res) => {
  const { ticket_ids, board_id, assign_nulls } = req.body || {}
  const targetBoardId = (board_id as string) || getOrCreateDefaultBoardId('Geral')
  let ids: string[] = Array.isArray(ticket_ids) ? ticket_ids.map(String) : []
  if (assign_nulls) {
    ids = fsGetTickets().filter(t => !t.board_id).map(t => t.id)
  }
  if (!ids.length) {
    return res.json({ success: true, data: { updated: 0, target_board_id: targetBoardId } })
  }
  let updated = 0
  ids.forEach(id => {
    const rec = fsUpdateTicket(id, { board_id: targetBoardId })
    if (rec) updated++
  })
  try { console.info('[API] POST /tickets/bulk-assign', { updated, targetBoardId }) } catch { void 0 }
  res.json({ success: true, data: { updated, target_board_id: targetBoardId } })
})

router.get('/:id/comments', requireAuth, async (req, res) => {
  const { id } = req.params
  const pool = getPool()
  let list: TicketCommentRecord[] = []
  if (pool) {
    try {
      list = (await dbGetComments(id)) as TicketCommentRecord[]
    } catch {
      list = fsGetComments(id)
    }
  } else {
    list = fsGetComments(id)
  }
  res.json({ success: true, data: list })
})

router.post('/:id/comments', requireAuth, async (req, res) => {
  const { id } = req.params
  const { content } = req.body || {}
  const pool = getPool()
  let comment: TicketCommentRecord
  if (pool) {
    try {
      comment = (await dbAddComment(id, (req as AuthedRequest).user?.sub || '', content)) as TicketCommentRecord
    } catch {
      comment = fsAddComment(id, (req as AuthedRequest).user?.sub || '', content)
    }
  } else {
    comment = fsAddComment(id, (req as AuthedRequest).user?.sub || '', content)
  }
  res.json({ success: true, data: comment })
})

router.get('/audit', requireAuth, async (req, res) => {
  try {
    const ticketId = typeof req.query.ticket_id === 'string' ? req.query.ticket_id : undefined
    const list: TicketAuditRecord[] = fsGetAudit(ticketId ? String(ticketId) : undefined)
    res.json({ success: true, data: list })
  } catch (error) {
    console.error('Erro ao obter auditoria de tickets:', error)
    res.status(500).json({ success: false, error: 'Falha ao obter auditoria' })
  }
})

export default router
