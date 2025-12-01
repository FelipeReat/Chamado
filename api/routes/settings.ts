import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { promises as fs } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()
const settingsPath = join(__dirname, '../../data/settings.json')

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

function requireConfigAccess(req, res, next) {
  const user = (req as any).user || {}
  if (user.role !== 'admin' && user.role !== 'technician') {
    return res.status(403).json({ success: false, error: 'Acesso negado: apenas administradores ou técnicos' })
  }
  next()
}

// Função para ler configurações
async function readSettings() {
  try {
    const data = await fs.readFile(settingsPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Erro ao ler configurações:', error)
    return null
  }
}

// Função para salvar configurações
async function saveSettings(settings: any) {
  try {
    settings.updatedAt = new Date().toISOString()
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2))
    return true
  } catch (error) {
    console.error('Erro ao salvar configurações:', error)
    return false
  }
}

// Função para adicionar ao histórico
function addToHistory(settings: any, action: string, user: string, details: any = {}) {
  if (!settings.history) {
    settings.history = []
  }
  
  settings.history.unshift({
    id: Date.now().toString(),
    action,
    user,
    timestamp: new Date().toISOString(),
    details
  })
  
  // Limitar histórico aos últimos 100 itens
  if (settings.history.length > 100) {
    settings.history = settings.history.slice(0, 100)
  }
}

// GET /api/settings - Obter todas as configurações
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const settings = await readSettings()
    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
    
    res.json(settings)
  } catch (error) {
    console.error('Erro ao obter configurações:', error)
    res.status(500).json({ error: 'Erro ao obter configurações' })
  }
})

// PUT /api/settings - Atualizar configurações completas
router.put('/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user } = req.body
    const currentSettings = await readSettings()
    
    if (!currentSettings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações atuais' })
    }
    
    const newSettings = { ...currentSettings, ...req.body }
    
    // Adicionar ao histórico
    addToHistory(newSettings, 'settings_updated', user?.email || 'sistema', {
      changes: Object.keys(req.body)
    })
    
    const saved = await saveSettings(newSettings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }
    
    res.json(newSettings)
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error)
    res.status(500).json({ error: 'Erro ao atualizar configurações' })
  }
})

// POST /api/settings/statuses - Criar novo status
router.post('/settings/statuses', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user, status } = req.body
    const settings = await readSettings()
    
    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
    
    // Gerar ID único
    const newStatus = {
      ...status,
      id: Date.now().toString(),
      isDefault: false,
      isActive: true
    }
    
    settings.statuses.push(newStatus)
    
    // Adicionar ao histórico
    addToHistory(settings, 'status_created', user?.email || 'sistema', {
      statusId: newStatus.id,
      statusName: newStatus.name
    })
    
    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }
    
    res.json(newStatus)
  } catch (error) {
    console.error('Erro ao criar status:', error)
    res.status(500).json({ error: 'Erro ao criar status' })
  }
})

// PUT /api/settings/statuses/:id - Atualizar status
router.put('/settings/statuses/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user, status } = req.body
    const { id } = req.params
    const settings = await readSettings()
    
    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
    
    const statusIndex = settings.statuses.findIndex((s: any) => s.id === id)
    if (statusIndex === -1) {
      return res.status(404).json({ error: 'Status não encontrado' })
    }
    
    // Não permitir alterar status padrão
    if (settings.statuses[statusIndex].isDefault) {
      return res.status(400).json({ error: 'Não é possível alterar status padrão' })
    }
    
    settings.statuses[statusIndex] = {
      ...settings.statuses[statusIndex],
      ...status
    }
    
    // Adicionar ao histórico
    addToHistory(settings, 'status_updated', user?.email || 'sistema', {
      statusId: id,
      statusName: status.name
    })
    
    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }
    
    res.json(settings.statuses[statusIndex])
  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    res.status(500).json({ error: 'Erro ao atualizar status' })
  }
})

// DELETE /api/settings/statuses/:id - Remover status
router.delete('/settings/statuses/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user } = req.body
    const { id } = req.params
    const settings = await readSettings()
    
    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
    
    const statusIndex = settings.statuses.findIndex((s: any) => s.id === id)
    if (statusIndex === -1) {
      return res.status(404).json({ error: 'Status não encontrado' })
    }
    
    // Não permitir remover status padrão
    if (settings.statuses[statusIndex].isDefault) {
      return res.status(400).json({ error: 'Não é possível remover status padrão' })
    }
    
    const removedStatus = settings.statuses.splice(statusIndex, 1)[0]
    
    // Adicionar ao histórico
    addToHistory(settings, 'status_deleted', user?.email || 'sistema', {
      statusId: id,
      statusName: removedStatus.name
    })
    
    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }
    
    res.json({ message: 'Status removido com sucesso' })
  } catch (error) {
    console.error('Erro ao remover status:', error)
    res.status(500).json({ error: 'Erro ao remover status' })
  }
})

// POST /api/settings/statuses/reorder - Reordenar status
router.post('/settings/statuses/reorder', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user, statusIds } = req.body
    const settings = await readSettings()
    
    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
    
    // Reordenar status baseado nos IDs fornecidos
    const reorderedStatuses = statusIds.map((id: string) => 
      settings.statuses.find((s: any) => s.id === id)
    ).filter(Boolean)
    
    settings.statuses = reorderedStatuses
    
    // Adicionar ao histórico
    addToHistory(settings, 'statuses_reordered', user?.email || 'sistema', {
      newOrder: statusIds
    })
    
    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }
    
    res.json(settings.statuses)
  } catch (error) {
    console.error('Erro ao reordenar status:', error)
    res.status(500).json({ error: 'Erro ao reordenar status' })
  }
})

// -------------------------
// Form Fields (Campos do Formulário)
// -------------------------

// POST /api/settings/form-fields - Criar novo campo de formulário
router.post('/settings/form-fields', requireAuth, requireConfigAccess, async (req, res) => {
  try {
    const { user, field } = req.body
    const settings = await readSettings()

    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }

    const newField = {
      id: Date.now().toString(),
      name: field?.name || field?.label || 'Novo Campo',
      label: field?.label || field?.name || 'Novo Campo',
      type: field?.type || 'text',
      required: !!field?.required,
      order: field?.order || (settings.formFields?.length || 0) + 1,
      isActive: field?.isActive ?? true,
      validation: field?.validation || {},
      options: field?.options || [],
      placeholder: field?.placeholder || '',
      helpText: field?.helpText || '',
      defaultValue: field?.defaultValue ?? null
    }

    settings.formFields = settings.formFields || []
    settings.formFields.push(newField)

    addToHistory(settings, 'form_field_created', user?.email || 'sistema', {
      fieldId: newField.id,
      fieldName: newField.name
    })

    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }

    res.json(newField)
  } catch (error) {
    console.error('Erro ao criar campo:', error)
    res.status(500).json({ error: 'Erro ao criar campo' })
  }
})

// PUT /api/settings/form-fields/:id - Atualizar campo existente
router.put('/settings/form-fields/:id', requireAuth, requireConfigAccess, async (req, res) => {
  try {
    const { user, field } = req.body
    const { id } = req.params
    const settings = await readSettings()

    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }

    const idx = (settings.formFields || []).findIndex((f: any) => f.id === id)
    if (idx === -1) {
      return res.status(404).json({ error: 'Campo não encontrado' })
    }

    settings.formFields[idx] = {
      ...settings.formFields[idx],
      ...field
    }

    addToHistory(settings, 'form_field_updated', user?.email || 'sistema', {
      fieldId: id,
      fieldName: settings.formFields[idx].name
    })

    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }

    res.json(settings.formFields[idx])
  } catch (error) {
    console.error('Erro ao atualizar campo:', error)
    res.status(500).json({ error: 'Erro ao atualizar campo' })
  }
})

// DELETE /api/settings/form-fields/:id - Remover campo
router.delete('/settings/form-fields/:id', requireAuth, requireConfigAccess, async (req, res) => {
  try {
    const { user } = req.body
    const { id } = req.params
    const settings = await readSettings()

    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }

    const idx = (settings.formFields || []).findIndex((f: any) => f.id === id)
    if (idx === -1) {
      return res.status(404).json({ error: 'Campo não encontrado' })
    }

    const removed = settings.formFields.splice(idx, 1)[0]

    addToHistory(settings, 'form_field_deleted', user?.email || 'sistema', {
      fieldId: id,
      fieldName: removed?.name
    })

    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }

    res.json({ message: 'Campo removido com sucesso' })
  } catch (error) {
    console.error('Erro ao remover campo:', error)
    res.status(500).json({ error: 'Erro ao remover campo' })
  }
})

// POST /api/settings/form-fields/reorder - Reordenar campos
router.post('/settings/form-fields/reorder', requireAuth, requireConfigAccess, async (req, res) => {
  try {
    const { user, fieldIds } = req.body
    const settings = await readSettings()

    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }

    const reordered = fieldIds.map((id: string) =>
      (settings.formFields || []).find((f: any) => f.id === id)
    ).filter(Boolean)

    settings.formFields = reordered

    // Atualizar ordem sequencial
    settings.formFields = (settings.formFields || []).map((f: any, index: number) => ({
      ...f,
      order: index + 1
    }))

    // Persistir ordem global incluindo campos builtin
    settings.formOrder = Array.isArray(fieldIds) ? fieldIds.map(String) : []
    const orderMap: Record<string, number> = {}
    settings.formOrder.forEach((id: string, idx: number) => { orderMap[id] = idx + 1 })
    settings.formFields = (settings.formFields || []).map((f: any) => ({
      ...f,
      order: typeof orderMap[f.id] === 'number' ? orderMap[f.id] : f.order
    }))

    addToHistory(settings, 'form_fields_reordered', user?.email || 'sistema', {
      newOrder: fieldIds
    })

    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }

    res.json(settings.formFields)
  } catch (error) {
    console.error('Erro ao reordenar campos:', error)
    res.status(500).json({ error: 'Erro ao reordenar campos' })
  }
})

// -------------------------
// Kanban Columns (Colunas do Kanban)
// -------------------------

// POST /api/settings/kanban-columns - Criar nova coluna Kanban
router.post('/settings/kanban-columns', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user, column } = req.body
    const settings = await readSettings()

    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }

    const newColumn = {
      id: Date.now().toString(),
      name: column?.name || 'Nova Coluna',
      statusIds: Array.isArray(column?.statusIds) ? column.statusIds : [],
      wipLimit: typeof column?.wipLimit === 'number' ? column.wipLimit : 0,
      showAssignee: column?.showAssignee ?? true,
      showDueDate: column?.showDueDate ?? true,
      showPriority: column?.showPriority ?? true,
      showTags: column?.showTags ?? false,
      showDescription: column?.showDescription ?? true,
      showCreatedDate: column?.showCreatedDate ?? false,
      showStatus: column?.showStatus ?? false,
      color: column?.color || '#fbbf24',
      icon: typeof column?.icon === 'string' ? column.icon : 'Clock',
      order: column?.order || (settings.kanbanColumns?.length || 0) + 1,
      isActive: column?.isActive ?? true,
      boardId: typeof column?.boardId === 'string' ? column.boardId : undefined
    }

    settings.kanbanColumns = settings.kanbanColumns || []
    settings.kanbanColumns.push(newColumn)

    addToHistory(settings, 'kanban_column_created', user?.email || 'sistema', {
      columnId: newColumn.id,
      columnName: newColumn.name
    })

    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }

    res.json(newColumn)
  } catch (error) {
    console.error('Erro ao criar coluna:', error)
    res.status(500).json({ error: 'Erro ao criar coluna' })
  }
})

// PUT /api/settings/kanban-columns/:id - Atualizar coluna existente
router.put('/settings/kanban-columns/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user, column } = req.body
    const { id } = req.params
    const settings = await readSettings()

    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }

    const idx = (settings.kanbanColumns || []).findIndex((c: any) => c.id === id)
    if (idx === -1) {
      return res.status(404).json({ error: 'Coluna não encontrada' })
    }

    settings.kanbanColumns[idx] = {
      ...settings.kanbanColumns[idx],
      ...column,
      boardId: typeof column?.boardId === 'string' ? column.boardId : settings.kanbanColumns[idx].boardId
    }

    addToHistory(settings, 'kanban_column_updated', user?.email || 'sistema', {
      columnId: id,
      columnName: settings.kanbanColumns[idx].name
    })

    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }

    res.json(settings.kanbanColumns[idx])
  } catch (error) {
    console.error('Erro ao atualizar coluna:', error)
    res.status(500).json({ error: 'Erro ao atualizar coluna' })
  }
})

// DELETE /api/settings/kanban-columns/:id - Remover coluna
router.delete('/settings/kanban-columns/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user } = req.body
    const { id } = req.params
    const settings = await readSettings()

    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }

    const idx = (settings.kanbanColumns || []).findIndex((c: any) => c.id === id)
    if (idx === -1) {
      return res.status(404).json({ error: 'Coluna não encontrada' })
    }

    const removed = settings.kanbanColumns.splice(idx, 1)[0]

    addToHistory(settings, 'kanban_column_deleted', user?.email || 'sistema', {
      columnId: id,
      columnName: removed?.name
    })

    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }

    res.json({ message: 'Coluna removida com sucesso' })
  } catch (error) {
    console.error('Erro ao remover coluna:', error)
    res.status(500).json({ error: 'Erro ao remover coluna' })
  }
})

// POST /api/settings/kanban-columns/reorder - Reordenar colunas
router.post('/settings/kanban-columns/reorder', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user, columnIds } = req.body
    const settings = await readSettings()

    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }

    const reordered = columnIds.map((id: string) =>
      (settings.kanbanColumns || []).find((c: any) => c.id === id)
    ).filter(Boolean)

    settings.kanbanColumns = reordered

    // Atualizar ordem sequencial
    settings.kanbanColumns = (settings.kanbanColumns || []).map((c: any, index: number) => ({
      ...c,
      order: index + 1
    }))

    addToHistory(settings, 'kanban_columns_reordered', user?.email || 'sistema', {
      newOrder: columnIds
    })

    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' })
    }

    res.json(settings.kanbanColumns)
  } catch (error) {
    console.error('Erro ao reordenar colunas:', error)
    res.status(500).json({ error: 'Erro ao reordenar colunas' })
  }
})

// POST /api/settings/reset - Redefinir configurações padrão
router.post('/settings/reset', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user } = req.body
    const settings = await readSettings()
    
    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
    
    // Criar configurações padrão
    const defaultSettings = {
      statuses: [
        {
          id: 'open',
          name: 'Aberto',
          color: '#fbbf24',
          icon: 'Circle',
          order: 1,
          isDefault: true,
          isActive: true
        },
        {
          id: 'in-progress',
          name: 'Em Andamento',
          color: '#3b82f6',
          icon: 'Clock',
          order: 2,
          isDefault: true,
          isActive: true
        },
        {
          id: 'resolved',
          name: 'Resolvido',
          color: '#10b981',
          icon: 'CheckCircle',
          order: 3,
          isDefault: true,
          isActive: true
        }
      ],
      formFields: [
        {
          id: 'title',
          name: 'Título',
          type: 'text',
          required: true,
          order: 1,
          isDefault: true,
          validation: { minLength: 5, maxLength: 200 }
        },
        {
          id: 'description',
          name: 'Descrição',
          type: 'textarea',
          required: true,
          order: 2,
          isDefault: true,
          validation: { minLength: 10, maxLength: 2000 }
        },
        {
          id: 'category',
          name: 'Categoria',
          type: 'select',
          required: true,
          order: 3,
          isDefault: true,
          options: ['Bug', 'Feature', 'Suporte', 'Outro']
        },
        {
          id: 'priority',
          name: 'Prioridade',
          type: 'select',
          required: true,
          order: 4,
          isDefault: true,
          options: ['Baixa', 'Média', 'Alta', 'Crítica']
        }
      ],
      kanbanColumns: [
        {
          id: 'open',
          statusId: 'open',
          title: 'Aberto',
          wipLimit: 10,
          showPriority: true,
          showAssignee: true,
          showDueDate: true,
          isActive: true,
          order: 1
        },
        {
          id: 'in-progress',
          statusId: 'in-progress',
          title: 'Em Andamento',
          wipLimit: 5,
          showPriority: true,
          showAssignee: true,
          showDueDate: true,
          isActive: true,
          order: 2
        },
        {
          id: 'resolved',
          statusId: 'resolved',
          title: 'Resolvido',
          wipLimit: null,
          showPriority: false,
          showAssignee: false,
          showDueDate: false,
          isActive: true,
          order: 3
        }
      ],
      permissions: settings.permissions || {},
      history: settings.history || [],
      createdAt: settings.createdAt,
      updatedAt: new Date().toISOString()
    }
    
    // Adicionar ao histórico
    addToHistory(defaultSettings, 'settings_reset', user?.email || 'sistema', {})
    
    const saved = await saveSettings(defaultSettings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações padrão' })
    }
    
    res.json(defaultSettings)
  } catch (error) {
    console.error('Erro ao redefinir configurações:', error)
    res.status(500).json({ error: 'Erro ao redefinir configurações' })
  }
})

// Exportar configurações
router.get('/settings/export', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await readSettings()
    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
    res.json(settings)
  } catch (error) {
    console.error('Erro ao exportar configurações:', error)
    res.status(500).json({ error: 'Erro ao exportar configurações' })
  }
})

// Importar configurações
router.post('/settings/import', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user, settings } = req.body
    
    if (!settings) {
      return res.status(400).json({ error: 'Configurações não fornecidas' })
    }

    // Validar estrutura básica
    if (typeof settings !== 'object') {
      return res.status(400).json({ error: 'Formato de configurações inválido' })
    }

    // Validar e limpar dados sensíveis se necessário
    const cleanedSettings = {
      statuses: settings.statuses || [],
      formFields: settings.formFields || [],
      kanbanColumns: settings.kanbanColumns || [],
      permissions: settings.permissions || {},
      history: settings.history || [],
      createdAt: settings.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Salvar configurações importadas
    const saved = await saveSettings(cleanedSettings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar configurações importadas' })
    }
    
    // Adicionar ao histórico
    addToHistory(cleanedSettings, 'settings_imported', user?.email || 'sistema', {
      source: 'arquivo externo'
    })
    
    res.json({ message: 'Configurações importadas com sucesso' })
  } catch (error) {
    console.error('Erro ao importar configurações:', error)
    res.status(500).json({ error: 'Erro ao importar configurações' })
  }
})

// -------------------------
// Departments (Departamentos globais)
// -------------------------

// GET /api/settings/departments - listar departamentos
router.get('/settings/departments', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await readSettings()
    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
    const list = Array.isArray(settings.departments) ? settings.departments : []
    res.json({ success: true, data: list })
  } catch (error) {
    console.error('Erro ao obter departamentos:', error)
    res.status(500).json({ error: 'Erro ao obter departamentos' })
  }
})

// PUT /api/settings/departments - definir lista completa
router.put('/settings/departments', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user, departments } = req.body || {}
    const settings = await readSettings()
    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
    const list = Array.isArray(departments) ? departments.map((d: any) => String(d)).filter(Boolean) : []
    settings.departments = list
    addToHistory(settings, 'departments_set', user?.email || 'sistema', { count: list.length })
    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar departamentos' })
    }
    res.json({ success: true, data: settings.departments })
  } catch (error) {
    console.error('Erro ao definir departamentos:', error)
    res.status(500).json({ error: 'Erro ao definir departamentos' })
  }
})

// POST /api/settings/departments - adicionar um departamento
router.post('/settings/departments', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user, name } = req.body || {}
    const settings = await readSettings()
    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
    const n = String(name || '').trim()
    if (!n) return res.status(400).json({ error: 'Nome inválido' })
    const list = Array.isArray(settings.departments) ? settings.departments : []
    if (!list.includes(n)) list.push(n)
    settings.departments = list
    addToHistory(settings, 'department_added', user?.email || 'sistema', { name: n })
    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar departamento' })
    }
    res.json({ success: true, data: settings.departments })
  } catch (error) {
    console.error('Erro ao adicionar departamento:', error)
    res.status(500).json({ error: 'Erro ao adicionar departamento' })
  }
})

// DELETE /api/settings/departments/:name - remover departamento
router.delete('/settings/departments/:name', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user } = req.body || {}
    const { name } = req.params
    const settings = await readSettings()
    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
    const list = Array.isArray(settings.departments) ? settings.departments : []
    const idx = list.findIndex((d: any) => String(d) === String(name))
    if (idx === -1) return res.status(404).json({ error: 'Departamento não encontrado' })
    const removed = list.splice(idx, 1)[0]
    settings.departments = list
    addToHistory(settings, 'department_removed', user?.email || 'sistema', { name: removed })
    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar departamentos' })
    }
    res.json({ success: true, data: settings.departments })
  } catch (error) {
    console.error('Erro ao remover departamento:', error)
    res.status(500).json({ error: 'Erro ao remover departamento' })
  }
})

// POST /api/settings/departments/reorder - reordenar departamentos
router.post('/settings/departments/reorder', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user, departments } = req.body || {}
    const settings = await readSettings()
    if (!settings) {
      return res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
    const current = Array.isArray(settings.departments) ? settings.departments : []
    const next = Array.isArray(departments) ? departments.map(String).filter(d => current.includes(d)) : current
    settings.departments = next
    addToHistory(settings, 'departments_reordered', user?.email || 'sistema', { newOrder: next })
    const saved = await saveSettings(settings)
    if (!saved) {
      return res.status(500).json({ error: 'Erro ao salvar departamentos' })
    }
    res.json({ success: true, data: settings.departments })
  } catch (error) {
    console.error('Erro ao reordenar departamentos:', error)
    res.status(500).json({ error: 'Erro ao reordenar departamentos' })
  }
})

export default router
