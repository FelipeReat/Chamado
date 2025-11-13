import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { sendEmail } from '../services/email.js'

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

// Simple email sender endpoint used by frontend pages
router.post('/send-email', requireAuth, async (req, res) => {
  try {
    const { to, subject, body, text } = req.body || {}

    if (!to || !subject || (!body && !text)) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    // If SMTP isn't configured, degrade gracefully
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('SMTP not configured. Logging email instead:', { to, subject })
      return res.json({ success: true, message: 'SMTP not configured. Email logged to console.' })
    }

    await sendEmail({ to, subject, html: body, text })
    res.json({ success: true, message: 'Email sent successfully' })
  } catch (error) {
    console.error('Error sending email:', error)
    res.status(500).json({ success: false, error: 'Failed to send email' })
  }
})

export default router