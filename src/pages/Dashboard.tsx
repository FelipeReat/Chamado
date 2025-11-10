import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { type Ticket } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import TicketListView from '../components/TicketListView'
import TicketKanbanView from '../components/TicketKanbanView'
import ViewSelector, { useViewPreferences } from '../components/ViewSelector'
import { PlusCircle, Clock, CheckCircle, AlertCircle, TrendingUp, Users, List, Copy, ExternalLink } from 'lucide-react'

export default function Dashboard() {
  const { user, isAdmin } = useAuth()
  const { viewMode, setViewMode } = useViewPreferences()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    thisMonth: 0
  })

  const publicFormUrl = `${window.location.origin}/formulario-chamado`
  const [copied, setCopied] = useState(false)
  const copyPublicUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicFormUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      // Fallback
      const tmp = document.createElement('input')
      tmp.value = publicFormUrl
      document.body.appendChild(tmp)
      tmp.select()
      document.execCommand('copy')
      document.body.removeChild(tmp)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      const resp = await apiFetch('/tickets')
      const data = (resp.data || []) as Ticket[]
      // Filter client-side for non-admins
      const filtered = isAdmin ? data : data.filter(t => t.requester_id === user?.id || t.assigned_to_id === user?.id)
      setTickets(filtered)
      
      // Calculate stats
      const total = filtered.length || 0
      const open = filtered.filter(t => t.status === 'Open').length || 0
      const inProgress = filtered.filter(t => t.status === 'In Progress').length || 0
      const resolved = filtered.filter(t => t.status === 'Resolved').length || 0
      
      // This month stats
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonth = filtered.filter(t => 
        new Date(t.created_at) >= firstDayOfMonth
      ).length || 0

      setStats({
        total,
        open,
        inProgress,
        resolved,
        thisMonth
      })
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      // Atualiza estado local para feedback imediato
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t))
      // Opcional: chamar API para persistir alteração, se disponível
      try {
        await apiFetch(`/tickets/${ticketId}`, { method: 'PUT', body: { status: newStatus } })
      } catch (err) {
        console.warn('Falha ao persistir status, mantendo atualização local:', err)
      }
      // Recarrega lista
      await fetchTickets()
    } catch (error) {
      console.error('Erro ao atualizar status do ticket:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800'
      case 'High': return 'bg-orange-100 text-orange-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800'
      case 'In Progress': return 'bg-yellow-100 text-yellow-800'
      case 'Resolved': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-md flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Total de Chamados</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-md flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Abertos</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.open}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-md flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Em Andamento</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-md flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Resolvidos</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.resolved}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-md flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Este Mês</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.thisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/chamados/novo"
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
          >
            <PlusCircle className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-600 dark:text-gray-300">Abrir Novo Chamado</span>
          </Link>
          <Link
            to="/chamados"
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
          >
            <List className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-600 dark:text-gray-300">Ver Meus Chamados</span>
          </Link>
          {isAdmin && (
            <Link
              to="/usuarios"
              className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
            >
              <Users className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-gray-600 dark:text-gray-300">Gerenciar Usuários</span>
            </Link>
          )}
        </div>
      </div>

      {/* Public Form Link */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Formulário Público</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Compartilhe este link para que qualquer pessoa abra um chamado sem precisar de login.</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 truncate">
              {publicFormUrl}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyPublicUrl}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none transition-colors"
              title="Copiar link público"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
            <a
              href={publicFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none transition-colors"
              title="Abrir formulário público"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir
            </a>
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="mb-6">
        <ViewSelector viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* Tickets View */}
      <div className="transition-all duration-300 ease-in-out">
        {viewMode === 'list' ? (
          <TicketListView
            tickets={tickets}
            loading={loading}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
          />
        ) : (
          <TicketKanbanView
            tickets={tickets}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
            onStatusChange={updateTicketStatus}
          />
        )}
      </div>
    </div>
  )
}