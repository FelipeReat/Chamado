import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { getBoards, createBoard, updateBoard, deleteBoard } from '../storage/boards.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ success: false, error: 'Não autenticado' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    ;(req as any).user = payload
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Token inválido' })
  }
}

router.get('/', requireAuth, (req, res) => {
  const list = getBoards()
  res.json({ success: true, data: list })
})

router.post('/', requireAuth, (req, res) => {
  const data = req.body || {}
  const record = createBoard({ name: data.name, description: data.description })
  res.json({ success: true, data: record })
})

router.put('/:id', requireAuth, (req, res) => {
  const { id } = req.params
  const updates = req.body || {}
  const record = updateBoard(id, updates)
  if (!record) return res.status(404).json({ success: false, error: 'Board não encontrado' })
  res.json({ success: true, data: record })
})

router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params
  const ok = deleteBoard(id)
  if (!ok) return res.status(404).json({ success: false, error: 'Board não encontrado' })
  res.json({ success: true })
})

export default router