import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Search, Filter, Plus, Eye, Edit, MessageSquare, User, Calendar, Tag, AlertTriangle } from 'lucide-react'

export default function TicketList() {
  const { user, isAdmin } = useAuth()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    assigned_to: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  const categories = ['Hardware', 'Software', 'Rede', 'Email', 'Sistema', 'Outro']
  const priorities = ['Low', 'Medium', 'High', 'Urgent']
  const statuses = ['Open', 'In Progress', 'Resolved']

  useEffect(() => {
    fetchTickets()
  }, [filters])

  const fetchTickets = async () => {
    try {
      const resp = await apiFetch('/tickets')
      let data = resp.data || []
      // Apply filters client-side
      if (filters.status) data = data.filter((t: any) => t.status === filters.status)
      if (filters.priority) data = data.filter((t: any) => t.priority === filters.priority)
      if (filters.category) data = data.filter((t: any) => t.category === filters.category)
      if (filters.assigned_to) data = data.filter((t: any) => t.assigned_to_id === filters.assigned_to)
      if (!isAdmin) data = data.filter((t: any) => t.requester_id === user?.id || t.assigned_to_id === user?.id)
      setTickets(data)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.requester?.email.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

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

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      category: '',
      assigned_to: ''
    })
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Open': return 'Aberto'
      case 'In Progress': return 'Em Andamento'
      case 'Resolved': return 'Resolvido'
      default: return status
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'Urgente'
      case 'High': return 'Alta'
      case 'Medium': return 'Média'
      case 'Low': return 'Baixa'
      default: return priority
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
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Chamados</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Gerencie todos os chamados de suporte
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/chamados/novo"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Chamado
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-colors">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por título, descrição ou solicitante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">Todos</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prioridade
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">Todas</option>
                  {priorities.map(priority => (
                    <option key={priority} value={priority}>
                      {getPriorityLabel(priority)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoria
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">Todas</option>
                  {categories.map(category => (
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

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tickets Table - Desktop */}
      <div className="hidden md:block bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md transition-colors">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Título
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Prioridade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Solicitante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Atribuído a
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  #{ticket.id.slice(0, 8)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  <div className="font-medium">{ticket.title}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                    {ticket.description.length > 50 
                      ? `${ticket.description.substring(0, 50)}...` 
                      : ticket.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    ticket.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                    ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                    ticket.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {ticket.status === 'Open' ? 'Aberto' :
                     ticket.status === 'In Progress' ? 'Em Andamento' :
                     ticket.status === 'Resolved' ? 'Resolvido' : 'Fechado'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    ticket.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                    ticket.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                    ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {ticket.priority === 'Urgent' ? 'Urgente' :
                     ticket.priority === 'High' ? 'Alta' :
                     ticket.priority === 'Medium' ? 'Média' : 'Baixa'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {ticket.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {ticket.requester?.user_metadata?.full_name || ticket.requester?.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {ticket.assigned_to?.user_metadata?.full_name || ticket.assigned_to?.email || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    to={`/chamados/${ticket.id}`}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Ver Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredTickets.map((ticket) => (
          <div key={ticket.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{ticket.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">#{ticket.id.slice(0, 8)}</p>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  ticket.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                  ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                  ticket.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {ticket.status === 'Open' ? 'Aberto' :
                   ticket.status === 'In Progress' ? 'Em Andamento' :
                   ticket.status === 'Resolved' ? 'Resolvido' : 'Fechado'}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  ticket.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                  ticket.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                  ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {ticket.priority === 'Urgent' ? 'Urgente' :
                   ticket.priority === 'High' ? 'Alta' :
                   ticket.priority === 'Medium' ? 'Média' : 'Baixa'}
                </span>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {ticket.description.length > 100 
                ? `${ticket.description.substring(0, 100)}...` 
                : ticket.description}
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Categoria:</span>
                <p className="font-medium">{ticket.category}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Solicitante:</span>
                <p className="font-medium text-sm">{ticket.requester?.user_metadata?.full_name || ticket.requester?.email}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Atribuído:</span>
                <p className="font-medium">{ticket.assigned_to?.user_metadata?.full_name || ticket.assigned_to?.email || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data:</span>
                <p className="font-medium">{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Link
                to={`/chamados/${ticket.id}`}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none"
              >
                Ver Detalhes
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredTickets.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Nenhum chamado encontrado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Tente ajustar seus filtros ou criar um novo chamado.
          </p>
          <Link
            to="/chamados/novo"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Chamado
          </Link>
        </div>
      )}
    </div>
  )
}