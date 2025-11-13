import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Palette, 
  Circle, 
  Clock, 
  CheckCircle,
  AlertCircle,
  BarChart3,
  Package,
  Users,
  Settings,
  ArrowUpDown,
  GripVertical
} from 'lucide-react'

interface Status {
  id: string
  name: string
  color: string
  icon: string
  order: number
  isDefault: boolean
  isActive: boolean
}

interface StatusManagerProps {
  onUpdate: () => void
}

const ICONS = {
  Circle,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Package,
  Users,
  Settings
}

const COLORS = [
  '#fbbf24', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6',
  '#f59e0b', '#06b6d4', '#84cc16', '#f97316', '#ec4899'
]

export default function StatusManager({ onUpdate }: StatusManagerProps) {
  const { user, isAdmin } = useAuth()
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStatus, setEditingStatus] = useState<Status | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [draggedStatus, setDraggedStatus] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchStatuses()
  }, [])

  const fetchStatuses = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/settings')
      const nextStatuses = Array.isArray((response as any)?.statuses) ? (response as any).statuses : []
      setStatuses(nextStatuses)
    } catch (error) {
      console.error('Erro ao buscar status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStatus = async (statusData: Partial<Status>) => {
    try {
      const response = await apiFetch('/settings/statuses', {
        method: 'POST',
        body: JSON.stringify({
          user,
          status: {
            ...statusData,
            order: (Array.isArray(statuses) ? statuses.length : 0) + 1
          }
        })
      })
      
      setStatuses([...(Array.isArray(statuses) ? statuses : []), response as any])
      setIsCreating(false)
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
    } catch (error) {
      console.error('Erro ao criar status:', error)
    }
  }

  const handleUpdateStatus = async (id: string, statusData: Partial<Status>) => {
    try {
      const response = await apiFetch(`/settings/statuses/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          user,
          status: statusData
        })
      })
      
      setStatuses((Array.isArray(statuses) ? statuses : []).map(s => s.id === id ? (response as any) : s))
      setEditingStatus(null)
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const handleDeleteStatus = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este status?')) return
    
    try {
      await apiFetch(`/settings/statuses/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ user })
      })
      
      setStatuses(statuses.filter(s => s.id !== id))
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
    } catch (error) {
      console.error('Erro ao excluir status:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, statusId: string) => {
    setDraggedStatus(statusId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    
    if (!draggedStatus) return
    const list = Array.isArray(statuses) ? statuses : []
    const draggedIndex = list.findIndex(s => s.id === draggedStatus)
    if (draggedIndex === -1 || draggedIndex === dropIndex) return
    
    const newStatuses = [...list]
    const [draggedItem] = newStatuses.splice(draggedIndex, 1)
    newStatuses.splice(dropIndex, 0, draggedItem)
    
    // Atualizar ordem
    const reorderedStatuses = newStatuses.map((status, index) => ({
      ...status,
      order: index + 1
    }))
    
    setStatuses(reorderedStatuses)
    setDraggedStatus(null)
    
    // Salvar no backend
    try {
      const statusIds = (Array.isArray(reorderedStatuses) ? reorderedStatuses : []).map(s => s.id)
      await apiFetch('/settings/statuses/reorder', {
        method: 'POST',
        body: JSON.stringify({ user, statusIds })
      })
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
    } catch (error) {
      console.error('Erro ao reordenar status:', error)
      // Reverter em caso de erro
      fetchStatuses()
    }
  }

  const getIconComponent = (iconName: string) => {
    const IconComponent = ICONS[iconName as keyof typeof ICONS]
    return IconComponent || Circle
  }

  const StatusForm = ({ 
    status, 
    onSave, 
    onCancel 
  }: { 
    status?: Status | null
    onSave: (data: Partial<Status>) => void
    onCancel: () => void
  }) => {
    const [formData, setFormData] = useState({
      name: status?.name || '',
      color: status?.color || COLORS[0],
      icon: status?.icon || 'Circle',
      isActive: status?.isActive ?? true
    })

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (!formData.name || !formData.name.trim()) return
      
      onSave(formData)
    }

    return (
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome do Status
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Em Desenvolvimento"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ícone
            </label>
            <select
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[
                { value: 'Circle', label: 'Círculo' },
                { value: 'Clock', label: 'Relógio' },
                { value: 'CheckCircle', label: 'Concluído' },
                { value: 'AlertCircle', label: 'Alerta' },
                { value: 'BarChart3', label: 'Gráfico' },
                { value: 'Package', label: 'Pacote' },
                { value: 'Users', label: 'Usuários' },
                { value: 'Settings', label: 'Configurações' }
              ].map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cor
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-900 dark:border-gray-100' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Selecionar cor ${color}`}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status Ativo
              </span>
            </label>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Salvar
          </button>
        </div>
      </form>
    )
  }

  if (!isAdmin) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
          <p className="text-yellow-800 dark:text-yellow-200">
            Você não tem permissão para gerenciar configurações do sistema.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Gerenciamento de Status
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Crie, edite e organize os status dos chamados
          </p>
        </div>
        
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Status
        </button>
      </div>

      {isCreating && (
        <StatusForm
          status={null}
          onSave={handleCreateStatus}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {statuses.map((status, index) => (
            <div
              key={status.id}
              draggable={!status.isDefault}
              onDragStart={(e) => handleDragStart(e, status.id)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${
                !status.isDefault ? 'cursor-move' : ''
              } ${
                dragOverIndex === index ? 'border-blue-400 dark:border-blue-500' : ''
              } transition-all duration-200`}
            >
              {editingStatus?.id === status.id ? (
                <StatusForm
                  status={status}
                  onSave={(data) => handleUpdateStatus(status.id, data)}
                  onCancel={() => setEditingStatus(null)}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {!status.isDefault && (
                      <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                    )}
                    
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const IconComponent = getIconComponent(status.icon)
                        return <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      })()}
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {status.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {status.isDefault ? 'Status padrão' : 'Status personalizado'}
                          {!status.isActive && ' • Inativo'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Ordem: {status.order}
                    </span>
                    
                    {!status.isDefault && (
                      <>
                        <button
                          onClick={() => setEditingStatus(status)}
                          className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Editar status"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteStatus(status.id)}
                          className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Excluir status"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {statuses.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Nenhum status encontrado.
        </div>
      )}
    </div>
  )
}
