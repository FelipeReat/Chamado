import { Router, type Response } from 'express'
import { 
  sendTicketCreatedNotification, 
  sendTicketUpdatedNotification, 
  sendNewCommentNotification,
  sendPasswordResetEmail 
} from '../services/email.js'

const router = Router()

const subscribers: Set<Response> = new Set()

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  try {
    // @ts-ignore
    res.flushHeaders?.()
  } catch {}
  res.write('retry: 2000\n\n')
  subscribers.add(res)
  req.on('close', () => {
    subscribers.delete(res)
    try { res.end() } catch {}
  })
})

// Mock implementations - notifications will be logged to console
router.post('/ticket-created', async (req, res) => {
  try {
    const { ticketId, assignedToId } = req.body
    console.log(`📧 Ticket created notification: Ticket ${ticketId}, Assigned to: ${assignedToId}`)
    const payload = JSON.stringify({ ticketId, assignedToId })
    subscribers.forEach((s) => {
      try {
        s.write(`event: ticket-created\n`)
        s.write(`data: ${payload}\n\n`)
      } catch {}
    })
    res.json({ success: true, message: 'Notification logged to console (email service not configured)' })
  } catch (error) {
    console.error('Error in ticket created notification:', error)
    res.status(500).json({ error: 'Notification failed' })
  }
})

router.post('/ticket-updated', async (req, res) => {
  try {
    const { ticketId, previousStatus, comment, updatedById } = req.body
    console.log(`📧 Ticket updated notification: Ticket ${ticketId}, Status changed from ${previousStatus}, Comment: ${comment}, Updated by: ${updatedById}`)
    res.json({ success: true, message: 'Notification logged to console (email service not configured)' })
  } catch (error) {
    console.error('Error in ticket updated notification:', error)
    res.status(500).json({ error: 'Notification failed' })
  }
})

router.post('/new-comment', async (req, res) => {
  try {
    const { ticketId, comment, commentedById } = req.body
    console.log(`📧 New comment notification: Ticket ${ticketId}, Comment: ${comment}, By: ${commentedById}`)
    res.json({ success: true, message: 'Notification logged to console (email service not configured)' })
  } catch (error) {
    console.error('Error in comment notification:', error)
    res.status(500).json({ error: 'Notification failed' })
  }
})

router.post('/password-reset', async (req, res) => {
  try {
    const { email, resetLink } = req.body
    console.log(`📧 Password reset email: ${email}, Link: ${resetLink}`)
    res.json({ success: true, message: 'Password reset logged to console (email service not configured)' })
  } catch (error) {
    console.error('Error in password reset notification:', error)
    res.status(500).json({ error: 'Notification failed' })
  }
})

export default router
