import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { type Ticket } from '../lib/supabase'
import { Calendar, User, AlertCircle, Clock, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react'

interface TicketKanbanViewProps {
  tickets: Ticket[]
  getPriorityColor: (priority: string) => string
  getStatusColor: (status: string) => string
  onStatusChange: (ticketId: string, newStatus: string) => void
}

interface Column {
  id: string
  title: string
  status: string
  icon: React.ReactNode
  color: string
}

export default function TicketKanbanView({ tickets, getPriorityColor, getStatusColor, onStatusChange }: TicketKanbanViewProps) {
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [columns, setColumns] = useState<Column[]>([
    {
      id: 'open',
      title: 'Abertos',
      status: 'Open',
      icon: <Clock className="w-4 h-4" />,
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    },
    {
      id: 'in-progress',
      title: 'Em Andamento',
      status: 'In Progress',
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    },
    {
      id: 'resolved',
      title: 'Resolvidos',
      status: 'Resolved',
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    }
  ])

  // Organizar tickets por coluna
  const ticketsByColumn = tickets.reduce((acc, ticket) => {
    const columnId = ticket.status.toLowerCase().replace(' ', '-')
    if (!acc[columnId]) acc[columnId] = []
    acc[columnId].push(ticket)
    return acc
  }, {} as Record<string, Ticket[]>)

  // Limitar a 15 cards por coluna com scroll
  const limitTickets = (tickets: Ticket[]) => tickets.slice(0, 15)

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggedTicket(ticketId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', ticketId)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    setDragOverColumn(null)
    
    if (draggedTicket) {
      onStatusChange(draggedTicket, targetStatus)
      setDraggedTicket(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedTicket(null)
    setDragOverColumn(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return <ArrowUp className="w-3 h-3 text-red-500" />
      case 'High':
        return <ArrowUp className="w-3 h-3 text-orange-500" />
      case 'Medium':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full" />
      case 'Low':
        return <ArrowDown className="w-3 h-3 text-green-500" />
      default:
        return null
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[600px]">
      {columns.map((column) => {
        const columnTickets = limitTickets(ticketsByColumn[column.id] || [])
        const hasMore = (ticketsByColumn[column.id] || []).length > 15
        
        return (
          <div
              key={column.id}
              className={`flex flex-col rounded-lg border-2 ${column.color} ${
                dragOverColumn === column.id ? 'border-dashed border-blue-400 dark:border-blue-500' : ''
              } transition-all duration-200`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.status)}
              role="region"
              aria-label={`Coluna ${column.title}`}
            >
              {/* Cabeçalho da Coluna */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-full ${getStatusColor(column.status)}`}>
                    {column.icon}
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100" role="heading" aria-level={3}>
                    {column.title}
                  </h3>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium" aria-label={`${columnTickets.length} chamados`}>
                    {columnTickets.length}
                  </span>
                </div>
              </div>

              {/* Área de Cards com Scroll */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[500px]" role="list" aria-label={`Lista de chamados ${column.title}`}>
              {columnTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, ticket.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-move hover:shadow-md transition-all duration-200 ${
                    draggedTicket === ticket.id ? 'opacity-50 rotate-2 scale-105' : ''
                  }`}
                  role="listitem"
                  aria-label={`Chamado ${ticket.title} - Status ${column.title}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleDragStart(e as any, ticket.id)
                    }
                  }}
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between mb-2">
                    <Link
                      to={`/chamados/${ticket.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors line-clamp-2 flex-1"
                      title={ticket.title}
                    >
                      {ticket.title}
                    </Link>
                    <div className="flex items-center space-x-1 ml-2">
                      {getPriorityIcon(ticket.priority)}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>

                  {/* ID e Categoria */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      #{ticket.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {ticket.category}
                    </span>
                  </div>

                  {/* Informações Adicionais */}
                  <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(ticket.created_at)}</span>
                    </div>
                    {ticket.assigned_to_name && (
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{ticket.assigned_to_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Indicador de Drag */}
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-1">
                        <div className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        <div className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        <div className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">Arraste para mover</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {hasMore && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    +{(ticketsByColumn[column.id] || []).length - 15} chamados ocultos
                  </p>
                </div>
              )}
            </div>

            {columnTickets.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    {column.icon}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Nenhum chamado {column.title.toLowerCase()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}