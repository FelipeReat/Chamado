import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Layout,
  Eye,
  EyeOff,
  Hash,
  Settings,
  AlertTriangle,
  GripVertical,
  BarChart3,
  Users,
  Calendar,
  Clock,
  Star,
  FileText,
  CheckCircle,
  AlertCircle,
  Circle
} from 'lucide-react'

interface KanbanColumn {
  id: string
  name: string
  statusIds: string[]
  wipLimit?: number
  showAssignee: boolean
  showDueDate: boolean
  showPriority: boolean
  showTags: boolean
  showDescription: boolean
  showCreatedDate: boolean
  showStatus: boolean
  color: string
  order: number
  isActive: boolean
}

interface KanbanCustomizationProps {
  onUpdate: () => void
}

const CARD_DISPLAY_OPTIONS = [
  { key: 'showAssignee', label: 'Mostrar Responsável', icon: Users },
  { key: 'showDueDate', label: 'Mostrar Data de Vencimento', icon: Calendar },
  { key: 'showPriority', label: 'Mostrar Prioridade', icon: Star },
  { key: 'showTags', label: 'Mostrar Tags', icon: Hash },
  { key: 'showDescription', label: 'Mostrar Descrição', icon: FileText },
  { key: 'showCreatedDate', label: 'Mostrar Data de Criação', icon: Clock },
  { key: 'showStatus', label: 'Mostrar Status', icon: BarChart3 }
]

const COLORS = [
  '#fbbf24', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6',
  '#f59e0b', '#06b6d4', '#84cc16', '#f97316', '#ec4899'
]

export default function KanbanCustomization({ onUpdate }: KanbanCustomizationProps) {
  const { user, isAdmin } = useAuth()
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [availableStatuses, setAvailableStatuses] = useState<any[]>([])

  useEffect(() => {
    fetchColumns()
    fetchStatuses()
  }, [])

  const fetchColumns = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/settings')
      if (response.data) {
        setColumns(response.data.kanbanColumns || [])
      }
    } catch (error) {
      console.error('Erro ao buscar colunas:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatuses = async () => {
    try {
      const response = await apiFetch('/settings')
      if (response.data) {
        setAvailableStatuses(response.data.statuses || [])
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error)
    }
  }

  const handleCreateColumn = async (columnData: Partial<KanbanColumn>) => {
    try {
      const response = await apiFetch('/settings/kanban-columns', {
        method: 'POST',
        body: JSON.stringify({
          user,
          column: {
            ...columnData,
            order: columns.length + 1,
            color: columnData.color || COLORS[0]
          }
        })
      })
      
      if (response.data) {
        setColumns([...columns, response.data])
        setIsCreating(false)
        onUpdate()
      }
    } catch (error) {
      console.error('Erro ao criar coluna:', error)
    }
  }

  const handleUpdateColumn = async (id: string, columnData: Partial<KanbanColumn>) => {
    try {
      const response = await apiFetch(`/settings/kanban-columns/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          user,
          column: columnData
        })
      })
      
      if (response.data) {
        setColumns(columns.map(c => c.id === id ? response.data : c))
        setEditingColumn(null)
        onUpdate()
      }
    } catch (error) {
      console.error('Erro ao atualizar coluna:', error)
    }
  }

  const handleDeleteColumn = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta coluna?')) return
    
    try {
      await apiFetch(`/settings/kanban-columns/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ user })
      })
      
      setColumns(columns.filter(c => c.id !== id))
      onUpdate()
    } catch (error) {
      console.error('Erro ao excluir coluna:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
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
    
    if (!draggedColumn) return
    
    const draggedIndex = columns.findIndex(c => c.id === draggedColumn)
    if (draggedIndex === -1 || draggedIndex === dropIndex) return
    
    const newColumns = [...columns]
    const [draggedItem] = newColumns.splice(draggedIndex, 1)
    newColumns.splice(dropIndex, 0, draggedItem)
    
    // Atualizar ordem
    const reorderedColumns = newColumns.map((column, index) => ({
      ...column,
      order: index + 1
    }))
    
    setColumns(reorderedColumns)
    setDraggedColumn(null)
    
    // Salvar no backend
    try {
      const columnIds = reorderedColumns.map(c => c.id)
      await apiFetch('/settings/kanban-columns/reorder', {
        method: 'POST',
        body: JSON.stringify({ user, columnIds })
      })
      onUpdate()
    } catch (error) {
      console.error('Erro ao reordenar colunas:', error)
      // Reverter em caso de erro
      fetchColumns()
    }
  }

  const renderCardPreview = () => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex justify-between items-start mb-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            #123 - Exemplo de Chamado
          </h4>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Média</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Este é um exemplo de descrição do chamado para demonstrar como as informações serão exibidas no card.
        </p>
        
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">JD</span>
            </div>
            <span>João Silva</span>
          </div>
          <span>15/12/2023</span>
        </div>
      </div>
    )
  }

  const ColumnForm = ({ 
    column, 
    onSave, 
    onCancel 
  }: { 
    column?: KanbanColumn | null
    onSave: (data: Partial<KanbanColumn>) => void
    onCancel: () => void
  }) => {
    const [formData, setFormData] = useState({
      name: column?.name || '',
      wipLimit: column?.wipLimit || 0,
      color: column?.color || COLORS[0],
      isActive: column?.isActive ?? true,
      statusIds: column?.statusIds || [],
      showAssignee: column?.showAssignee ?? true,
      showDueDate: column?.showDueDate ?? true,
      showPriority: column?.showPriority ?? true,
      showTags: column?.showTags ?? false,
      showDescription: column?.showDescription ?? true,
      showCreatedDate: column?.showCreatedDate ?? false,
      showStatus: column?.showStatus ?? false
    })

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (!formData.name.trim()) return
      
      onSave(formData)
    }

    return (
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome da Coluna
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: A Fazer"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Limite WIP (0 = sem limite)
            </label>
            <input
              type="number"
              min="0"
              value={formData.wipLimit}
              onChange={(e) => setFormData({ ...formData, wipLimit: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: 5"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cor da Coluna
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
                Coluna Ativa
              </span>
            </label>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status Associados
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableStatuses.map(status => (
                <label key={status.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.statusIds.includes(status.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, statusIds: [...formData.statusIds, status.id] })
                      } else {
                        setFormData({ ...formData, statusIds: formData.statusIds.filter(id => id !== status.id) })
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{status.name}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Informações no Card
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CARD_DISPLAY_OPTIONS.map(option => (
                <label key={option.key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData[option.key as keyof typeof formData] as boolean}
                    onChange={(e) => setFormData({ ...formData, [option.key]: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
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
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
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
            Customização do Kanban
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure as colunas e aparência do quadro Kanban
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              previewMode 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {previewMode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {previewMode ? 'Sair Preview' : 'Pré-visualizar Card'}
          </button>
          
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Coluna
          </button>
        </div>
      </div>

      {previewMode && (
        <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Pré-visualização do Card
          </h4>
          {renderCardPreview()}
        </div>
      )}

      {isCreating && (
        <ColumnForm
          column={null}
          onSave={handleCreateColumn}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {columns.map((column, index) => (
            <div
              key={column.id}
              draggable
              onDragStart={(e) => handleDragStart(e, column.id)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-move ${
                dragOverIndex === index ? 'border-blue-400 dark:border-blue-500' : ''
              } transition-all duration-200`}
            >
              {editingColumn?.id === column.id ? (
                <ColumnForm
                  column={column}
                  onSave={(data) => handleUpdateColumn(column.id, data)}
                  onCancel={() => setEditingColumn(null)}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                    
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {column.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {column.statusIds.length} status • WIP: {column.wipLimit || '∞'}
                        {!column.isActive && ' • Inativo'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {CARD_DISPLAY_OPTIONS.map(option => {
                          if (!(column[option.key as keyof KanbanColumn] as boolean)) return null
                          const IconComponent = option.icon
                          return (
                            <span key={option.key} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              <IconComponent className="w-3 h-3 mr-1" />
                              {option.label.split(' ')[1]}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Ordem: {column.order}
                    </span>
                    
                    <button
                      onClick={() => setEditingColumn(column)}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Editar coluna"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteColumn(column.id)}
                      className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Excluir coluna"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {columns.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Nenhuma coluna encontrada.
        </div>
      )}
    </div>
  )
}