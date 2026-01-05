import { useState, useEffect } from 'react'
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor, PointerSensor, DragOverlay, rectIntersection, useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { type Ticket } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { deriveColumnsFromSettings, normalizeStatusKey, statusIdToLabel } from '../lib/kanbanMapping'
import { Calendar, User, AlertCircle, Clock, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react'

interface TicketKanbanViewProps {
  tickets: Ticket[]
  getPriorityColor: (priority: string) => string
  getStatusColor?: (status: string) => string
  getStatusStyle?: (status: string) => React.CSSProperties
  onStatusChange: (ticketId: string, newStatus: string) => void
}

interface Column {
  id: string
  title: string
  statusIds: string[]
  targetStatus: string
  icon: React.ReactNode
  color: string
}

export default function TicketKanbanView({ tickets, getPriorityColor, getStatusColor, getStatusStyle, onStatusChange }: TicketKanbanViewProps) {
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const sensors = useSensors(
    // PointerSensor cobre mouse/touch onde suportado
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
    // MouseSensor para ambientes sem PointerEvents
    useSensor(MouseSensor, { activationConstraint: { distance: 1 } }),
    // TouchSensor para dispositivos móveis
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 4 } }),
  )

  useEffect(() => {
    const loadColumns = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          setColumns([
            { id: 'open', title: 'Abertos', statusIds: ['open'], targetStatus: statusIdToLabel('open'), icon: <Clock className="w-4 h-4" />, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
            { id: 'in-progress', title: 'Em Andamento', statusIds: ['in-progress'], targetStatus: statusIdToLabel('in-progress'), icon: <AlertCircle className="w-4 h-4" />, color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
            { id: 'resolved', title: 'Resolvidos', statusIds: ['resolved'], targetStatus: statusIdToLabel('resolved'), icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
          ])
          return
        }
        const settings = await apiFetch('/settings')
        const derived = deriveColumnsFromSettings(settings as any)
        let currentBoardId: string | null = null
        try { currentBoardId = localStorage.getItem('current_board_id') || null } catch {}
        const filtered = Array.isArray(derived) ? derived.filter((c: any) => !c.boardId || (currentBoardId && c.boardId === currentBoardId)) : []
        setColumns(filtered.length > 0 ? filtered : derived)
      } catch (err) {
        console.warn('Kanban: usando colunas padrão')
        // Fallback para padrão
        setColumns([
          {
            id: 'open',
            title: 'Abertos',
            statusIds: ['open'],
            targetStatus: statusIdToLabel('open'),
            icon: <Clock className="w-4 h-4" />,
            color: '#3B82F6'
          },
          {
            id: 'in-progress',
            title: 'Em Andamento',
            statusIds: ['in-progress'],
            targetStatus: statusIdToLabel('in-progress'),
            icon: <AlertCircle className="w-4 h-4" />,
            color: '#F59E0B'
          },
          {
            id: 'resolved',
            title: 'Resolvidos',
            statusIds: ['resolved'],
            targetStatus: statusIdToLabel('resolved'),
            icon: <CheckCircle className="w-4 h-4" />,
            color: '#10B981'
          }
        ])
      }
    }

    loadColumns()

    const handler = () => { loadColumns() }
    window.addEventListener('settingsUpdated', handler as any)
    window.addEventListener('boardChanged', handler as any)
    return () => {
      window.removeEventListener('settingsUpdated', handler as any)
      window.removeEventListener('boardChanged', handler as any)
    }
  }, [])

  // Organizar tickets por coluna baseado em statusIds configurados
  const ticketsByColumn = (Array.isArray(columns) ? columns : []).reduce((acc, column) => {
    const list = tickets.filter(t => column.statusIds.includes(normalizeStatusKey(t.status)))
    acc[column.id] = list
    return acc
  }, {} as Record<string, Ticket[]>)

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

  // Sempre mostra colunas de boards, mesmo sem tickets

  // Componente Droppable apenas para a área de lista (evita cabeçalho interferir)
  const DroppableList = ({ column, children }: { column: Column, children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: column.id })
    return (
      <div
        id={column.id}
        ref={setNodeRef}
        style={{ touchAction: 'none', position: 'relative' }}
        className={`droppable-area flex-1 min-h-0 p-4 space-y-3 overflow-y-auto rounded-lg ${
          (isOver || dragOverColumn === column.id) ? 'border-2 border-dashed border-blue-400 dark:border-blue-500' : ''
        }`}
        role="list"
        aria-label={`Lista de chamados ${column.title}`}
        data-droppable
      >
        {children}
      </div>
    )
  }

  // Componente Draggable para card
  const DraggableCard = ({ ticket, columnTitle }: { ticket: Ticket, columnTitle: string }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ticket.id })
    const style = {
      transform: transform ? CSS.Transform.toString(transform) : undefined,
      userSelect: 'none',
      touchAction: 'none'
    } as React.CSSProperties

    const moveToCurrentBoard = async () => {
      try {
        const currentBoardId = localStorage.getItem('current_board_id')
        if (!currentBoardId) {
          console.warn('Nenhum board selecionado para mover o chamado.')
          return
        }
        await apiFetch(`/tickets/${ticket.id}`, { method: 'PUT', body: JSON.stringify({ board_id: currentBoardId }) })
        try { console.log('[Kanban] Ticket movido para board atual', { ticketId: ticket.id, boardId: currentBoardId }) } catch {}
        
      } catch (err) {
        console.error('Erro ao mover chamado para o board atual:', err)
      }
    }
    return (
      <div
        key={ticket.id}
        id={ticket.id}
        data-draggable
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        className={`draggable-item bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200 ${
          (isDragging || draggedTicket === ticket.id) ? 'opacity-50 rotate-2 scale-105 cursor-grabbing' : 'cursor-grab'
        }`}
        role="listitem"
        aria-label={`Chamado ${ticket.title} - Status ${columnTitle}`}
        tabIndex={0}
      >
        {/* Cabeçalho do Card */}
        <div className="flex items-start justify-between mb-2">
          <Link
            to={`/chamados/${ticket.id}`}
            draggable={false}
            onClick={(e) => {
              // Evita navegação durante um arraste ativo
              if (draggedTicket) {
                e.preventDefault()
              }
            }}
            onMouseDown={(e) => {
              // Evita seleção/captura do link impedir início do drag
              e.preventDefault()
            }}
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
            {getStatusStyle && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full border" style={getStatusStyle(ticket.status)}>
                {ticket.status}
              </span>
            )}
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
          {ticket.assigned_to && (
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span>{ticket.assigned_to?.name || ticket.assigned_to?.email}</span>
            </div>
          )}
          {!ticket.board_id && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              <AlertCircle className="w-3 h-3" />
              <span>Sem board</span>
            </div>
          )}
        </div>

        {/* Indicador de Drag */}
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div
              className="flex space-x-1 cursor-grab active:cursor-grabbing"
              title="Arraste para mover"
            >
              <div className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">Arraste para mover</span>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); moveToCurrentBoard() }}
              className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Mover p/ Board atual
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={(evt) => {
        const id = String((evt?.active?.id ?? '') || '')
        try { console.log('[Kanban] dragStart', { id }) } catch {}
        if (id) setDraggedTicket(id)
      }}
      onDragOver={(evt) => {
        const overId = String((evt?.over?.id ?? '') || '')
        try { console.log('[Kanban] dragOver', { overId }) } catch {}
        if (overId) setDragOverColumn(overId)
      }}
      onDragEnd={(evt) => {
        const id = String((evt?.active?.id ?? '') || '')
        const overId = String((evt?.over?.id ?? '') || '')
        const targetId = overId || dragOverColumn || ''
        const col = columns.find(c => c.id === targetId)
        try { console.log('[Kanban] dragEnd', { id, overId, fallback: dragOverColumn, target: col?.id }) } catch {}
        if (id && col) {
          (async () => {
            try {
              const resp = await apiFetch(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify({ status: col.targetStatus }) })
              try { console.log('[Kanban] Status persistido via DnD', { id, status: col.targetStatus, success: (resp as any)?.success }) } catch {}
            } catch (e) {
              console.warn('[Kanban] Falha ao persistir status via DnD, UI seguirá com callback:', e)
            } finally {
              onStatusChange(id, col.targetStatus)
            }
          })()
        }
        setDraggedTicket(null)
        setDragOverColumn(null)
      }}
    >
    <div className="flex gap-6 h-full min-h-0 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnTickets = ticketsByColumn[column.id] || []
        const isHex = String(column.color || '').startsWith('#')
        const hex = String(column.color || '')
        const hexToRgb = (h: string) => {
          const s = h.replace('#','')
          const bigint = parseInt(s.length === 3 ? s.split('').map(c => c + c).join('') : s, 16)
          const r = (bigint >> 16) & 255
          const g = (bigint >> 8) & 255
          const b = bigint & 255
          return { r, g, b }
        }
        const rgba = (h: string, a: number) => { const { r,g,b } = hexToRgb(h); return `rgba(${r}, ${g}, ${b}, ${a})` }
        const columnStyle: React.CSSProperties | undefined = isHex ? {
          background: `linear-gradient(180deg, ${rgba(hex, 0.12)} 0%, ${rgba(hex, 0.04)} 100%)`,
          borderColor: rgba(hex, 0.35)
        } : undefined
        return (
          <div key={column.id} className={`flex flex-col h-full min-h-0 basis-[320px] min-w-[300px] flex-shrink-0 rounded-lg border-2 ${isHex ? '' : column.color}`} style={columnStyle}>
            {/* Cabeçalho da Coluna */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-full border`} style={isHex ? { borderColor: rgba(hex, 0.4), backgroundColor: rgba(hex, 0.08) } : (getStatusStyle ? getStatusStyle(column.targetStatus) : undefined)}>
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

            {/* Área de Cards com Scroll (Droppable real) */}
            <DroppableList column={column}>
              {columnTickets.map((ticket) => (
                <DraggableCard key={ticket.id} ticket={ticket} columnTitle={column.title} />
              ))}
              {columnTickets.length === 0 && (
                <div className="flex items-center justify-center p-8">
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
            </DroppableList>
          </div>
        )
      })}
    </div>
    <DragOverlay>
      {draggedTicket ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-300 dark:border-blue-600 p-3 shadow-xl">
          <div className="text-sm font-medium">Movendo chamado...</div>
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  )
}
