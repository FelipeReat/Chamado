import { useState, useEffect } from 'react'
import { statusStyleFromSettings } from '../lib/statusColors'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'
import { sendTicketUpdatedNotification, sendNewCommentNotification } from '../utils/notifications'
import { 
  ArrowLeft, 
  Edit, 
  MessageSquare, 
  Send, 
  User, 
  Calendar, 
  Tag, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  RefreshCw,
  Mail,
  Download
} from 'lucide-react'

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [ticket, setTicket] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [commentLoading, setCommentLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [technicians, setTechnicians] = useState<any[]>([])

  useEffect(() => {
    if (id) {
      fetchTicket()
      fetchComments()
    }
    ;(async () => {
      try {
        const s = await apiFetch('/settings')
        setSettings(s)
      } catch {}
    })()
    ;(async () => {
      try {
        const resp = await apiFetch('/users')
        const techs = (resp.data || []).filter((u: any) => u.role === 'technician')
        setTechnicians(techs)
      } catch {}
    })()
  }, [id])

  const fetchTicket = async () => {
    try {
      const resp = await apiFetch('/tickets')
      const data = (resp.data || []).find((t: any) => t.id === id)
      setTicket(data)
    } catch (error) {
      console.error('Error fetching ticket:', error)
      toast.error('Erro ao carregar chamado')
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const resp = await apiFetch(`/tickets/${id}/comments`)
      const data = resp.data || []
      setComments(data)
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setCommentLoading(true)
    try {
      const resp = await apiFetch(`/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment.trim() })
      })
      setComments(prev => [...prev, resp.data])
      setNewComment('')
      
      // Send notification
      await sendNewCommentNotification({
        ticketId: ticket.id,
        comment: newComment,
        commentedById: user?.id || ''
      })
      
      toast.success('Comentário adicionado com sucesso!')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Erro ao adicionar comentário')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatusLoading(true)
    try {
      const resp = await apiFetch(`/tickets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      })
      setTicket(prev => prev ? { ...prev, status: resp.data.status } : null)
      
      // Send notification
      await sendTicketUpdatedNotification({
        ticketId: ticket.id,
        previousStatus: ticket.status,
        updatedById: user?.id || ''
      })
      
      toast.success('Status atualizado com sucesso!')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Erro ao atualizar status')
    } finally {
      setStatusLoading(false)
    }
  }

  const sendCommentNotification = async (comment: any) => {
    try {
      // Notify ticket requester if comment is from someone else
      if (ticket?.requester_id !== user?.id && ticket?.requester?.email) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } : {}),
          },
          body: JSON.stringify({
            to: ticket.requester.email,
            subject: `Novo Comentário no Chamado: ${ticket.title}`,
            body: `
              <h2>Novo Comentário</h2>
              <p><strong>Chamado:</strong> ${ticket.title}</p>
              <p><strong>Comentário de:</strong> ${comment.user?.name || comment.user?.email}</p>
              <p><strong>Comentário:</strong> ${comment.content}</p>
              <p><a href="${window.location.origin}/chamados/${ticket?.id}">Clique aqui para visualizar o chamado</a></p>
            `
          })
        })
      }

      // Notify assigned technician if comment is from someone else
      if (ticket?.assigned_to_id !== user?.id && ticket?.assigned_to?.email) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } : {}),
          },
          body: JSON.stringify({
            to: ticket.assigned_to.email,
            subject: `Novo Comentário no Chamado: ${ticket.title}`,
            body: `
              <h2>Novo Comentário</h2>
              <p><strong>Chamado:</strong> ${ticket.title}</p>
              <p><strong>Comentário de:</strong> ${comment.user?.name || comment.user?.email}</p>
              <p><strong>Comentário:</strong> ${comment.content}</p>
              <p><a href="${window.location.origin}/chamados/${ticket?.id}">Clique aqui para visualizar o chamado</a></p>
            `
          })
        })
      }
    } catch (error) {
      console.error('Error sending comment notification:', error)
    }
  }

  const sendStatusChangeNotification = async (newStatus: string) => {
    try {
      const statusLabel = newStatus === 'Open' ? 'Aberto' : 
                         newStatus === 'In Progress' ? 'Em Andamento' : 'Resolvido'

      // Notify requester
      if (ticket?.requester?.email) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } : {}),
          },
          body: JSON.stringify({
            to: ticket.requester.email,
            subject: `Status do Chamado Atualizado: ${ticket.title}`,
            body: `
              <h2>Status do Chamado Atualizado</h2>
              <p><strong>Chamado:</strong> ${ticket.title}</p>
              <p><strong>Novo Status:</strong> ${statusLabel}</p>
              <p><a href="${window.location.origin}/chamados/${ticket?.id}">Clique aqui para visualizar o chamado</a></p>
            `
          })
        })
      }
    } catch (error) {
      console.error('Error sending status change notification:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Resolved': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Chamado não encontrado</h2>
        <p className="mt-2 text-gray-600">O chamado que você está procurando não existe.</p>
        <Link
          to="/chamados"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Lista
        </Link>
      </div>
    )
  }

  const canEdit = isAdmin || ticket.requester_id === user?.id
  const canChangeStatus = isAdmin || ticket.assigned_to_id === user?.id
  const canTechnicianEdit = user?.role === 'technician'
  const allowEdit = canEdit || canTechnicianEdit

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
            <Link
              to="/chamados"
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar para Lista
            </Link>
            
            {allowEdit && (
              <Link
                to={`/chamados/${ticket.id}/editar`}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Link>
            )}
          </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {ticket.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium border ${getPriorityColor(ticket.priority)}`}>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {ticket.priority === 'Urgent' ? 'Urgente' :
                   ticket.priority === 'High' ? 'Alta' :
                   ticket.priority === 'Medium' ? 'Média' : 'Baixa'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium border`} style={statusStyleFromSettings((settings as any)?.statuses || [], ticket.status)}>
                  <Clock className="w-3 h-3 mr-1" />
                  {ticket.status === 'Open' ? 'Aberto' :
                   ticket.status === 'In Progress' ? 'Em Andamento' : ticket.status}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  <Tag className="w-3 h-3 mr-1" />
                  {ticket.category === 'Hardware' ? 'Hardware' :
                   ticket.category === 'Software' ? 'Software' :
                   ticket.category === 'Rede' ? 'Rede' :
                   ticket.category === 'Email' ? 'Email' :
                   ticket.category === 'Sistema' ? 'Sistema' : 'Outro'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Solicitante</h3>
              <div className="flex items-center">
                <User className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {ticket.requester?.name || ticket.requester?.email}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Atribuído a</h3>
              <div className="flex items-center">
                <User className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {ticket.assigned_to?.name || 
                   ticket.assigned_to?.email || 
                   'Não atribuído'}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Criado em</h3>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {new Date(ticket.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {ticket.updated_at !== ticket.created_at && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Última atualização</h3>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {new Date(ticket.updated_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Descrição</h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 transition-colors">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          {allowEdit && (
            <div className="mb-4">
              <button
                onClick={() => {
                  if (!editMode) setEditData({
                    title: ticket.title,
                    description: ticket.description,
                    category: ticket.category,
                    priority: ticket.priority,
                    assigned_to_id: ticket.assigned_to_id || '',
                    custom_fields: ticket.custom_fields || {}
                  })
                  setEditMode(!editMode)
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {editMode ? 'Sair Edição' : 'Editar Informações'}
              </button>
            </div>
          )}

          {editMode && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Título</label>
                <input
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
                <textarea
                  rows={4}
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                  <select
                    value={editData.category}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                  >
                    {['Hardware','Software','Rede','Email','Sistema','Outro'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade</label>
                  <select
                    value={editData.priority}
                    onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                  >
                    {['Low','Medium','High','Urgent'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Atribuído a</label>
                <select
                  value={editData.assigned_to_id || ''}
                  onChange={(e) => setEditData({ ...editData, assigned_to_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                >
                  <option value="">Não atribuído</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.user_metadata?.full_name || t.name || t.email}</option>
                  ))}
                </select>
              </div>
              {editData.custom_fields && Object.keys(editData.custom_fields || {}).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Campos Personalizados</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    {Object.entries(editData.custom_fields || {}).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">{key}</label>
                        <input
                          value={Array.isArray(value) ? value.join(', ') : String(value)}
                          onChange={(e) => setEditData({ ...editData, custom_fields: { ...editData.custom_fields, [key]: e.target.value } })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700"
                >Cancelar</button>
                <button
                  onClick={async () => {
                    try {
                      const resp = await apiFetch(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(editData) })
                      setTicket(resp.data)
                      setEditMode(false)
                    } catch (e) {
                      console.error('Erro ao salvar alterações do chamado:', e)
                    }
                  }}
                  className="px-3 py-2 rounded-md bg-blue-600 text-white"
                >Salvar alterações</button>
              </div>
            </div>
          )}

          {ticket.custom_fields && Object.keys(ticket.custom_fields || {}).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Campos do Formulário</h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 transition-colors space-y-3">
                {Object.entries(ticket.custom_fields || {}).map(([key, value]) => {
                  let label = key
                  const list = (settings as any)?.formFields || []
                  const found = list.find((f: any) => f.name === key)
                  if (found?.label) label = found.label
                  return (
                    <div key={key} className="flex items-start justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Status Change Buttons */}
          {canChangeStatus && (
            <div className="mb-4 sm:mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2 sm:mb-3">Alterar Status</h3>
              <div className="flex flex-wrap gap-2">
                {((settings as any)?.statuses || [])
                  .filter((s: any) => s.isActive)
                  .map((s: any) => {
                    const isCurrent = String(s.name) === String(ticket.status)
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleStatusChange(s.name)}
                        disabled={statusLoading}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border ${isCurrent ? 'opacity-90' : ''}`}
                        style={statusStyleFromSettings((settings as any)?.statuses || [], s.name)}
                        aria-pressed={isCurrent}
                        title={isCurrent ? `${s.name} (atual)` : `Marcar como ${s.name}`}
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        {s.name}
                      </button>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg transition-colors">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Comentários ({comments.length})
          </h2>
        </div>

        <div className="p-6">
          {/* Existing Comments */}
          <div className="space-y-4 mb-6">
            {comments.map((comment) => (
              <div key={comment.id || comment.created_at} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {comment.user?.name || comment.user?.email}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 transition-colors">
                    <p className="text-sm text-gray-900 dark:text-gray-100">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {comments.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
              </div>
            )}
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="border-t border-gray-200 pt-6">
            <div className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                <div className="mb-4">
                  <label htmlFor="comment" className="sr-only">
                    Adicionar comentário
                  </label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-blue-500 dark:bg-gray-900 dark:text-gray-100"
                    placeholder="Adicione um comentário..."
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={commentLoading || !newComment.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {commentLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Comentário
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
