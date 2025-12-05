import { useState, useEffect, useCallback, Fragment, useMemo } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'
import { 
  BarChart, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Download,
  Filter,
  Grid as GridIcon
} from 'lucide-react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart as RechartsLineChart, Line } from 'recharts'
import { normalizeStatusKey } from '../lib/kanbanMapping'

export default function Reports() {
  const { user, isAdmin, isTechnician } = useAuth()
  type ReportTicket = {
    id: string
    title: string
    status: string
    priority: string
    category: string
    created_at: string
    updated_at: string
    resolved_at?: string | null
    requester_id?: string
    assigned_to_id?: string | null
  }
  interface StatusSetting { name: string; color?: string; isActive?: boolean }
  const [tickets, setTickets] = useState<ReportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [availableStatuses, setAvailableStatuses] = useState<StatusSetting[]>([])
  const [chartData, setChartData] = useState({
    status: [],
    priority: [],
    category: [],
    monthly: [],
    daily: [],
    heatmap: []
  })
  const [metrics, setMetrics] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    avgResolutionTime: 0,
    userSatisfaction: 0,
    backlogAge: 0,
    highPriorityOpen: 0
  })
  const [technicians, setTechnicians] = useState<Array<{ id: string; name?: string; email: string }>>([])
  const [boards, setBoards] = useState<Array<{ id: string; name: string }>>([])
  const [filters, setFilters] = useState<{ technicianId: string; boardId: string; status: string; category: string }>({ technicianId: '', boardId: '', status: '', category: '' })
  const [audits, setAudits] = useState<Array<{ id: string; timestamp: string; change: { status: { before: string; after: string } } }>>([])
  const [phaseRows, setPhaseRows] = useState<Array<{ id: string; title: string; durations: Record<string, number> }>>([])
  const [phaseAverages, setPhaseAverages] = useState<Array<{ name: string; value: number }>>([])

  const columns = useMemo(() => {
    const allowed = (availableStatuses || []).map((s: any) => normalizeStatusKey(s.name))
    return allowed.length ? allowed : ['open','in-progress','resolved']
  }, [availableStatuses])

  const fetchTickets = useCallback(async () => {
    try {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange))
      const resp = await apiFetch('/tickets')
      let data: ReportTicket[] = (resp.data || []) as ReportTicket[]
      data = data.filter((t) => new Date(t.created_at) >= daysAgo)
      if (!(isAdmin || isTechnician)) data = data.filter((t) => t.requester_id === (user as any)?.id || t.assigned_to_id === (user as any)?.id)
      if (filters.technicianId) data = data.filter((t) => (t as any).assigned_to_id === filters.technicianId)
      if (filters.boardId) data = data.filter((t) => (t as any).board_id === filters.boardId)
      if (filters.status) data = data.filter(t => normalizeStatusKey(t.status) === normalizeStatusKey(filters.status))
      if (filters.category) data = data.filter(t => String(t.category).toLowerCase() === String(filters.category).toLowerCase())
      setTickets(data)
      processData(data)
    } catch (error) {
      console.error('Error fetching tickets:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [dateRange, isAdmin, isTechnician, user, filters])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  useEffect(() => {
    ;(async () => {
      try {
        const s = await apiFetch('/settings')
        setSettings(s)
        const raw = (s as Record<string, unknown>)
        const list = Array.isArray((raw as any)?.statuses) ? (raw as any).statuses as StatusSetting[] : []
        setAvailableStatuses(list.filter((x: StatusSetting) => x.isActive))
      } catch (err) { void err }
    })()
    ;(async () => {
      try {
        const resp = await apiFetch('/users')
        const dataAll = (resp.data || []) as Array<{ id: string; name?: string; email: string; role: string }>
        setTechnicians(dataAll.filter(u => u.role === 'technician').map(u => ({ id: u.id, name: u.name, email: u.email })))
      } catch {}
    })()
    ;(async () => {
      try {
        const resp = await apiFetch('/boards')
        const list = (resp.data || []) as Array<{ id: string; name: string }>
        setBoards(list)
      } catch {}
    })()
    ;(async () => {
      try {
        const resp = await apiFetch('/tickets/audit')
        setAudits((resp.data || []) as any[])
      } catch {}
    })()
  }, [])

  

  const processData = (tickets: ReportTicket[]) => {
    // Status distribution (dinâmico via configurações)
    const knownKeys = new Set<string>()
    const statusData = (Array.isArray(availableStatuses) ? availableStatuses : []).map((s: StatusSetting) => {
      const key = normalizeStatusKey(s.name)
      knownKeys.add(key)
      return {
        name: String(s.name),
        value: tickets.filter((t) => normalizeStatusKey(t.status) === key).length,
        color: typeof s.color === 'string' && s.color ? s.color : '#6B7280'
      }
    })
    // Agrupar quaisquer status desconhecidos sob "Outros"
    const othersCount = tickets.filter(t => !knownKeys.has(normalizeStatusKey(t.status))).length
    if (othersCount > 0) {
      statusData.push({ name: 'Outros', value: othersCount, color: '#9CA3AF' })
    }

    // Priority distribution
    const priorityData = [
      { name: 'Urgente', value: tickets.filter(t => t.priority === 'Urgent').length, color: '#EF4444' },
      { name: 'Alta', value: tickets.filter(t => t.priority === 'High').length, color: '#F97316' },
      { name: 'Média', value: tickets.filter(t => t.priority === 'Medium').length, color: '#EAB308' },
      { name: 'Baixa', value: tickets.filter(t => t.priority === 'Low').length, color: '#22C55E' }
    ]

    // Category distribution
    const categoryData = [
      { name: 'Hardware', value: tickets.filter(t => t.category === 'Hardware').length },
      { name: 'Software', value: tickets.filter(t => t.category === 'Software').length },
      { name: 'Rede', value: tickets.filter(t => t.category === 'Rede').length },
      { name: 'Email', value: tickets.filter(t => t.category === 'Email').length },
      { name: 'Sistema', value: tickets.filter(t => t.category === 'Sistema').length },
      { name: 'Outro', value: tickets.filter(t => t.category === 'Outro').length }
    ]

    // Monthly trend (last 6 months)
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      
      const monthTickets = tickets.filter(t => {
        const ticketDate = new Date(t.created_at)
        return ticketDate >= monthStart && ticketDate <= monthEnd
      })

      monthlyData.push({
        name: date.toLocaleDateString('pt-BR', { month: 'short' }),
        total: monthTickets.length,
        // Mantém "Resolved" como métrica de resolução principal
        resolved: monthTickets.filter(t => normalizeStatusKey(t.status) === 'resolved').length
      })
    }

    const days = parseInt(dateRange)
    const dailyData: Array<{ name: string; total: number; resolved: number }> = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      const dayTickets = tickets.filter(t => {
        const dt = new Date(t.created_at)
        return dt >= dayStart && dt <= dayEnd
      })
      dailyData.push({
        name: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        total: dayTickets.length,
        resolved: dayTickets.filter(t => normalizeStatusKey(t.status) === 'resolved').length
      })
    }
    const heat: Array<{ dow: number; hour: number; count: number }> = []
    for (let dow = 0; dow < 7; dow++) {
      for (let hour = 0; hour < 24; hour++) {
        const count = tickets.filter(t => {
          const dt = new Date(t.created_at)
          return dt.getDay() === dow && dt.getHours() === hour
        }).length
        heat.push({ dow, hour, count })
      }
    }
    setChartData({
      status: statusData,
      priority: priorityData,
      category: categoryData,
      monthly: monthlyData,
      daily: dailyData,
      heatmap: heat
    })

    // Calculate metrics
    const resolvedTickets = tickets.filter(t => normalizeStatusKey(t.status) === 'resolved')
    const avgResolutionTime = resolvedTickets.length > 0 
      ? resolvedTickets.reduce((acc, ticket) => {
          const created = new Date(ticket.created_at).getTime()
          const updated = new Date(ticket.updated_at).getTime()
          return acc + (updated - created)
        }, 0) / resolvedTickets.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0

    const openTickets = tickets.filter(t => normalizeStatusKey(t.status) === 'open' || normalizeStatusKey(t.status) === 'in-progress')
    const backlogAge = openTickets.length > 0 ? Math.round(openTickets.reduce((acc, t) => acc + ((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)), 0) / openTickets.length) : 0
    const highPriorityOpen = openTickets.filter(t => t.priority === 'High' || t.priority === 'Urgent').length
    setMetrics({
      total: tickets.length,
      open: tickets.filter(t => normalizeStatusKey(t.status) === 'open').length,
      inProgress: tickets.filter(t => normalizeStatusKey(t.status) === 'in-progress').length,
      resolved: resolvedTickets.length,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      userSatisfaction: 4.2,
      backlogAge,
      highPriorityOpen
    })

    const formatStatus = (s: string) => normalizeStatusKey(s)
    const rows: Array<{ id: string; title: string; durations: Record<string, number> }> = tickets.map((t) => {
      const auditsForTicket = audits.filter(a => a.id === t.id).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      let cursor = new Date(t.created_at).getTime()
      let currentStatus = auditsForTicket.length > 0 ? formatStatus(auditsForTicket[0].change.status.before) : formatStatus(t.status)
      if (!columns.includes(currentStatus)) currentStatus = columns[0]
      const durations: Record<string, number> = {}
      auditsForTicket.forEach(a => {
        const ts = new Date(a.timestamp).getTime()
        const key = currentStatus
        const delta = Math.max(0, ts - cursor)
        if (columns.includes(key)) durations[key] = (durations[key] || 0) + delta
        cursor = ts
        currentStatus = formatStatus(a.change.status.after)
        if (!columns.includes(currentStatus)) currentStatus = columns[0]
      })
      const end = t.resolved_at ? new Date(t.resolved_at).getTime() : new Date().getTime()
      const finalDelta = Math.max(0, end - cursor)
      if (columns.includes(currentStatus)) durations[currentStatus] = (durations[currentStatus] || 0) + finalDelta
      return { id: t.id, title: t.title, durations }
    })
    setPhaseRows(rows)
    const avg: Array<{ name: string; value: number }> = columns.map((k) => {
      const total = rows.reduce((acc, r) => acc + (r.durations[k] || 0), 0)
      return { name: k, value: rows.length ? Math.round(total / rows.length) : 0 }
    })
    setPhaseAverages(avg)
  }

  const exportData = () => {
    const data = {
      metrics,
      chartData,
      tickets: tickets.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        category: t.category,
        created_at: t.created_at,
        updated_at: t.updated_at
      }))
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-chamados-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const exportCSV = () => {
    const headers = ['id','title','status','priority','category','created_at','updated_at']
    const rows = tickets.map(t => [t.id, t.title, t.status, t.priority, t.category, t.created_at, t.updated_at])
    const csv = [headers.join(','), ...rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-chamados-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Relatórios e Métricas</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Análise detalhada dos chamados de suporte
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2 sm:space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="block px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100 transition-colors"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
          </select>
          <button
            onClick={exportData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </button>
        </div>
      

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-gray-500" />
        <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} className="px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100">
          <option value="">Todos Status</option>
          {(availableStatuses || []).map((s: any) => (
            <option key={s.id || s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
        <select value={filters.category} onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))} className="px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100">
          <option value="">Todas Categorias</option>
          {["Hardware","Software","Network","Other"].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filters.boardId} onChange={(e) => setFilters(prev => ({ ...prev, boardId: e.target.value }))} className="px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100">
          <option value="">Todos Boards</option>
          {boards.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
        </select>
        <select value={filters.technicianId} onChange={(e) => setFilters(prev => ({ ...prev, technicianId: e.target.value }))} className="px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100">
          <option value="">Todos Técnicos</option>
          {technicians.map(t => (<option key={t.id} value={t.id}>{t.name || t.email}</option>))}
        </select>
      </div>

      {/* Heatmap de criação por dia/hora */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
        <div className="flex items-center mb-4">
          <GridIcon className="w-5 h-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Heatmap de Criação (Dia x Hora)</h3>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[100px_repeat(24,minmax(0,1fr))] gap-1">
              <div></div>
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="text-xs text-gray-500 text-center">{h}:00</div>
              ))}
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((day, dow) => (
                <Fragment key={`row-${dow}`}>
                  <div className="text-xs text-gray-500 py-1">{day}</div>
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const cell = (chartData.heatmap as any[]).find((c: any) => c.dow === dow && c.hour === hour)
                    const v = cell ? cell.count : 0
                    const intensity = Math.min(1, v / 5)
                    const bg = intensity === 0 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-blue-200'
                    return <div key={`cell-${dow}-${hour}`} className={`h-6 ${bg}`} title={`${day} ${hour}:00 - ${v}`}></div>
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tempo por fase por chamado */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Tempo de Atendimento por Fase (por chamado)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chamado</th>
                {columns.map((name) => (
                  <th key={`col-${name}`} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {phaseRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">#{row.id.slice(0,8)} - {row.title}</td>
                  {columns.map((name) => {
                    const ms = row.durations[name] || 0
                    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    const label = days > 0 ? `${days}d ${hours}h` : `${hours}h`
                    return <td key={`cell-${row.id}-${name}`} className="px-3 py-2 text-gray-900 dark:text-gray-100">{label}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Médias por fase */}
      <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg shadow transition-colors">
        <h3 className="text-base lg:text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Tempo médio por Fase</h3>
        <div className="h-48 lg:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={phaseAverages.map(x => ({ name: x.name, value: Math.round(x.value / (1000*60*60)) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: 'Horas', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#0EA5E9" name="Horas" />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      
        <Filter className="w-4 h-4 text-gray-500" />
        <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} className="px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100">
          <option value="">Todos Status</option>
          {(availableStatuses || []).map((s: any) => (
            <option key={s.id || s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
        <select value={filters.category} onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))} className="px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100">
          <option value="">Todas Categorias</option>
          {['Hardware','Software','Network','Other'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filters.boardId} onChange={(e) => setFilters(prev => ({ ...prev, boardId: e.target.value }))} className="px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100">
          <option value="">Todos Boards</option>
          {boards.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
        </select>
        <select value={filters.technicianId} onChange={(e) => setFilters(prev => ({ ...prev, technicianId: e.target.value }))} className="px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100">
          <option value="">Todos Técnicos</option>
          {technicians.map(t => (<option key={t.id} value={t.id}>{t.name || t.email}</option>))}
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg shadow transition-colors">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <BarChart className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Total de Chamados</p>
            <p className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">{metrics.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg shadow transition-colors">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 lg:w-8 lg:h-8 bg-green-100 rounded-md flex items-center justify-center">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
              </div>
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Resolvidos</p>
            <p className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">{metrics.resolved}</p>
              <p className="text-xs text-gray-500">
                {metrics.total > 0 ? Math.round((metrics.resolved / metrics.total) * 100) : 0}% de resolução
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg shadow transition-colors">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 lg:w-8 lg:h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-600" />
              </div>
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Tempo Médio</p>
            <p className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">{metrics.avgResolutionTime}</p>
              <p className="text-xs text-gray-500">dias para resolução</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg shadow transition-colors">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Satisfação</p>
            <p className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">{metrics.userSatisfaction}</p>
              <p className="text-xs text-gray-500">de 5 estrelas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-8">
        {/* Status Distribution */}
      <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg shadow transition-colors">
        <h3 className="text-base lg:text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Distribuição por Status</h3>
          <div className="h-48 lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chartData.status}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props) => `${(props as any).name ?? ''} ${(((props as any).percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution */}
      <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg shadow transition-colors">
        <h3 className="text-base lg:text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Distribuição por Prioridade</h3>
          <div className="h-48 lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chartData.priority}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props) => `${(props as any).name ?? ''} ${(((props as any).percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.priority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend */}
      <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg shadow transition-colors">
          <h3 className="text-base lg:text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Tendência Mensal</h3>
          <div className="h-48 lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={chartData.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3B82F6" name="Total" />
                <Bar dataKey="resolved" fill="#10B981" name="Resolvidos" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
      <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg shadow transition-colors">
          <h3 className="text-base lg:text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Distribuição por Categoria</h3>
          <div className="h-48 lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={chartData.category} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip cursor={{ fill: 'transparent' }} wrapperStyle={{ outline: 'none' }} />
                <Bar dataKey="value" fill="#8B5CF6" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Trend */}
        <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg shadow transition-colors">
          <h3 className="text-base lg:text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Tendência Diária</h3>
          <div className="h-48 lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={chartData.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#6366F1" name="Total" />
                <Line type="monotone" dataKey="resolved" stroke="#22C55E" name="Resolvidos" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Estatísticas Detalhadas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Chamados por Status</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">Abertos:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{metrics.open}</span>
              </div>
              <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">Em Andamento:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{metrics.inProgress}</span>
              </div>
              <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">Resolvidos:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{metrics.resolved}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Eficiência</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Taxa de Resolução:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {metrics.total > 0 ? Math.round((metrics.resolved / metrics.total) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Tempo Médio:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{metrics.avgResolutionTime} dias</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Backlog Médio (dias):</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{metrics.backlogAge}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Abertos de Alta/Urgente:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{metrics.highPriorityOpen}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Satisfação:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{metrics.userSatisfaction}/5</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Volume</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">Total no Período:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{metrics.total}</span>
              </div>
              <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">Média Diária:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {dateRange === '7' ? Math.round(metrics.total / 7) :
                   dateRange === '30' ? Math.round(metrics.total / 30) :
                   dateRange === '90' ? Math.round(metrics.total / 90) :
                   Math.round(metrics.total / 365)}
                </span>
              </div>
              <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">Prioridade Alta:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {tickets.filter(t => t.priority === 'High' || t.priority === 'Urgent').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
