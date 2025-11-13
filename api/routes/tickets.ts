import { Router } from 'express'
import { getTickets as fsGetTickets, createTicket as fsCreateTicket, updateTicket as fsUpdateTicket, getComments as fsGetComments, addComment as fsAddComment, findTicket as fsFindTicket } from '../storage/tickets.js'
import { getPool } from '../db/pool.js'
import { dbGetTickets, dbCreateTicket, dbUpdateTicket, dbGetComments, dbAddComment, dbFindTicket } from '../db/ticketsRepo.js'
import { getOrCreateDefaultBoardId, getBoards } from '../storage/boards.js'
import { findUserById } from '../storage/users.js'
import jwt from 'jsonwebtoken'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ success: false, error: 'Não autenticado' })
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    ;(req as any).user = payload
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Token inválido' })
  }
}

router.get('/', requireAuth, async (req, res) => {
  const { board_id } = req.query as any
  const pool = getPool()
  let list: any[]
  if (pool) {
    try {
      list = await dbGetTickets(board_id ? String(board_id) : undefined)
    } catch (e) {
      list = fsGetTickets().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      if (board_id) list = list.filter(t => (t as any).board_id === board_id)
    }
  } else {
    list = fsGetTickets().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (board_id) list = list.filter(t => (t as any).board_id === board_id)
  }
  try { console.info('[API] GET /tickets', { board_id, total: list.length, storage: pool ? 'db' : 'fs' }) } catch {}
  res.json({ success: true, data: list })
})

router.post('/', requireAuth, async (req, res) => {
  const data = req.body || {}
  const pool = getPool()
  let record
  if (pool) {
    try {
      record = await dbCreateTicket({ ...data, requester_id: (req as any).user.sub })
    } catch (e) {
      record = fsCreateTicket({ ...data, requester_id: (req as any).user.sub })
    }
  } else {
    record = fsCreateTicket({ ...data, requester_id: (req as any).user.sub })
  }
  res.json({ success: true, data: record })
})

router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const updates = req.body || {}
  const actor = (req as any).user || {}
  // Valida integridade dos updates
  const allowedCategories = ['Hardware', 'Software', 'Network', 'Other', 'Rede', 'Email', 'Sistema', 'Outro']
  const allowedPriorities = ['Low', 'Medium', 'High', 'Urgent']
  if (updates.category && !allowedCategories.includes(updates.category)) {
    return res.status(400).json({ success: false, error: 'Categoria inválida' })
  }
  if (updates.priority && !allowedPriorities.includes(updates.priority)) {
    return res.status(400).json({ success: false, error: 'Prioridade inválida' })
  }
  if (updates.title && typeof updates.title !== 'string') {
    return res.status(400).json({ success: false, error: 'Título inválido' })
  }
  if (updates.description && typeof updates.description !== 'string') {
    return res.status(400).json({ success: false, error: 'Descrição inválida' })
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
      board_id_type: typeof (updates as any)?.board_id,
      status_type: typeof (updates as any)?.status,
    })
  } catch {}
  let before: any
  let record: any
  const pool = getPool()
  if (pool) {
    try {
      before = await dbFindTicket(id)
      record = await dbUpdateTicket(id, updates)
    } catch (e) {
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
  } catch {}
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
  try { console.info('[API] POST /tickets/bulk-assign', { updated, targetBoardId }) } catch {}
  res.json({ success: true, data: { updated, target_board_id: targetBoardId } })
})

router.get('/:id/comments', requireAuth, async (req, res) => {
  const { id } = req.params
  const pool = getPool()
  let list: any[]
  if (pool) {
    try {
      list = await dbGetComments(id)
    } catch (e) {
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
  let comment: any
  if (pool) {
    try {
      comment = await dbAddComment(id, (req as any).user.sub, content)
    } catch (e) {
      comment = fsAddComment(id, (req as any).user.sub, content)
    }
  } else {
    comment = fsAddComment(id, (req as any).user.sub, content)
  }
  res.json({ success: true, data: comment })
})

export default router
