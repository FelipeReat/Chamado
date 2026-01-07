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
  Download,
  Trash
} from 'lucide-react'

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAdmin, isTechnician } = useAuth()
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
  const [usersBasic, setUsersBasic] = useState<any[]>([])
  const [imageModalSrc, setImageModalSrc] = useState<string | null>(null)
  const [zoomScale, setZoomScale] = useState<number>(1)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    try {
      if (imageModalSrc) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    } catch {}
    return () => {
      try { document.body.style.overflow = '' } catch {}
    }
  }, [imageModalSrc])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && imageModalSrc) {
        setImageModalSrc(null)
        setZoomScale(1)
        setOffset({ x: 0, y: 0 })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [imageModalSrc])

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
        const dataAll = resp.data || []
        const techs = dataAll.filter((u: any) => u.role === 'technician')
        const users = dataAll.filter((u: any) => u.role === 'user')
        setTechnicians(techs)
        setUsersBasic(users)
        setTicket(prev => prev ? { 
          ...prev, 
          assigned_to: techs.find((t: any) => t.id === prev.assigned_to_id) || prev.assigned_to,
          requester: users.find((u: any) => u.id === prev.requester_id) || prev.requester
        } : prev)
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

  const handleAssignTechnician = async (technicianId: string) => {
    try {
      const resp = await apiFetch(`/tickets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ assigned_to_id: technicianId || null })
      })
      setTicket((prev: any) => prev ? { 
        ...prev, 
        assigned_to_id: resp.data.assigned_to_id,
        assigned_to: technicians.find((t: any) => t.id === resp.data.assigned_to_id) || null
      } : null)
      toast.success('Técnico atualizado com sucesso!')
    } catch (error) {
      console.error('Error assigning technician:', error)
      toast.error('Erro ao atualizar técnico')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este chamado? Esta ação não pode ser desfeita.')) return
    
    try {
      await apiFetch(`/tickets/${id}`, { method: 'DELETE' })
      toast.success('Chamado excluído com sucesso')
      navigate('/chamados')
    } catch (error) {
      console.error('Error deleting ticket:', error)
      toast.error('Erro ao excluir chamado')
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
            subject: `Novo Comentário no Chamado: ${ticket?.title || ''}`,
            body: `
              <h2>Novo Comentário</h2>
              <p><strong>Chamado:</strong> ${ticket?.title || ''}</p>
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
            subject: `Novo Comentário no Chamado: ${ticket?.title || ''}`,
            body: `
              <h2>Novo Comentário</h2>
              <p><strong>Chamado:</strong> ${ticket?.title || ''}</p>
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
            subject: `Status do Chamado Atualizado: ${ticket?.title || ''}`,
            body: `
              <h2>Status do Chamado Atualizado</h2>
              <p><strong>Chamado:</strong> ${ticket?.title || ''}</p>
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

  const canEdit = isAdmin || (ticket?.requester_id === user?.id)
  const canChangeStatus = isAdmin || isTechnician || (ticket?.assigned_to_id === user?.id)
  const canTechnicianEdit = user?.role === 'technician'
  const allowEdit = canEdit || canTechnicianEdit

  const generateChecklistPdf = () => {
    const raw = ((ticket || {}) as Record<string, unknown>).custom_fields as unknown as Record<string, unknown> || {}
    const toStringArray = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.map(x => String(x)).filter(Boolean)
      if (typeof v === 'string') return [v].filter(Boolean)
      return []
    }
    let groups: Array<{ name: string; observations: string[] }> = []
    const arr = Array.isArray((raw as Record<string, unknown>).checklistGroups)
      ? (raw.checklistGroups as unknown as Array<Record<string, unknown>>)
      : null
    if (arr) {
      groups = arr.map((g) => ({
        name: String(g.name || g.group || 'Grupo'),
        observations: toStringArray(g.observations)
      }))
    } else {
      const map = new Map<string, string[]>()
      const obsGlobal = raw.observacoes
      if (typeof obsGlobal === 'object' && obsGlobal && !Array.isArray(obsGlobal)) {
        Object.entries(obsGlobal as Record<string, unknown>).forEach(([k, v]) => {
          const name = String(k || '').trim()
          const list = toStringArray(v)
          if (name && list.length) map.set(name, list)
        })
      }
      Object.keys(raw).forEach((key) => {
        const m = key.match(/^grupo[:_]?(.+)$/i)
        if (m) {
          const name = m[1].trim()
          const candidates: unknown[] = [
            (raw as Record<string, unknown>)[`observacoes:${name}`],
            (raw as Record<string, unknown>)[`observacoes_${name}`],
          ].filter(Boolean)
          const list = candidates.flatMap(toStringArray)
          if (name) map.set(name, list)
        }
      })
      if (map.size === 0) {
        const base = toStringArray(raw.observacoes)
        const fallback = base.length ? base : [String(ticket?.description || '')].filter(Boolean)
        groups = [{ name: 'Geral', observations: fallback }]
      } else {
        groups = Array.from(map.entries()).map(([name, observations]) => ({ name, observations }))
      }
    }

    const title = String(ticket?.title || 'Checklist')
    const created = new Date(ticket.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const requester = (ticket as any)?.custom_fields?.name || ticket.requester?.name || ticket.requester?.email || ''
    const category = ticket.category
    const html = `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Checklist - ${title}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
        h1 { font-size: 20px; margin: 0 0 4px 0; }
        .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
        .group { margin-top: 16px; page-break-inside: avoid; }
        .group h2 { font-size: 14px; margin: 0 0 6px 0; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
        ul { margin: 0; padding-left: 18px; }
        li { font-size: 12px; margin-bottom: 6px; }
        .footer { margin-top: 24px; font-size: 11px; color: #6b7280; }
        @page { margin: 20mm; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Criado em ${created} • Categoria: ${category} • Solicitante: ${requester}</div>
      ${groups.map(g => `
        <div class="group">
          <h2>${g.name}</h2>
          ${g.observations.length ? `<ul>${g.observations.map(o => `<li>${String(o)}</li>`).join('')}</ul>` : `<div style="font-size:12px;color:#6b7280">Sem observações</div>`}
        </div>
      `).join('')}
      <div class="footer">Gerado pelo sistema de chamados</div>
      <script>window.addEventListener('load', () => { window.print(); setTimeout(() => window.close(), 300); });</script>
    </body>
    </html>`
    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (w) {
      w.document.open()
      w.document.write(html)
      w.document.close()
    }
  }

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
              <button
                onClick={() => {
                  if (!editMode && ticket) setEditData({
                    title: ticket.title,
                    description: ticket.description,
                    category: ticket.category,
                    priority: ticket.priority,
                    assigned_to_id: ticket.assigned_to_id || '',
                    requester_id: ticket.requester_id || '',
                    custom_fields: ticket.custom_fields || {}
                  })
                  setEditMode(prev => !prev)
                }}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="w-4 h-4 mr-1" />
                {editMode ? 'Sair Edição' : 'Editar'}
              </button>
            )}
            {canEdit && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
              >
                <Trash className="w-4 h-4 mr-1" />
                Excluir
              </button>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={generateChecklistPdf}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-1" />
                Checklist PDF
              </button>
            </div>
          </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {ticket?.title || ''}
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
                  {(ticket as any)?.custom_fields?.name || ticket.requester?.name || ticket.requester?.email}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Técnico Responsável</h3>
              <div className="flex items-center">
                <User className="w-4 h-4 text-gray-400 mr-2" />
                {canChangeStatus ? (
                  <select
                    value={ticket.assigned_to_id || ''}
                    onChange={(e) => handleAssignTechnician(e.target.value)}
                    className="text-sm border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100 py-1"
                  >
                    <option value="">Não atribuído</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name || tech.email}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {ticket.assigned_to?.name || ticket.assigned_to?.email || 'Não atribuído'}
                  </span>
                )}
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

          {Array.isArray((ticket as any)?.custom_fields?.attachments) && ((ticket as any)?.custom_fields?.attachments as string[]).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Anexos</h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 transition-colors">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {((ticket as any)?.custom_fields?.attachments as string[]).map((src: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => { setImageModalSrc(src); setZoomScale(1); setOffset({ x: 0, y: 0 }) }}
                      className="group relative block"
                      aria-label={`Abrir anexo ${i + 1}`}
                    >
                      <img src={src} alt={`Anexo ${i + 1}`} className="rounded border border-gray-200 dark:border-gray-700 object-cover max-h-40 w-full" />
                      <span className="absolute inset-0 rounded border-2 border-transparent group-hover:border-blue-400"></span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {imageModalSrc && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => { setImageModalSrc(null); setZoomScale(1); setOffset({ x: 0, y: 0 }) }} onWheel={(e) => e.preventDefault()}>
              <div className="max-w-5xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
                <div
                  className={`relative max-w-full max-h-[85vh] overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                  onWheel={(e) => {
                    e.preventDefault()
                    const delta = e.deltaY > 0 ? -0.1 : 0.1
                    const next = Math.min(5, Math.max(1, zoomScale + delta))
                    setZoomScale(next)
                  }}
                  onMouseDown={(e) => {
                    setIsDragging(true)
                    setDragStart({ x: e.clientX, y: e.clientY })
                  }}
                  onMouseMove={(e) => {
                    if (!isDragging || !dragStart) return
                    const dx = e.clientX - dragStart.x
                    const dy = e.clientY - dragStart.y
                    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
                    setDragStart({ x: e.clientX, y: e.clientY })
                  }}
                  onMouseUp={() => {
                    setIsDragging(false)
                    setDragStart(null)
                  }}
                  onMouseLeave={() => {
                    setIsDragging(false)
                    setDragStart(null)
                  }}
                >
                  <img
                    src={imageModalSrc}
                    alt="Anexo"
                    style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoomScale})`, transformOrigin: 'center center' }}
                    className="rounded shadow-lg max-h-[85vh] w-auto object-contain select-none"
                    draggable={false}
                  />
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    onClick={() => { setZoomScale(1); setOffset({ x: 0, y: 0 }) }}
                  >
                    Resetar zoom
                  </button>
                </div>
              </div>
            </div>
          )}

          

          {editMode && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Título</label>
                <input
                  value={editData?.title ?? ''}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
                <textarea
                  rows={4}
                  value={editData?.description ?? ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                  <select
                    value={editData?.category ?? ''}
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
                    value={editData?.priority ?? ''}
                    onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                  >
                    {['Low','Medium','High','Urgent'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700"
                >Cancelar</button>
                <button
                  onClick={async () => {
                    try {
                      const normalizeCategory = (input: any) => {
                        const raw = String(input || '').trim().toLowerCase()
                        if (!raw) return undefined
                        if (raw.startsWith('hard')) return 'Hardware'
                        if (raw.startsWith('soft')) return 'Software'
                        if (raw.includes('network') || raw.includes('rede')) return 'Network'
                        return 'Other'
                      }
                      const normalizePriority = (input: any) => {
                        const raw = String(input || '').trim().toLowerCase()
                        if (!raw) return undefined
                        if (raw.includes('low') || raw.includes('baixa')) return 'Low'
                        if (raw.includes('medium') || raw.includes('média') || raw.includes('media')) return 'Medium'
                        if (raw.includes('high') || raw.includes('alta')) return 'High'
                        if (raw.includes('urgent') || raw.includes('urgente')) return 'Urgent'
                        return undefined
                      }
                      const payload: any = {}
                      if (typeof editData?.title === 'string') payload.title = editData.title
                      if (typeof editData?.description === 'string') payload.description = editData.description
                      const cat = normalizeCategory(editData?.category)
                      if (cat) payload.category = cat
                      const pri = normalizePriority(editData?.priority)
                      if (pri) payload.priority = pri
                      const resp = await apiFetch(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
                      const updated = resp.data
                      setTicket(updated)
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
