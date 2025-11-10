import { Router } from 'express'
import { promises as fs } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()
const settingsPath = join(__dirname, '../../data/settings.json')

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
router.get('/settings', async (req, res) => {
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
router.put('/settings', async (req, res) => {
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
router.post('/settings/statuses', async (req, res) => {
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
router.put('/settings/statuses/:id', async (req, res) => {
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
router.delete('/settings/statuses/:id', async (req, res) => {
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
router.post('/settings/statuses/reorder', async (req, res) => {
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

// POST /api/settings/reset - Redefinir configurações padrão
router.post('/settings/reset', async (req, res) => {
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
router.get('/settings/export', async (req, res) => {
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
router.post('/settings/import', async (req, res) => {
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

export default router