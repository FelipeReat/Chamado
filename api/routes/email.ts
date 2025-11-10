import { Router } from 'express'
import { sendEmail } from '../services/email.js'

const router = Router()

// Simple email sender endpoint used by frontend pages
router.post('/send-email', async (req, res) => {
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