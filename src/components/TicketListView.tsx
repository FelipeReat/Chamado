import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { type Ticket } from '../lib/supabase'
import { ChevronLeft, ChevronRight, Calendar, User, AlertCircle } from 'lucide-react'

interface TicketListViewProps {
  tickets: Ticket[]
  getPriorityColor: (priority: string) => string
  getStatusColor: (status: string) => string
  loading?: boolean
}

export default function TicketListView({ tickets, getPriorityColor, getStatusColor }: TicketListViewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Ordenar por data de abertura (mais recentes primeiro)
  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [tickets])

  // Paginação
  const totalPages = Math.ceil(sortedTickets.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTickets = sortedTickets.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'In Progress': return 'Em Andamento'
      case 'Resolved': return 'Resolvido'
      default: return 'Aberto'
    }
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Nenhum chamado encontrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabela Responsiva */}
      <div className="overflow-x-auto" role="region" aria-label="Tabela de chamados">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" role="table">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr role="row">
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                aria-sort="descending"
              >
                ID
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Título
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Status
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Prioridade
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                <Calendar className="w-4 h-4 inline mr-1" aria-hidden="true" />
                Data de Abertura
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                <User className="w-4 h-4 inline mr-1" aria-hidden="true" />
                Responsável
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {currentTickets.map((ticket) => (
              <tr 
                key={ticket.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                role="row"
              >
                <td className="px-6 py-4 whitespace-nowrap" role="cell">
                  <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                    #{ticket.id.slice(0, 8)}
                  </span>
                </td>
                <td className="px-6 py-4" role="cell">
                  <Link
                    to={`/chamados/${ticket.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded"
                    title={ticket.title}
                    aria-label={`Ver detalhes do chamado ${ticket.title}`}
                  >
                    {ticket.title.length > 40 ? `${ticket.title.slice(0, 40)}...` : ticket.title}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap" role="cell">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`} role="status">
                    {getStatusLabel(ticket.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap" role="cell">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`} role="status">
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" role="cell">
                  <time dateTime={ticket.created_at}>
                    {formatDate(ticket.created_at)}
                  </time>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" role="cell">
                  {ticket.assigned_to?.name || ticket.assigned_to?.email || 'Não atribuído'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex justify-between flex-1 sm:hidden">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
          <div className="hidden sm:flex sm:items-center sm:justify-between sm:flex-1">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando <span className="font-medium">{startIndex + 1}</span> até{' '}
                <span className="font-medium">{Math.min(endIndex, sortedTickets.length)}</span> de{' '}
                <span className="font-medium">{sortedTickets.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="inline-flex -space-x-px rounded-md shadow-sm" role="navigation" aria-label="Paginação">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                      aria-label={`Ir para página ${pageNum}`}
                      aria-current={currentPage === pageNum ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
