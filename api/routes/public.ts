import { Router } from 'express'
import { promises as fs } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { createTicket } from '../storage/tickets.js'
import { getOrCreateDefaultBoardId } from '../storage/boards.js'
import { getUsers } from '../storage/users.js'

const router = Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const settingsPath = join(__dirname, '../../data/settings.json')

async function readSettings() {
  try {
    const data = await fs.readFile(settingsPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Erro ao ler configurações públicas:', error)
    return null
  }
}

// Public users listing by role (limited fields)
router.get('/users', (req, res) => {
  try {
    const role = String((req.query as any)?.role || '').toLowerCase()
    const list = getUsers()
    const filtered = list.filter(u => (role ? String(u.role).toLowerCase() === role : true))
    const safe = filtered.map(u => ({ id: u.id, name: (u as any).name || '', email: u.email, role: u.role }))
    res.json({ success: true, data: safe })
  } catch (error) {
    console.error('Error listing public users:', error)
    res.status(500).json({ success: false, error: 'Falha ao listar usuários' })
  }
})

// Public settings (sanitized) for form configuration
router.get('/settings', async (req, res) => {
  try {
    const settings = await readSettings()
    if (!settings) {
      return res.status(500).json({ success: false, error: 'Falha ao carregar configurações' })
    }

    const rawFields = Array.isArray(settings.formFields) ? settings.formFields : []
    const active = rawFields
      .filter((f: any) => f.isActive !== false && f.visiblePublic !== false)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))

    const publicFormFields = active.map((f: any) => ({
      id: f.id,
      name: f.name,
      label: f.label ?? f.name,
      type: f.type || 'text',
      required: !!f.required,
      order: f.order || 0,
      isActive: f.isActive !== false,
      options: Array.isArray(f.options) ? f.options : [],
      placeholder: f.placeholder || '',
      helpText: f.helpText || '',
      defaultValue: f.defaultValue ?? null,
      validation: typeof f.validation === 'object' ? f.validation : {},
      visiblePublic: f.visiblePublic !== false,
      readonlyPublic: !!f.readonlyPublic
    }))

    res.json({ success: true, data: { formFields: publicFormFields } })
  } catch (error) {
    console.error('Erro ao obter configurações públicas:', error)
    res.status(500).json({ success: false, error: 'Falha ao obter configurações públicas' })
  }
})

// Public ticket creation (no auth)
router.post('/tickets', async (req, res) => {
  try {
    const { name, email, title, description, priority, category, custom_fields, requester_id, assigned_to_id } = req.body || {}

    // pick a default technician (first found)
    const technicians = getUsers().filter(u => u.role === 'technician')
    const assigned = technicians.length > 0 ? technicians[0] : null

    // Append contact info to description so atendentes can see requester details
    const fullDescription = `${description || ''}\n\n---\nSolicitante: ${name || 'Anon'}${email ? ` <${email}>` : ''}`

    const defaultBoardId = getOrCreateDefaultBoardId('Geral')
    const record = createTicket({
      title: title || 'Sem título',
      description: fullDescription,
      category: (category as any) || 'Other',
      priority: (priority as any) || 'Medium',
      status: 'Open',
      board_id: defaultBoardId,
      requester_id: requester_id || 'public-submission',
      assigned_to_id: assigned_to_id || (assigned ? assigned.id : null),
      custom_fields: custom_fields && typeof custom_fields === 'object' ? custom_fields : {}
    })

    // Fire simple notification (logs in console)
    try {
      // Call backend notification endpoint directly
      const port = process.env.PORT || '3004'
      await fetch(`http://localhost:${port}/api/notifications/ticket-created`, {
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
