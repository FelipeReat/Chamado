import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { 
  sendTicketCreatedNotification, 
  sendTicketUpdatedNotification, 
  sendNewCommentNotification,
  sendPasswordResetEmail 
} from '../services/email.js'
import { supabaseUrl, supabaseServiceRoleKey } from '../config/supabase.js'

// Initialize Supabase client for backend
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const router = Router()

// Send ticket created notification
router.post('/ticket-created', async (req, res) => {
  try {
    const { ticketId, assignedToId } = req.body

    // Fetch ticket and user details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        requester:requester_id (id, email, raw_user_meta_data->name)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError) throw ticketError

    let assignedTo = null
    if (assignedToId) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, raw_user_meta_data->name')
        .eq('id', assignedToId)
        .single()
      
      if (user && !userError) assignedTo = user
    }

    await sendTicketCreatedNotification({
      ticketId: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      requesterName: ticket.requester?.raw_user_meta_data?.name || ticket.requester?.email || 'Usuário',
      requesterEmail: ticket.requester?.email || '',
      assignedToName: assignedTo?.raw_user_meta_data?.name || assignedTo?.email,
      assignedToEmail: assignedTo?.email,
    })

    res.json({ success: true, message: 'Notification sent successfully' })
  } catch (error) {
    console.error('Error sending ticket created notification:', error)
    res.status(500).json({ error: 'Failed to send notification' })
  }
})

// Send ticket updated notification
router.post('/ticket-updated', async (req, res) => {
  try {
    const { ticketId, previousStatus, comment, updatedById } = req.body

    // Fetch ticket and user details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        requester:requester_id (id, email, raw_user_meta_data->name)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError) throw ticketError

    // Fetch user who updated
    const { data: updatedBy, error: updatedByError } = await supabase
      .from('users')
      .select('id, email, raw_user_meta_data->name')
      .eq('id', updatedById)
      .single()

    if (updatedByError) throw updatedByError

    await sendTicketUpdatedNotification({
      ticketId: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      requesterName: ticket.requester?.raw_user_meta_data?.name || ticket.requester?.email || 'Usuário',
      requesterEmail: ticket.requester?.email || '',
      previousStatus,
      comment,
      updatedByName: (updatedBy as any)?.raw_user_meta_data?.name || updatedBy?.email || 'Técnico',
    })

    res.json({ success: true, message: 'Notification sent successfully' })
  } catch (error) {
    console.error('Error sending ticket updated notification:', error)
    res.status(500).json({ error: 'Failed to send notification' })
  }
})

// Send new comment notification
router.post('/new-comment', async (req, res) => {
  try {
    const { ticketId, comment, commentedById } = req.body

    // Fetch ticket and user details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        requester:requester_id (id, email, raw_user_meta_data->name)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError) throw ticketError

    // Fetch user who commented
    const { data: commentedBy, error: commentedByError } = await supabase
      .from('users')
      .select('id, email, raw_user_meta_data->name')
      .eq('id', commentedById)
      .single()

    if (commentedByError) throw commentedByError

    // Fetch assigned user if exists
    let assignedTo = null
    if (ticket.assigned_to_id) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, raw_user_meta_data->name')
        .eq('id', ticket.assigned_to_id)
        .single()
      
      if (user && !userError) assignedTo = user
    }

    await sendNewCommentNotification({
      ticketId: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      requesterName: ticket.requester?.raw_user_meta_data?.name || ticket.requester?.email || 'Usuário',
      requesterEmail: ticket.requester?.email || '',
      assignedToName: assignedTo?.raw_user_meta_data?.name || assignedTo?.email,
      assignedToEmail: assignedTo?.email,
      comment,
      commentedByName: (commentedBy as any)?.raw_user_meta_data?.name || commentedBy?.email || 'Usuário',
    })

    res.json({ success: true, message: 'Notification sent successfully' })
  } catch (error) {
    console.error('Error sending comment notification:', error)
    res.status(500).json({ error: 'Failed to send notification' })
  }
})

// Send password reset email
router.post('/password-reset', async (req, res) => {
  try {
    const { email, resetLink } = req.body

    await sendPasswordResetEmail(email, resetLink)

    res.json({ success: true, message: 'Password reset email sent successfully' })
  } catch (error) {
    console.error('Error sending password reset email:', error)
    res.status(500).json({ error: 'Failed to send password reset email' })
  }
})

export default router