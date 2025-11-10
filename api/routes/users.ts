import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getUsers, addUser, findUserById, updateUser } from '../storage/users.js'

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
  const list = getUsers().map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, created_at: u.created_at }))
  res.json({ success: true, data: list })
})

router.post('/', requireAuth, async (req, res) => {
  const { email, password, name, role } = req.body || {}
  const user = await addUser({ email, password, name, role: role || 'user' })
  res.json({ success: true, data: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const updates = req.body || {}
  const user = updateUser(id, updates)
  if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' })
  res.json({ success: true, data: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

export default router