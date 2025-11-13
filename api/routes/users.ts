import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getUsers, addUser, findUserById, updateUser, deleteUser } from '../storage/users.js'
import { getTickets, saveTickets } from '../storage/tickets.js'

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

function requireAdmin(req, res, next) {
  const user = (req as any).user || {}
  if (user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado: apenas administradores' })
  }
  next()
}

router.get('/', requireAuth, (req, res) => {
  const list = getUsers().map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, created_at: u.created_at }))
  res.json({ success: true, data: list })
})

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { email, password, name, role } = req.body || {}
  const user = await addUser({ email, password, name, role: role || 'user' })
  res.json({ success: true, data: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  const updates = req.body || {}
  const user = updateUser(id, updates)
  if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' })
  res.json({ success: true, data: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  const actor = (req as any).user || {}
  // Impede auto-exclusão
  if (id === actor.sub) {
    return res.status(400).json({ success: false, error: 'Você não pode excluir seu próprio usuário' })
  }
  const existing = findUserById(id)
  if (!existing) return res.status(404).json({ success: false, error: 'Usuário não encontrado' })

  const ok = deleteUser(id)
  if (!ok) return res.status(500).json({ success: false, error: 'Falha ao excluir usuário' })

  // Desatribui tickets que estavam atribuídos ao usuário excluído
  const tickets = getTickets()
  let affected = 0
  const next = tickets.map(t => {
    if (t.assigned_to_id === id) {
      affected++
      return { ...t, assigned_to_id: null }
    }
    return t
  })
  if (affected > 0) saveTickets(next)

  res.json({ success: true, data: { id }, meta: { tickets_unassigned: affected } })
})

export default router