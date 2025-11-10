import { Router } from 'express'
import { createTicket } from '../storage/tickets.js'
import { getUsers } from '../storage/users.js'

const router = Router()

// Public ticket creation (no auth)
router.post('/tickets', async (req, res) => {
  try {
    const { name, email, title, description, priority, category } = req.body || {}

    // pick a default technician (first found)
    const technicians = getUsers().filter(u => u.role === 'technician')
    const assigned = technicians.length > 0 ? technicians[0] : null

    // Append contact info to description so atendentes can see requester details
    const fullDescription = `${description || ''}\n\n---\nSolicitante: ${name || 'Anon'}${email ? ` <${email}>` : ''}`

    const record = createTicket({
      title: title || 'Sem título',
      description: fullDescription,
      category: (category as any) || 'Other',
      priority: (priority as any) || 'Medium',
      status: 'Open',
      requester_id: 'public-submission',
      assigned_to_id: assigned ? assigned.id : null,
    })

    // Fire simple notification (logs in console)
    try {
      // Call backend notification endpoint directly
      await fetch(`http://localhost:3001/api/notifications/ticket-created`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: record.id, assignedToId: assigned ? assigned.id : undefined })
      })
    } catch (err) {
      console.error('Public route: notification error', err)
    }

    res.json({ success: true, data: record })
  } catch (error) {
    console.error('Error creating public ticket:', error)
    res.status(500).json({ success: false, error: 'Falha ao criar chamado público' })
  }
})

export default router