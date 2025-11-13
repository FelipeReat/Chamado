import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'
import { sendTicketCreatedNotification } from '../utils/notifications'
import { Send, User, Tag, AlertTriangle, Info, CheckCircle } from 'lucide-react'

export default function NewTicket() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [technicians, setTechnicians] = useState<any[]>([])
  const [usersBasic, setUsersBasic] = useState<any[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Hardware',
    priority: 'Medium',
    assigned_to_id: ''
  })
  const [dynamicFields, setDynamicFields] = useState<any[]>([])
  const [customValues, setCustomValues] = useState<Record<string, any>>({})
  const [fieldConfigs, setFieldConfigs] = useState<Record<string, any>>({})

  const defaultCategories = ['Hardware','Software','Rede','Email','Sistema','Outro']

  const defaultPriorities = [
    { value: 'Low', label: 'Baixa', icon: Info, color: 'text-green-600' },
    { value: 'Medium', label: 'Média', icon: Info, color: 'text-yellow-600' },
    { value: 'High', label: 'Alta', icon: AlertTriangle, color: 'text-orange-600' },
    { value: 'Urgent', label: 'Urgente', icon: AlertTriangle, color: 'text-red-600' }
  ]

  useEffect(() => {
    fetchTechnicians()
    ;(async () => {
      try {
        const settings = await apiFetch('/settings')
        const fields = (settings as any)?.formFields || []
        const activeRaw = fields.filter((f: any) => f.isActive).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        const byName: Record<string, any> = {}
        activeRaw.forEach((f: any) => { byName[f.name] = f })
        const active = Object.values(byName)
        setDynamicFields(active)
        const cfg: Record<string, any> = {}
        active.forEach((f: any) => { cfg[f.name] = f })
        setFieldConfigs(cfg)
      } catch {}
    })()
  }, [])

  const fetchTechnicians = async () => {
    try {
      const resp = await apiFetch('/users')
      const dataAll = resp.data || []
      setTechnicians(dataAll.filter((u: any) => u.role === 'technician'))
      setUsersBasic(dataAll.filter((u: any) => u.role === 'user'))
    } catch (error) {
      console.error('Error fetching technicians:', error)
      toast.error('Erro ao carregar técnicos')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let currentBoardId: string | null = null
      try { currentBoardId = localStorage.getItem('current_board_id') || null } catch {}
      const resp = await apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          status: 'Open',
          assigned_to_id: formData.assigned_to_id || null,
          board_id: currentBoardId
          , custom_fields: customValues
        })
      })
      const data = resp.data

      // Send notification
      if (formData.assigned_to_id) {
        await sendTicketCreatedNotification({
          ticketId: data.id,
          assignedToId: formData.assigned_to_id
        })
      }

      toast.success('Chamado criado com sucesso!')
      
      navigate('/chamados')
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast.error('Erro ao criar chamado')
    } finally {
      setLoading(false)
    }
  }

  const sendEmailNotification = async (technicianId: string, ticket: any) => {
    try {
      // Get technician email
      const resp = await apiFetch('/users')
      const technician = (resp.data || []).find((u: any) => u.id === technicianId)

      if (technician?.email) {
        // Send email via backend API
        await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } : {}),
          },
          body: JSON.stringify({
            to: technician.email,
            subject: `Novo Chamado Atribuído: ${ticket.title}`,
            body: `
              <h2>Novo Chamado Atribuído</h2>
              <p><strong>Título:</strong> ${ticket.title}</p>
              <p><strong>Categoria:</strong> ${ticket.category}</p>
              <p><strong>Prioridade:</strong> ${ticket.priority}</p>
              <p><strong>Descrição:</strong> ${ticket.description}</p>
              <p><a href="${window.location.origin}/chamados/${ticket.id}">Clique aqui para visualizar o chamado</a></p>
            `
          }),
        })
      }
    } catch (error) {
      console.error('Error sending email notification:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="max-w-4xl mx-auto transition-colors">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg transition-colors">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 transition-colors">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Abrir Novo Chamado</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Preencha o formulário abaixo para registrar um novo chamado de suporte
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {fieldConfigs['title']?.label || 'Título do Chamado'}
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Tag className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                id="title"
                name="title"
                required={Boolean(fieldConfigs['title']?.required ?? true)}
                value={formData.title}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-colors"
                placeholder={fieldConfigs['title']?.placeholder || 'Descreva brevemente o problema'}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {fieldConfigs['description']?.label || 'Descrição Detalhada'}
            </label>
            <div className="mt-1">
              <textarea
                id="description"
                name="description"
                rows={4}
                required={Boolean(fieldConfigs['description']?.required ?? true)}
                value={formData.description}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-colors"
                placeholder={fieldConfigs['description']?.placeholder || 'Forneça detalhes sobre o problema, incluindo mensagens de erro, etapas para reproduzir, etc.'}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {fieldConfigs['category']?.label || 'Categoria'}
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required={Boolean(fieldConfigs['category']?.required ?? true)}
                className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 transition-colors"
              >
                {(
                  Array.isArray(fieldConfigs['category']?.options) && fieldConfigs['category']?.options?.length
                    ? fieldConfigs['category']!.options
                    : defaultCategories
                ).map((category: string) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {fieldConfigs['priority']?.label || 'Prioridade'}
              </label>
              <div className="mt-1">
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  required={Boolean(fieldConfigs['priority']?.required ?? true)}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 transition-colors"
                >
                  {(
                    Array.isArray(fieldConfigs['priority']?.options) && fieldConfigs['priority']?.options?.length
                      ? (fieldConfigs['priority']!.options as string[]).map(v => ({ value: v, label: v }))
                      : defaultPriorities
                  ).map((priority: any) => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Info className="w-4 h-4 mr-1" />
                <span>
                  {formData.priority === 'Urgent' && 'Problema crítico que impede o trabalho'}
                  {formData.priority === 'High' && 'Problema importante que afeta a produtividade'}
                  {formData.priority === 'Medium' && 'Problema moderado que pode esperar'}
                  {formData.priority === 'Low' && 'Problema menor ou melhoria'}
                </span>
              </div>
            </div>
          </div>

          {(() => {
            const builtinNames = ['title','description','category','priority','assigned_to_id']
            const extraFields = dynamicFields.filter((f: any) => !builtinNames.includes(String(f.name)) && (f.visibleInternal !== false))
            return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {extraFields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'text' && (
                  <input
                    type="text"
                    value={customValues[field.name] ?? ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly={Boolean(field.readonlyInternal)}
                  />
                )}
                {field.type === 'number' && (
                  <input
                    type="number"
                    value={customValues[field.name] ?? ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly={Boolean(field.readonlyInternal)}
                  />
                )}
                {field.type === 'email' && (
                  <input
                    type="email"
                    value={customValues[field.name] ?? ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly={Boolean(field.readonlyInternal)}
                  />
                )}
                {field.type === 'user' && (
                  <select
                    value={customValues[field.name] ?? ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    disabled={Boolean(field.readonlyInternal)}
                  >
                    <option value="">Selecionar usuário...</option>
                    {usersBasic.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                )}
                {field.type === 'date' && (
                  <input
                    type="date"
                    value={customValues[field.name] ?? ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly={Boolean(field.readonlyInternal)}
                  />
                )}
                {field.type === 'datetime' && (
                  <input
                    type="datetime-local"
                    value={customValues[field.name] ?? ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly={Boolean(field.readonlyInternal)}
                  />
                )}
                {field.type === 'select' && (
                  <select
                    value={customValues[field.name] ?? ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    disabled={Boolean(field.readonlyInternal)}
                  >
                    <option value="">Selecione uma opção</option>
                    {(field.options || []).map((opt: string, i: number) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {field.type === 'multiselect' && (
                  <div className="space-y-2">
                    {(field.options || []).map((opt: string, i: number) => (
                      <label key={i} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={Array.isArray(customValues[field.name]) ? customValues[field.name].includes(opt) : false}
                          onChange={(e) => {
                            const current = Array.isArray(customValues[field.name]) ? customValues[field.name] : []
                            const next = e.target.checked ? [...current, opt] : current.filter((x: any) => x !== opt)
                            setCustomValues({ ...customValues, [field.name]: next })
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                          disabled={Boolean(field.readonlyInternal)}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
                {field.type === 'checkbox' && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!!customValues[field.name]}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      disabled={Boolean(field.readonlyInternal)}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{field.placeholder || 'Sim/Não'}</span>
                  </label>
                )}
                {field.type === 'textarea' && (
                  <textarea
                    value={customValues[field.name] ?? ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    readOnly={Boolean(field.readonlyInternal)}
                  />
                )}
              </div>
            ))}
          </div>
            )
          })()}

          {/* Assign to Technician */}
          <div>
            <label htmlFor="assigned_to_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {fieldConfigs['assigned_to_id']?.label || 'Atribuir a'}
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <select
                id="assigned_to_id"
                name="assigned_to_id"
                value={formData.assigned_to_id}
                onChange={handleChange}
                required={Boolean(fieldConfigs['assigned_to_id']?.required ?? false)}
                disabled={Boolean(fieldConfigs['assigned_to_id']?.readonlyInternal)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 transition-colors"
              >
                <option value="">Selecionar técnico...</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {(technician as any).name || technician.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              type="button"
              onClick={() => navigate('/chamados')}
              className="w-full sm:w-auto text-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Criando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Criar Chamado
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
