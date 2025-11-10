import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { findUserByEmail, ensureDefaultAdmin, addUser, getUsers } from '../storage/users.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// Ensure default admin on server start
ensureDefaultAdmin().then(u => {
  console.log('Admin padrão disponível:', u.email)
}).catch(err => {
  console.error('Falha ao garantir admin padrão:', err)
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const user = findUserByEmail(email || '')
    if (!user) return res.status(401).json({ success: false, error: 'Credenciais inválidas' })

    const match = await bcrypt.compare(password || '', user.passwordHash)
    if (!match) return res.status(401).json({ success: false, error: 'Credenciais inválidas' })

    const token = jwt.sign({ sub: user.id, role: user.role, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: 'Erro no login' })
  }
})

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body || {}
    const user = await addUser({ email, password, name, role })
    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error?.message || 'Erro ao registrar' })
  }
})

router.get('/me', (req, res) => {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return res.status(401).json({ success: false, error: 'Não autenticado' })
    const payload = jwt.verify(token, JWT_SECRET) as any

    const user = getUsers().find(u => u.id === payload.sub)
    if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' })
    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (error) {
    res.status(401).json({ success: false, error: 'Token inválido' })
  }
})

export default router