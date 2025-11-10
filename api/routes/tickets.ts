import { Router } from 'express'
import { getTickets, createTicket, updateTicket, getComments, addComment } from '../storage/tickets.js'
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

router.get('/', requireAuth, (req, res) => {
  const list = getTickets().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  res.json({ success: true, data: list })
})

router.post('/', requireAuth, (req, res) => {
  const data = req.body || {}
  const record = createTicket({ ...data, requester_id: (req as any).user.sub })
  res.json({ success: true, data: record })
})

router.put('/:id', requireAuth, (req, res) => {
  const { id } = req.params
  const updates = req.body || {}
  const record = updateTicket(id, updates)
  if (!record) return res.status(404).json({ success: false, error: 'Chamado não encontrado' })
  res.json({ success: true, data: record })
})

router.get('/:id/comments', requireAuth, (req, res) => {
  const { id } = req.params
  const list = getComments(id)
  res.json({ success: true, data: list })
})

router.post('/:id/comments', requireAuth, (req, res) => {
  const { id } = req.params
  const { content } = req.body || {}
  const comment = addComment(id, (req as any).user.sub, content)
  res.json({ success: true, data: comment })
})

export default router