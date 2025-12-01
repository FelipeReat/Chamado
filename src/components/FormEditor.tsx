import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  TextCursor,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  CheckSquare,
  FileText,
  Mail,
  Phone,
  Globe,
  DollarSign,
  Clock,
  User,
  Users,
  Building,
  MapPin,
  Eye,
  EyeOff,
  Star,
  AlertTriangle,
  Settings,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical
} from 'lucide-react'

interface FormField {
  id: string
  name: string
  label: string
  type: 'text' | 'number' | 'email' | 'phone' | 'url' | 'date' | 'datetime' | 'select' | 'multiselect' | 'checkbox' | 'textarea' | 'password' | 'currency' | 'time' | 'user' | 'department' | 'location'
  required: boolean
  order: number
  isActive: boolean
  visiblePublic?: boolean
  visibleInternal?: boolean
  readonlyPublic?: boolean
  readonlyInternal?: boolean
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
    customMessage?: string
  }
  options?: string[]
  optionsFromUsers?: boolean
  placeholder?: string
  helpText?: string
  defaultValue?: any
}

interface FormEditorProps {
  onUpdate: () => void
}

const FIELD_TYPES = [
  { value: 'text', label: 'Texto', icon: TextCursor },
  { value: 'number', label: 'Número', icon: Hash },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Telefone', icon: Phone },
  { value: 'url', label: 'URL', icon: Globe },
  { value: 'date', label: 'Data', icon: Calendar },
  { value: 'datetime', label: 'Data e Hora', icon: Calendar },
  { value: 'select', label: 'Seleção Única', icon: List },
  { value: 'multiselect', label: 'Seleção Múltipla', icon: CheckSquare },
  { value: 'checkbox', label: 'Checkbox', icon: ToggleLeft },
  { value: 'textarea', label: 'Texto Longo', icon: FileText },
]

export default function FormEditor({ onUpdate }: FormEditorProps) {
  const { user, isAdmin, isTechnician } = useAuth()
  const [fields, setFields] = useState<FormField[]>([])
  const [loading, setLoading] = useState(true)
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [draggedField, setDraggedField] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)

  useEffect(() => {
    fetchFields()
  }, [])

  const fetchFields = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/settings')
      let saved = ((response as any)?.formFields || []) as FormField[]
      const supported = new Set(FIELD_TYPES.map(t => t.value))
      saved = saved.filter(f => supported.has(f.type))
      const formOrder = Array.isArray((response as any)?.formOrder) ? (response as any).formOrder.map(String) : []
      const builtins: FormField[] = [
        { id: 'builtin:name', name: 'name', label: 'Seu nome', type: 'text', required: true, order: 0, isActive: true, visiblePublic: true, visibleInternal: false, readonlyPublic: false, readonlyInternal: true },
        { id: 'builtin:email', name: 'email', label: 'Seu email', type: 'email', required: true, order: 0, isActive: true, visiblePublic: true, visibleInternal: false, readonlyPublic: false, readonlyInternal: true },
        { id: 'builtin:title', name: 'title', label: 'Título do Chamado', type: 'text', required: true, order: 1, isActive: true, visiblePublic: true, visibleInternal: true, readonlyPublic: false, readonlyInternal: false },
        { id: 'builtin:description', name: 'description', label: 'Descrição Detalhada', type: 'textarea', required: true, order: 2, isActive: true, visiblePublic: true, visibleInternal: true, readonlyPublic: false, readonlyInternal: false },
        { id: 'builtin:category', name: 'category', label: 'Categoria', type: 'select', required: true, order: 3, isActive: true, options: ['Hardware','Software','Rede','Email','Sistema','Outro'], visiblePublic: true, visibleInternal: true, readonlyPublic: false, readonlyInternal: false },
        { id: 'builtin:priority', name: 'priority', label: 'Prioridade', type: 'select', required: true, order: 4, isActive: true, options: ['Low','Medium','High','Urgent'], visiblePublic: true, visibleInternal: true, readonlyPublic: false, readonlyInternal: false },
        { id: 'builtin:assigned_to_id', name: 'assigned_to_id', label: 'Atribuir a', type: 'select', required: false, order: 5, isActive: true, visiblePublic: false, visibleInternal: true, readonlyPublic: true, readonlyInternal: false },
      ]
      const merged: FormField[] = builtins.map(b => {
        const found = saved.find(f => f.name === b.name)
        return found ? found as any : b
      }).concat(saved.filter(f => !builtins.some(b => b.name === f.name)))
      const byId: Record<string, FormField> = {}
      merged.forEach(f => { byId[f.id] = f })
      let ordered: FormField[] = merged
      if (formOrder.length) {
        const orderSet = new Set(formOrder)
        const front = formOrder.map(id => byId[id]).filter(Boolean) as FormField[]
        const rest = merged.filter(f => !orderSet.has(f.id))
        ordered = front.concat(rest)
      } else {
        ordered = merged.sort((a, b) => (a.order || 0) - (b.order || 0))
      }
      ordered = ordered.map((f, idx) => ({ ...f, order: idx + 1 }))
      setFields(ordered)
    } catch (error) {
      console.error('Erro ao buscar campos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateField = async (fieldData: Partial<FormField>) => {
    try {
      const existing = fields.find(f => f.name === fieldData.name)
      let response
      if (existing && !String(existing.id).startsWith('builtin:')) {
        response = await apiFetch(`/settings/form-fields/${existing.id}`, {
          method: 'PUT',
          body: JSON.stringify({ user, field: fieldData })
        })
        setFields(fields.map(f => f.name === existing.name ? (response as any) : f))
      } else {
        response = await apiFetch('/settings/form-fields', {
          method: 'POST',
          body: JSON.stringify({
            user,
            field: {
              ...fieldData,
              order: fields.length + 1
            }
          })
        })
        setFields([...fields, response as any])
      }
      setIsCreating(false)
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
    } catch (error) {
      console.error('Erro ao criar campo:', error)
    }
  }

  const handleUpdateField = async (id: string, fieldData: Partial<FormField>) => {
    try {
      let response: any
      if (id.startsWith('builtin:')) {
        const targetName = id.split(':')[1]
        const existing = fields.find(f => f.name === targetName && !String(f.id).startsWith('builtin:'))
        if (existing) {
          response = await apiFetch(`/settings/form-fields/${existing.id}`, {
            method: 'PUT',
            body: JSON.stringify({ user, field: fieldData })
          })
          setFields(fields.map(f => f.name === targetName ? (response as any) : f))
        } else {
          response = await apiFetch(`/settings/form-fields`, {
            method: 'POST',
            body: JSON.stringify({ user, field: { name: targetName, ...fieldData } })
          })
          setFields(fields.map(f => f.name === targetName ? (response as any) : f))
        }
      } else {
        response = await apiFetch(`/settings/form-fields/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ user, field: fieldData })
        })
        setFields(fields.map(f => f.id === id ? (response as any) : f))
      }
      setEditingField(null)
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
    } catch (error) {
      console.error('Erro ao atualizar campo:', error)
    }
  }

  const handleDeleteField = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este campo?')) return
    try {
      const isBuiltin = String(id).startsWith('builtin:')
      if (isBuiltin) {
        const name = String(id).split(':')[1]
        const existing = fields.find(f => f.name === name && !String(f.id).startsWith('builtin:'))
        if (existing) {
          await apiFetch(`/settings/form-fields/${existing.id}`, {
            method: 'PUT',
            body: JSON.stringify({ user, field: { isActive: false } })
          })
        } else {
          await apiFetch(`/settings/form-fields`, {
            method: 'POST',
            body: JSON.stringify({ user, field: { name, isActive: false } })
          })
        }
        setFields(fields.filter(f => f.name !== name))
      } else {
        await apiFetch(`/settings/form-fields/${id}`, {
          method: 'DELETE',
          body: JSON.stringify({ user })
        })
        setFields(fields.filter(f => f.id !== id))
      }
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
    } catch (error) {
      console.error('Erro ao excluir campo:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    setDraggedField(fieldId)
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
    
    if (!draggedField) return
    
    const draggedIndex = fields.findIndex(f => f.id === draggedField)
    if (draggedIndex === -1 || draggedIndex === dropIndex) return
    
    const newFields = [...fields]
    const [draggedItem] = newFields.splice(draggedIndex, 1)
    newFields.splice(dropIndex, 0, draggedItem)
    
    // Atualizar ordem
    const reorderedFields = newFields.map((field, index) => ({
      ...field,
      order: index + 1
    }))
    
    setFields(reorderedFields)
    setDraggedField(null)
    
    // Salvar no backend
    try {
      setSavingOrder(true)
      const fieldIds = reorderedFields.map(f => f.id)
      await apiFetch('/settings/form-fields/reorder', {
        method: 'POST',
        body: JSON.stringify({ user, fieldIds })
      })
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
      try { toast.success('Ordem dos campos atualizada') } catch {}
    } catch (error) {
      console.error('Erro ao reordenar campos:', error)
      // Reverter em caso de erro
      fetchFields()
      try { toast.error('Falha ao salvar nova ordem') } catch {}
    }
    setSavingOrder(false)
  }

  const persistOrder = async (ordered: FormField[]) => {
    try {
      setSavingOrder(true)
      const fieldIds = ordered.map(f => f.id)
      await apiFetch('/settings/form-fields/reorder', { method: 'POST', body: JSON.stringify({ user, fieldIds }) })
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
      try { toast.success('Ordem atualizada') } catch {}
    } catch (error) {
      console.error('Erro ao salvar ordem:', error)
      try { toast.error('Falha ao salvar ordem') } catch {}
      fetchFields()
    }
    setSavingOrder(false)
  }

  const moveFieldUp = async (index: number) => {
    if (index <= 0) return
    const next = [...fields]
    const [item] = next.splice(index, 1)
    next.splice(index - 1, 0, item)
    setFields(next.map((f, i) => ({ ...f, order: i + 1 })))
    await persistOrder(next)
  }

  const moveFieldDown = async (index: number) => {
    if (index >= fields.length - 1) return
    const next = [...fields]
    const [item] = next.splice(index, 1)
    next.splice(index + 1, 0, item)
    setFields(next.map((f, i) => ({ ...f, order: i + 1 })))
    await persistOrder(next)
  }

  const getIconComponent = (iconName: string) => {
    const icon = FIELD_TYPES.find(t => t.value === iconName)
    return icon?.icon || TextCursor
  }

  const renderFieldPreview = (field: FormField) => {
    const IconComponent = getIconComponent(field.type)
    
    return (
      <div key={field.id} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {field.type === 'text' && (
          <input
            type="text"
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        )}
        
        {field.type === 'number' && (
          <input
            type="number"
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        )}
        
        {field.type === 'email' && (
          <input
            type="email"
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        )}
        
        {field.type === 'phone' && (
          <input
            type="tel"
            placeholder={field.placeholder || '(00) 00000-0000'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        )}
        
        {field.type === 'url' && (
          <input
            type="url"
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        )}
        
        {field.type === 'date' && (
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        )}
        
        {field.type === 'datetime' && (
          <input
            type="datetime-local"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        )}
        
        {field.type === 'select' && (
          <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <option value="">Selecione uma opção</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        )}
        
        {field.type === 'multiselect' && (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        )}
        
        {field.type === 'checkbox' && (
          <label className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Sim/Não</span>
          </label>
        )}
        
        {field.type === 'textarea' && (
          <textarea
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        )}
        
        {field.type === 'password' && (
          <input
            type="password"
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        )}
        
        {field.type === 'currency' && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">R$</span>
            </div>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              className="w-full pl-12 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        )}
        
        {field.type === 'time' && (
          <input
            type="time"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        )}
        
        {field.type === 'user' && (
          <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <option value="">Selecione um usuário</option>
            <option value="current">Usuário Atual</option>
            <option value="assignee">Responsável</option>
          </select>
        )}
        
        {field.type === 'department' && (
          <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <option value="">Selecione um departamento</option>
            <option value="tech">Tecnologia</option>
            <option value="sales">Vendas</option>
            <option value="support">Suporte</option>
          </select>
        )}
        
        {field.type === 'location' && (
          <input
            type="text"
            placeholder={field.placeholder || 'Endereço completo'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        )}
        
        {field.helpText && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{field.helpText}</p>
        )}
      </div>
    )
  }

  const FieldForm = ({ 
    field, 
    onSave, 
    onCancel 
  }: { 
    field?: FormField | null
    onSave: (data: Partial<FormField>) => void
    onCancel: () => void
  }) => {
    const [formData, setFormData] = useState({
      name: field?.name || '',
      label: field?.label || '',
      type: field?.type || 'text',
      required: field?.required ?? false,
      isActive: field?.isActive ?? true,
      placeholder: field?.placeholder || '',
      helpText: field?.helpText || '',
      options: field?.options || [],
      optionsFromUsers: field?.optionsFromUsers ?? false,
      validation: field?.validation || {},
      defaultValue: field?.defaultValue || '',
      visiblePublic: field?.visiblePublic ?? true,
      visibleInternal: field?.visibleInternal ?? true,
      readonlyPublic: field?.readonlyPublic ?? false,
      readonlyInternal: field?.readonlyInternal ?? false,
    })

    const [newOption, setNewOption] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (!formData.name.trim() || !formData.label.trim()) return
      
      onSave(formData)
    }

    const addOption = () => {
      if (newOption.trim()) {
        setFormData({
          ...formData,
          options: [...formData.options, newOption.trim()]
        })
        setNewOption('')
      }
    }

    const removeOption = (index: number) => {
      setFormData({
        ...formData,
        options: formData.options.filter((_, i) => i !== index)
      })
    }

    return (
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome do Campo (ID)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: titulo_chamado"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rótulo do Campo
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Título do Chamado"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Campo
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as FormField['type'] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FIELD_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Placeholder
            </label>
            <input
              type="text"
              value={formData.placeholder}
              onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Texto de ajuda"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Texto de Ajuda
            </label>
            <textarea
              value={formData.helpText}
              onChange={(e) => setFormData({ ...formData, helpText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Informações adicionais sobre o campo"
              rows={2}
            />
          </div>
          
          {(formData.type === 'select' || formData.type === 'multiselect') && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Opções
              </label>
              {formData.type === 'select' && (
                <div className="flex items-center mb-3 space-x-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.optionsFromUsers}
                      onChange={async (e) => {
                        const checked = e.target.checked
                        if (checked) {
                          try {
                            const resp = await apiFetch('/users')
                            const list = ((resp as any)?.data || []) as Array<{ name?: string; email?: string }>
                            const opts = list.map(u => (u.name || u.email || '')).filter(Boolean)
                            setFormData({ ...formData, optionsFromUsers: true, options: opts })
                          } catch (err) {
                            setFormData({ ...formData, optionsFromUsers: true })
                          }
                        } else {
                          setFormData({ ...formData, optionsFromUsers: false })
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Usar nomes de usuários do sistema</span>
                  </label>
                  {formData.optionsFromUsers && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const resp = await apiFetch('/users')
                          const list = ((resp as any)?.data || []) as Array<{ name?: string; email?: string }>
                          const opts = list.map(u => (u.name || u.email || '')).filter(Boolean)
                          setFormData({ ...formData, options: opts })
                        } catch {}
                      }}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    >
                      Atualizar lista
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...formData.options]
                        newOptions[index] = e.target.value
                        setFormData({ ...formData, options: newOptions })
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                    placeholder="Adicionar nova opção"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addOption}
                    className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="md:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Campo Obrigatório
                </span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Campo Ativo
                </span>
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.visibleInternal}
                  onChange={(e) => setFormData({ ...formData, visibleInternal: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mostrar no Sistema
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.visiblePublic}
                  onChange={(e) => setFormData({ ...formData, visiblePublic: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mostrar no Público
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.readonlyInternal}
                  onChange={(e) => setFormData({ ...formData, readonlyInternal: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Somente leitura no Sistema
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.readonlyPublic}
                  onChange={(e) => setFormData({ ...formData, readonlyPublic: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Somente leitura no Público
                </span>
              </label>
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

  if (!(isAdmin || isTechnician)) {
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
            Editor de Formulários
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Crie e personalize os campos do formulário de chamados
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
            {previewMode ? 'Sair Preview' : 'Pré-visualizar'}
          </button>
          
          <button
            onClick={async () => {
              try {
                setSavingOrder(true)
                await apiFetch('/settings', {
                  method: 'PUT',
                  body: JSON.stringify({ formFields: [], formOrder: [] })
                })
                await fetchFields()
                toast.success('Editor limpo. Configurações redefinidas.')
              } catch (e) {
                toast.error('Falha ao limpar o editor')
              } finally {
                setSavingOrder(false)
              }
            }}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Editor
          </button>

          <button
            onClick={() => { setIsCreating(true); setShowCreateModal(true) }}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Campo
          </button>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Novo Campo</h3>
            </div>
            <div className="px-6 py-4 max-h-[75vh] overflow-y-auto">
              <FieldForm
                field={null}
                onSave={handleCreateField}
                onCancel={() => { setIsCreating(false); setShowCreateModal(false) }}
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {previewMode ? (
            <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Pré-visualização do Formulário
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.filter(f => f.isActive).map(field => renderFieldPreview(field))}
              </div>
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Salvar Chamado
                </button>
              </div>
            </div>
          ) : (
            fields.filter(f => f.isActive).map((field, index) => (
              <div
                key={field.id}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDoubleClick={() => { setEditingField(field); setShowEditModal(true) }}
                className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${
                  dragOverIndex === index ? 'border-blue-400 dark:border-blue-500' : ''
                } transition-all duration-200`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                      <span draggable={!savingOrder} onDragStart={(e) => handleDragStart(e, field.id)} className={`inline-flex ${savingOrder ? 'opacity-50 cursor-not-allowed' : ''}`}><GripVertical className="w-5 h-5 text-gray-400" /></span>
                      
                      <div className="flex items-center space-x-2">
                        {(() => {
                          const IconComponent = getIconComponent(field.type)
                          return <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        })()}
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {field.label}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {field.name} • {FIELD_TYPES.find(t => t.value === field.type)?.label}
                            {field.required && ' • Obrigatório'}
                            {!field.isActive && ' • Inativo'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Ordem: {field.order}
                      </span>
                      <button
                        disabled={savingOrder}
                        onClick={() => moveFieldUp(index)}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        disabled={savingOrder}
                        onClick={() => moveFieldDown(index)}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => { setEditingField(field); setShowEditModal(true) }}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Editar campo"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Excluir campo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
              </div>
            ))
          )}
        </div>
      )}

      {fields.length === 0 && !loading && !previewMode && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Nenhum campo encontrado.
        </div>
      )}
      {showEditModal && editingField && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Editar Campo</h3>
            </div>
            <div className="px-6 py-4 max-h-[75vh] overflow-y-auto">
              <FieldForm
                field={editingField}
                onSave={(data) => handleUpdateField(editingField.id, data)}
                onCancel={() => { setEditingField(null); setShowEditModal(false) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
