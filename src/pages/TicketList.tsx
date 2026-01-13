import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Search, Filter, Plus, Upload, FileSpreadsheet, X } from 'lucide-react'
import TicketKanbanView from '../components/TicketKanbanView'
import { statusStyleFromSettings } from '../lib/statusColors'
import ViewSelector, { useViewPreferences } from '../components/ViewSelector'

export default function TicketList() {
  const { user, isAdmin, isTechnician } = useAuth()
  type ListTicket = { id: string; title: string; description: string; category: string; priority: string; status: string; created_at: string; updated_at?: string; board_id?: string | null; requester?: { email?: string; name?: string; user_metadata?: { full_name?: string } }; assigned_to?: { email?: string; name?: string; user_metadata?: { full_name?: string } }; assigned_to_id?: string; requester_id?: string }
  interface StatusSetting { name: string; color?: string; isActive?: boolean }
  type ImportRow = { title: string; description: string; category: string; priority: string; status: string; rowNumber: number; source: Record<string, unknown> }
  const [tickets, setTickets] = useState<ListTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    assigned_to: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const { viewMode, setViewMode } = useViewPreferences()
  const [boardId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('current_board_id') || null
    } catch { return null }
  })

  const categories = ['Hardware', 'Software', 'Rede', 'Email', 'Sistema', 'Outro']
  const priorities = ['Low', 'Medium', 'High', 'Urgent']
  interface StatusOption { label: string; value: string }
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([])
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importErrors, setImportErrors] = useState<{ rowNumber: number; message: string }[]>([])
  const [importFileName, setImportFileName] = useState<string | null>(null)
  const [importParsingError, setImportParsingError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ total: number; success: number; failed: number } | null>(null)

  const fetchTickets = useCallback(async () => {
    try {
      const qs = boardId ? `?board_id=${encodeURIComponent(boardId)}` : ''
      const resp = await apiFetch(`/tickets${qs}`)
      let data: ListTicket[] = (resp.data || []) as ListTicket[]
      if (filters.status) data = data.filter((t) => parseStatus(t.status) === filters.status)
      if (filters.priority) data = data.filter((t) => parsePriority(t.priority) === filters.priority)
      if (filters.category) data = data.filter((t) => parseCategory(t.category) === filters.category)
      if (filters.assigned_to) data = data.filter((t) => t.assigned_to_id === filters.assigned_to)
      const currentUserId = (user as unknown as { id?: string } | null)?.id
      if (!(isAdmin || isTechnician)) data = data.filter((t) => t.requester_id === currentUserId || t.assigned_to_id === currentUserId)
      setTickets(data)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }, [boardId, filters, isAdmin, isTechnician, user])

  useEffect(() => {
    const envBase = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL || ''
    const looksLikePreview = (b: string) => b.includes('localhost:5006') || b.includes('localhost:5173') || b.includes('localhost:5174')
    const API_BASE = (!envBase || looksLikePreview(envBase)) ? 'http://localhost:3000' : envBase
    let es: EventSource | null = null
    const onCreated: EventListener = () => { void fetchTickets() }
    let stopped = false
    const open = async () => {
      if (stopped) return
      try {
        const res = await fetch(`${API_BASE}/api/health`)
        if (!res.ok) throw new Error('unhealthy')
        es = new EventSource(`${API_BASE}/api/notifications/stream`)
        es.addEventListener('ticket-created', onCreated)
        es.onerror = () => {
          try { es?.close() } catch (e) { void e }
          es = null
          setTimeout(open, 5000)
        }
      } catch {
        setTimeout(open, 5000)
      }
    }
    open()
    return () => {
      stopped = true
      if (es) {
        try { es.removeEventListener('ticket-created', onCreated) } catch (e) { void e }
        try { es.close() } catch (e) { void e }
      }
    }
  }, [fetchTickets])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  useEffect(() => {
    ;(async () => {
      try {
        const s = await apiFetch('/settings')
        const raw: unknown = s
        const list = Array.isArray((raw as { statuses?: StatusSetting[] }).statuses) ? ((raw as { statuses?: StatusSetting[] }).statuses as StatusSetting[]) : []
        const options = list.filter((x) => x.isActive).map((x) => ({
          label: x.name,
          value: x.id === 'open' ? 'Open' : 
                 x.id === 'in-progress' ? 'In Progress' :
                 x.id === 'resolved' ? 'Resolved' :
                 x.id === 'archived' ? 'Archived' : x.id
        }))
        setStatusOptions(options)
        setSettings(s)
      } catch (err) { void err }
    })()
  }, [])

  

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

  const getStatusStyle = (status: string) => {
    const raw: unknown = settings
    const statuses: StatusSetting[] = Array.isArray((raw as { statuses?: StatusSetting[] } | null)?.statuses) ? ((raw as { statuses?: StatusSetting[] } | null)?.statuses as StatusSetting[]) : []
    return statusStyleFromSettings(statuses, status)
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

  const normalizeTextKey = (value: string) => {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  }

  const getCellString = (value: unknown) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number') return String(value)
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (value instanceof Date) return value.toISOString()
    return String(value).trim()
  }

  const pickValue = (obj: Record<string, unknown>, candidates: string[]) => {
    const keys = Object.keys(obj)
    const normalizedMap = new Map<string, string>()
    for (const k of keys) normalizedMap.set(normalizeTextKey(k), k)
    for (const c of candidates) {
      const found = normalizedMap.get(normalizeTextKey(c))
      if (found) return obj[found]
    }
    return undefined
  }

  const parsePriority = (value: string) => {
    const v = normalizeTextKey(value)
    if (v.includes('urgent') || v.includes('urgente')) return 'Urgent'
    if (v.includes('high') || v.includes('alta')) return 'High'
    if (v.includes('medium') || v.includes('media') || v.includes('média')) return 'Medium'
    if (v.includes('low') || v.includes('baixa')) return 'Low'
    if (priorities.includes(value)) return value
    return 'Medium'
  }

  const parseCategory = (value: string) => {
    const v = normalizeTextKey(value)
    const match =
      categories.find((c) => normalizeTextKey(c) === v) ||
      (v.includes('rede') || v.includes('network') ? 'Rede' : null) ||
      (v.includes('email') ? 'Email' : null) ||
      (v.includes('hardware') ? 'Hardware' : null) ||
      (v.includes('software') ? 'Software' : null) ||
      (v.includes('sistema') || v.includes('system') ? 'Sistema' : null)
    return match || 'Outro'
  }

  const parseStatus = (value: string) => {
    const v = value.trim()
    if (!v) return 'Open'
    if (statusOptions.includes(v)) return v
    const norm = normalizeTextKey(v)
    const normalizedOption = statusOptions.find((opt) => normalizeTextKey(opt) === norm)
    if (normalizedOption) return normalizedOption
    if (norm === 'open' || norm === 'aberto' || norm.includes('a fazer') || norm.includes('todo') || norm.includes('to do') || norm.includes('backlog') || norm.includes('pendente')) return 'Open'
    if (norm.includes('progress') || norm.includes('andamento') || norm.includes('fazendo') || norm.includes('doing') || norm.includes('em progresso') || norm.includes('iniciado')) return 'In Progress'
    if (norm.includes('resolved') || norm.includes('resolvido') || norm.includes('concluido') || norm.includes('concluído') || norm.includes('finalizado') || norm.includes('done')) return 'Resolved'
    if (norm.includes('archiv') || norm.includes('arquiv')) return 'Archived'
    return 'Open'
  }

  const resetImportState = () => {
    setImportRows([])
    setImportErrors([])
    setImportFileName(null)
    setImportParsingError(null)
    setImportResult(null)
  }

  const closeImportModal = () => {
    if (importing) return
    setShowImportModal(false)
    resetImportState()
  }

  const handleSelectImportFile = async (file: File) => {
    setImportParsingError(null)
    setImportErrors([])
    setImportRows([])
    setImportResult(null)
    setImportFileName(file.name)

    try {
      const xlsxModule: unknown = await import('xlsx')
      const XLSX = (
        (xlsxModule as { default?: unknown }).default ??
        xlsxModule
      ) as { read?: (data: ArrayBuffer, opts: Record<string, unknown>) => { SheetNames: string[]; Sheets: Record<string, unknown> }; utils?: { sheet_to_json?: <T>(sheet: unknown, opts: Record<string, unknown>) => T[] } }

      if (typeof XLSX.read !== 'function' || typeof XLSX.utils?.sheet_to_json !== 'function') {
        throw new Error('Falha ao carregar leitor de Excel')
      }

      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const sheetName = wb.SheetNames[0]
      if (!sheetName) throw new Error('Arquivo sem planilhas')
      const sheet = wb.Sheets[sheetName]
      if (!sheet) throw new Error('Planilha inválida')

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      const parsed: ImportRow[] = rows
        .map((r, idx) => {
          const titleRaw = pickValue(r, ['titulo', 'título', 'title', 'assunto', 'subject', 'resumo', 'summary'])
          const descRaw = pickValue(r, ['descricao', 'descrição', 'description', 'detalhes', 'details', 'mensagem', 'message', 'observacao', 'observação', 'obs', 'body'])
          const categoryRaw = pickValue(r, ['categoria', 'category', 'tipo', 'type'])
          const labelsRaw = pickValue(r, ['etiquetas', 'labels', 'tags'])
          const priorityRaw = pickValue(r, ['prioridade', 'priority', 'urgencia', 'urgência'])
          const statusRaw = pickValue(r, ['fase atual', 'fase', 'coluna', 'lista', 'status', 'situacao', 'situação', 'state'])

          const title = getCellString(titleRaw)
          const description = getCellString(descRaw)
          const labelsText = getCellString(labelsRaw)
          const categoryText = getCellString(categoryRaw) || labelsText
          const priorityText = getCellString(priorityRaw) || labelsText
          const category = parseCategory(categoryText)
          const priority = parsePriority(priorityText)
          const status = parseStatus(getCellString(statusRaw))

          return { title, description, category, priority, status, rowNumber: idx + 2, source: r }
        })
        .filter((r) => r.title || r.description)

      if (parsed.length === 0) {
        throw new Error('Nenhuma linha válida encontrada. Inclua pelo menos uma coluna de título ou descrição.')
      }

      const invalid = parsed.filter((r) => !r.title)
      if (invalid.length > 0) {
        setImportErrors(invalid.slice(0, 50).map((r) => ({ rowNumber: r.rowNumber, message: 'Título obrigatório ausente' })))
      }

      setImportRows(parsed)
    } catch (e) {
      setImportParsingError(e instanceof Error ? e.message : 'Falha ao ler o arquivo')
    }
  }

  const runImport = async () => {
    if (!(isAdmin || isTechnician)) return
    if (importing) return
    const rows = importRows.filter((r) => r.title)
    if (rows.length === 0) return

    setImporting(true)
    setImportErrors([])
    setImportResult({ total: rows.length, success: 0, failed: 0 })
    try {
      let currentBoardId: string | null = boardId
      try {
        if (!currentBoardId) currentBoardId = localStorage.getItem('current_board_id') || null
      } catch { currentBoardId = null }

      let success = 0
      let failed = 0
      const nextErrors: { rowNumber: number; message: string }[] = []

      for (const row of rows) {
        try {
          const resp = await apiFetch('/tickets', {
            method: 'POST',
            body: JSON.stringify({
              title: row.title,
              description: row.description,
              category: row.category || 'Outro',
              priority: row.priority || 'Medium',
              status: row.status || 'Open',
              assigned_to_id: null,
              board_id: currentBoardId,
              custom_fields: { import_source: 'excel', import_original: row.source }
            })
          })
          const ok = Boolean((resp as unknown as { data?: { id?: string } }).data?.id)
          if (ok) success += 1
          else failed += 1
        } catch (e) {
          failed += 1
          nextErrors.push({ rowNumber: row.rowNumber, message: e instanceof Error ? e.message : 'Erro ao criar chamado' })
        }
        setImportResult({ total: rows.length, success, failed })
        await new Promise((r) => setTimeout(r, 30))
      }

      setImportErrors(nextErrors.slice(0, 200))
      await fetchTickets()
    } finally {
      setImporting(false)
    }
  }

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      try { console.log('[TicketList] updateTicketStatus', { ticketId, newStatus }) } catch (e) { void e }
      // Usa boardId da página, com fallback ao localStorage
      let currentBoardId: string | null = boardId
      try {
        if (!currentBoardId) {
          currentBoardId = localStorage.getItem('current_board_id') || null
        }
      } catch (err) { void err }
      const updates: { status: string; board_id?: string | null } = { status: newStatus }
      if (currentBoardId) {
        updates.board_id = currentBoardId
      }
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus, board_id: updates.board_id ?? t.board_id } : t))
      let persisted = false
      try {
        const resp = await apiFetch(`/tickets/${ticketId}`, { method: 'PUT', body: JSON.stringify(updates) })
        persisted = Boolean((resp as unknown as { success?: boolean }).success)
      } catch (err) {
        console.warn('Falha ao persistir status/board, mantendo atualização local:', err)
      }
      if (persisted) await fetchTickets()
    } catch (error) {
      console.error('Erro ao atualizar status do ticket:', error)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Open': return 'Aberto'
      case 'In Progress': return 'Em Andamento'
      case 'Resolved': return 'Resolvido'
      case 'Archived': return 'Arquivado'
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
    <div className={viewMode === 'kanban' ? 'flex flex-col h-full min-h-0 gap-6' : 'space-y-6'}>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Chamados</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Gerencie todos os chamados de suporte
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <ViewSelector viewMode={viewMode} setViewMode={setViewMode} />
          {(isAdmin || isTechnician) && (
            <button
              type="button"
              onClick={() => { setShowImportModal(true); resetImportState() }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Importar Cards (Excel)
            </button>
          )}
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
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
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

      <div className={`transition-all duration-300 ease-in-out min-h-0 ${viewMode === 'kanban' ? 'h-[70vh]' : ''}`}>
        {viewMode === 'list' ? (
          <>
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
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border`} style={getStatusStyle(ticket.status)}>
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
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border`} style={getStatusStyle(ticket.status)}>
                  {ticket.status === 'Open' ? 'Aberto' :
                   ticket.status === 'In Progress' ? 'Em Andamento' :
                   ticket.status === 'Resolved' ? 'Resolvido' : 
                   ticket.status === 'Archived' ? 'Arquivado' : 'Fechado'}
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
                <p className="font-medium text-sm">{ticket.requester?.name || ticket.requester?.email}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Atribuído:</span>
                <p className="font-medium">{ticket.assigned_to?.name || ticket.assigned_to?.email || '-'}</p>
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
        </>
        ) : (
          <div className="h-full min-h-0">
            <TicketKanbanView
              tickets={filteredTickets as unknown as import('../lib/supabase').Ticket[]}
              getStatusStyle={getStatusStyle}
              getPriorityColor={getPriorityColor}
              onStatusChange={updateTicketStatus}
            />
          </div>
        )}
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

      {showImportModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Importar cards via Excel</h3>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-300" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer w-fit">
                    <Upload className="w-4 h-4 mr-2" />
                    Selecionar arquivo
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void handleSelectImportFile(f)
                        e.currentTarget.value = ''
                      }}
                      disabled={importing}
                    />
                  </label>
                  <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {importFileName ? importFileName : 'Nenhum arquivo selecionado'}
                  </div>
                </div>

                {importParsingError && (
                  <div className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3">
                    {importParsingError}
                  </div>
                )}

                {importRows.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-sm text-gray-700 dark:text-gray-200">
                        Linhas lidas: <span className="font-medium">{importRows.length}</span> (título obrigatório)
                      </div>
                      <button
                        type="button"
                        onClick={runImport}
                        disabled={importing || importRows.filter((r) => r.title).length === 0}
                        className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
                      >
                        {importing ? 'Importando...' : 'Importar'}
                      </button>
                    </div>

                    {importResult && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        Sucesso: {importResult.success} | Falhas: {importResult.failed} | Total: {importResult.total}
                      </div>
                    )}

                    <div className="mt-3 overflow-auto max-h-56">
                      <table className="min-w-full text-sm">
                        <thead className="text-gray-500 dark:text-gray-400">
                          <tr>
                            <th className="text-left py-1 pr-3">Linha</th>
                            <th className="text-left py-1 pr-3">Título</th>
                            <th className="text-left py-1 pr-3">Categoria</th>
                            <th className="text-left py-1 pr-3">Prioridade</th>
                            <th className="text-left py-1 pr-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 dark:text-gray-200">
                          {importRows.slice(0, 10).map((r) => (
                            <tr key={r.rowNumber} className="border-t border-gray-200 dark:border-gray-800">
                              <td className="py-1 pr-3 whitespace-nowrap">{r.rowNumber}</td>
                              <td className="py-1 pr-3 max-w-[22rem] truncate">{r.title || '(sem título)'}</td>
                              <td className="py-1 pr-3 whitespace-nowrap">{r.category}</td>
                              <td className="py-1 pr-3 whitespace-nowrap">{r.priority}</td>
                              <td className="py-1 pr-3 whitespace-nowrap">{r.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {importRows.length > 10 && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Mostrando 10 de {importRows.length}
                      </div>
                    )}
                  </div>
                )}

                {importErrors.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                    <div className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Atenção</div>
                    <div className="mt-1 text-sm text-yellow-800 dark:text-yellow-300">
                      {importErrors.slice(0, 8).map((e) => (
                        <div key={`${e.rowNumber}-${e.message}`}>Linha {e.rowNumber}: {e.message}</div>
                      ))}
                      {importErrors.length > 8 && (
                        <div>+{importErrors.length - 8} outras ocorrências</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeImportModal}
                disabled={importing}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
