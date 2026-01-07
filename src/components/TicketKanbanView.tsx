import { useState, useEffect, useMemo, memo } from 'react'
import { DndContext, useSensor, useSensors, PointerSensor, DragOverlay, pointerWithin, useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { type Ticket } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { deriveColumnsFromSettings, normalizeStatusKey, statusIdToLabel } from '../lib/kanbanMapping'
import { AlertCircle, Clock, CheckCircle } from 'lucide-react'

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
  const [columns, setColumns] = useState<Column[]>([])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
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
        const derived = deriveColumnsFromSettings(settings as Record<string, unknown>)
        let currentBoardId: string | null = null
        try { currentBoardId = localStorage.getItem('current_board_id') || null } catch { void 0 }
        const filtered = Array.isArray(derived)
          ? derived.filter((c) => {
              const boardId = (c as { boardId?: string | null }).boardId
              return !boardId || (currentBoardId && boardId === currentBoardId)
            })
          : []
        setColumns(filtered.length > 0 ? filtered : derived)
      } catch {
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

    const handler: EventListener = () => { loadColumns() }
    window.addEventListener('settingsUpdated', handler)
    window.addEventListener('boardChanged', handler)
    return () => {
      window.removeEventListener('settingsUpdated', handler)
      window.removeEventListener('boardChanged', handler)
    }
  }, [])

  const ticketsByColumn = useMemo(() => {
    return (Array.isArray(columns) ? columns : []).reduce((acc, column) => {
      const list = tickets.filter(t => column.statusIds.includes(normalizeStatusKey(t.status)))
      acc[column.id] = list
      return acc
    }, {} as Record<string, Ticket[]>)
  }, [tickets, columns])

  void getPriorityColor
  void getStatusColor
 
  // Sempre mostra colunas de boards, mesmo sem tickets
 
  // Componente Droppable apenas para a área de lista (evita cabeçalho interferir)
  const DroppableList = ({ column, children }: { column: Column, children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: column.id })
    return (
      <div
        id={column.id}
        ref={setNodeRef}
        style={{ touchAction: 'none', position: 'relative', contain: 'layout paint' }}
        className={`droppable-area flex-1 min-h-0 p-4 space-y-3 overflow-y-auto rounded-lg ${isOver ? 'border-2 border-dashed border-blue-400 dark:border-blue-500' : ''}`}
        role="list"
        aria-label={`Lista de chamados ${column.title}`}
        data-droppable
      >
        {children}
      </div>
    )
  }

  // Componente Draggable para card
  const DraggableCardBase = ({ ticket, columnTitle }: { ticket: Ticket, columnTitle: string }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ticket.id })
    const style = {
      transform: transform ? `${CSS.Transform.toString(transform)} translateZ(0)` : undefined,
      userSelect: 'none',
      touchAction: 'none',
      willChange: transform ? 'transform' : undefined,
      pointerEvents: isDragging ? 'none' : undefined,
      contentVisibility: 'auto',
      contain: 'layout paint style'
    } as React.CSSProperties

    return (
      <div
        key={ticket.id}
        id={ticket.id}
        data-draggable
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        className={`draggable-item bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md ${isDragging ? 'transition-none opacity-70 cursor-grabbing' : 'transition-all duration-200 cursor-grab'}`}
        role="listitem"
        aria-label={`Chamado ${ticket.title} - Status ${columnTitle}`}
        tabIndex={0}
      >
        <div className="mb-3">
          <Link
            to={`/chamados/${ticket.id}`}
            draggable={false}
            onClick={(e) => { if (isDragging) e.preventDefault() }}
            onMouseDown={(e) => { e.preventDefault() }}
            className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug"
            title={ticket.title}
          >
            {ticket.title}
          </Link>
        </div>

        <div className="mb-3">
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Tipo
          </div>
          <div className="inline-flex max-w-full items-center px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300">
            <span className="truncate">{ticket.category}</span>
          </div>
        </div>

        <div className="mb-1">
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Informações do solicitante
          </div>
          <div className="text-sm text-gray-900 dark:text-gray-100">
            {ticket.requester?.name || ticket.requester?.email || '-'}
          </div>
        </div>
      </div>
    )
  }
  const DraggableCard = memo(DraggableCardBase)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={() => {}}
      onDragOver={() => { void 0 }}
      onDragEnd={(evt) => {
        const id = String((evt?.active?.id ?? '') || '')
        const overId = String((evt?.over?.id ?? '') || '')
        const col = columns.find(c => c.id === overId)
        if (id && col) {
          (async () => {
            try {
              await apiFetch(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify({ status: col.targetStatus }) })
            } catch (e) {
              console.warn('[Kanban] Falha ao persistir status via DnD, UI seguirá com callback:', e)
            } finally {
              onStatusChange(id, col.targetStatus)
            }
          })()
        }
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
    <DragOverlay />
    </DndContext>
  )
}
