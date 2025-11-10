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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Hardware',
    priority: 'Medium',
    assigned_to_id: ''
  })

  const categories = [
    'Hardware',
    'Software',
    'Rede',
    'Email',
    'Sistema',
    'Outro'
  ]

  const priorities = [
    { value: 'Low', label: 'Baixa', icon: Info, color: 'text-green-600' },
    { value: 'Medium', label: 'Média', icon: Info, color: 'text-yellow-600' },
    { value: 'High', label: 'Alta', icon: AlertTriangle, color: 'text-orange-600' },
    { value: 'Urgent', label: 'Urgente', icon: AlertTriangle, color: 'text-red-600' }
  ]

  useEffect(() => {
    fetchTechnicians()
  }, [])

  const fetchTechnicians = async () => {
    try {
      const resp = await apiFetch('/users')
      const data = (resp.data || []).filter((u: any) => u.role === 'technician')
      setTechnicians(data)
    } catch (error) {
      console.error('Error fetching technicians:', error)
      toast.error('Erro ao carregar técnicos')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const resp = await apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          status: 'Open',
          assigned_to_id: formData.assigned_to_id || null
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
              Título do Chamado
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Tag className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-colors"
                placeholder="Descreva brevemente o problema"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição Detalhada
            </label>
            <div className="mt-1">
              <textarea
                id="description"
                name="description"
                rows={4}
                required
                value={formData.description}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-colors"
                placeholder="Forneça detalhes sobre o problema, incluindo mensagens de erro, etapas para reproduzir, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Categoria
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 transition-colors"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'Hardware' ? 'Hardware' : 
                     category === 'Software' ? 'Software' :
                     category === 'Rede' ? 'Rede' :
                     category === 'Email' ? 'Email' :
                     category === 'Sistema' ? 'Sistema' : 'Outro'}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prioridade
              </label>
              <div className="mt-1">
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 transition-colors"
                >
                  {priorities.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
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

          {/* Assign to Technician */}
          <div>
            <label htmlFor="assigned_to_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Atribuir a (opcional)
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
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 transition-colors"
              >
                <option value="">Selecionar técnico...</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.user_metadata?.full_name || technician.email}
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