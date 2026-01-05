import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { AlertCircle, CheckCircle2, ClipboardList, LayoutGrid, User as UserIcon } from 'lucide-react'

type ListUser = {
  id: string
  email: string
  name?: string
  role: 'user' | 'technician' | 'admin'
}

type ListTicket = {
  id: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  created_at: string
  updated_at?: string
  board_id?: string | null
  requester?: { email?: string; name?: string; user_metadata?: { full_name?: string } }
  assigned_to?: { email?: string; name?: string; user_metadata?: { full_name?: string } }
  assigned_to_id?: string | null
  requester_id?: string
}

function priorityLabel(priority: string) {
  if (priority === 'Urgent') return 'Urgente'
  if (priority === 'High') return 'Alta'
  if (priority === 'Medium') return 'Média'
  if (priority === 'Low') return 'Baixa'
  return priority
}

function priorityBadge(priority: string) {
  if (priority === 'Urgent') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
  if (priority === 'High') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
  if (priority === 'Medium') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
  if (priority === 'Low') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

function isOpenLikeStatus(status: string) {
  return status === 'Open' || status === 'In Progress'
}

function isDoneLikeStatus(status: string) {
  return status === 'Resolved' || status === 'Closed'
}

function statusLabel(status: string) {
  if (status === 'Open') return 'Aberto'
  if (status === 'In Progress') return 'Em atendimento'
  if (status === 'Resolved') return 'Concluído'
  if (status === 'Closed') return 'Fechado'
  return status
}

function statusBadge(status: string) {
  if (status === 'Open') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
  if (status === 'In Progress') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
  if (status === 'Resolved') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
  if (status === 'Closed') return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

export default function TechnicianDashboard() {
  const { user, isTechnician, isAdmin, isViewer } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<ListTicket[]>([])
  const [technicians, setTechnicians] = useState<ListUser[]>([])
  const [alertVisible, setAlertVisible] = useState(false)
  const [flashOpenCount, setFlashOpenCount] = useState<number | null>(null)
  const [flashKey, setFlashKey] = useState(0)
  const openListRef = useRef<HTMLDivElement | null>(null)
  const knownOpenIdsRef = useRef<Set<string>>(new Set())
  const alertHideTimerRef = useRef<number | null>(null)
  const flashTimerRef = useRef<number | null>(null)

  const fetchUsers = useCallback(async () => {
    const resp = await apiFetch('/users')
    const all = (resp as { data?: ListUser[] }).data || []
    setTechnicians(all.filter((u) => u.role === 'technician'))
  }, [])

  const fetchTickets = useCallback(async () => {
    const resp = await apiFetch('/tickets')
    const data = ((resp as { data?: ListTicket[] }).data || []) as ListTicket[]
    setTickets(data)

    const openIds = new Set(data.filter((t) => isOpenLikeStatus(t.status)).map((t) => t.id))
    const knownOpen = knownOpenIdsRef.current
    let newOpen = 0
    openIds.forEach((id) => {
      if (!knownOpen.has(id)) newOpen += 1
    })
    knownOpenIdsRef.current = openIds

    if (newOpen > 0) {
      setAlertVisible(true)
      if (alertHideTimerRef.current !== null) window.clearTimeout(alertHideTimerRef.current)
      alertHideTimerRef.current = window.setTimeout(() => setAlertVisible(false), 60000)
    } else if (openIds.size === 0) {
      setAlertVisible(false)
      if (alertHideTimerRef.current !== null) window.clearTimeout(alertHideTimerRef.current)
      alertHideTimerRef.current = null
    }

    if (newOpen > 0) {
      setFlashOpenCount(openIds.size)
      setFlashKey((k) => k + 1)
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current)
      flashTimerRef.current = window.setTimeout(() => setFlashOpenCount(null), 8000)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (alertHideTimerRef.current !== null) window.clearTimeout(alertHideTimerRef.current)
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        await Promise.all([fetchTickets(), fetchUsers()])
      } finally {
        setLoading(false)
      }
    })()
  }, [fetchTickets, fetchUsers])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchTickets()
    }, 15000)
    return () => window.clearInterval(interval)
  }, [fetchTickets])

  useEffect(() => {
    const envBase = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL || ''
    const looksLikePreview = (b: string) => b.includes('localhost:5006') || b.includes('localhost:5173') || b.includes('localhost:5174')
    const API_BASE = (!envBase || looksLikePreview(envBase)) ? 'http://localhost:3000' : envBase
    let es: EventSource | null = null
    let stopped = false
    const onCreated: EventListener = () => { void fetchTickets() }
    const open = async () => {
      if (stopped) return
      try {
        const res = await fetch(`${API_BASE}/api/health`)
        if (!res.ok) throw new Error('unhealthy')
        es = new EventSource(`${API_BASE}/api/notifications/stream`)
        es.addEventListener('ticket-created', onCreated)
        es.onerror = () => {
          try { es?.close() } catch { void 0 }
          es = null
          setTimeout(open, 5000)
        }
      } catch {
        setTimeout(open, 5000)
      }
    }
    void open()
    return () => {
      stopped = true
      if (es) {
        try { es.removeEventListener('ticket-created', onCreated) } catch { void 0 }
        try { es.close() } catch { void 0 }
      }
    }
  }, [fetchTickets])

  const metrics = useMemo(() => {
    const totalChamados = tickets.length
    const totalCardsCriados = tickets.filter((t) => t.board_id).length
    const totalAbertos = tickets.filter((t) => isOpenLikeStatus(t.status)).length
    const totalConcluidos = tickets.filter((t) => isDoneLikeStatus(t.status)).length
    return { totalChamados, totalCardsCriados, totalAbertos, totalConcluidos }
  }, [tickets])

  const openTickets = useMemo(() => {
    return [...tickets]
      .filter((t) => isOpenLikeStatus(t.status))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
  }, [tickets])

  const ranking = useMemo(() => {
    const byTech: Array<{ id: string; name: string; count: number }> = technicians.map((t) => {
      const name = t.name || t.email || 'Técnico'
      const count = tickets.filter((x) => x.assigned_to_id === t.id && isOpenLikeStatus(x.status)).length
      return { id: t.id, name, count }
    })
    byTech.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    return byTech
  }, [technicians, tickets])

  const technicianNameById = useMemo(() => {
    return new Map(technicians.map((t) => [t.id, t.name || t.email || 'Técnico']))
  }, [technicians])

  const canSee = Boolean(user && (isTechnician || isAdmin || isViewer))

  if (!canSee) {
    return null
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-700 dark:text-blue-200" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-300">Total de Chamados</div>
              <div className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{metrics.totalChamados}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-indigo-700 dark:text-indigo-200" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-300">Total de Cards Criados</div>
              <div className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{metrics.totalCardsCriados}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-700 dark:text-yellow-200" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-300">Chamados em Aberto</div>
              <div className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{metrics.totalAbertos}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-700 dark:text-green-200" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-300">Cards Concluídos</div>
              <div className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{metrics.totalConcluidos}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div ref={openListRef} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Cards em Aberto</h2>
            <Link to="/chamados" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200">
              Ver todos
            </Link>
          </div>
          {openTickets.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-300">Nenhum chamado em aberto no momento.</div>
          ) : (
            <div className="space-y-3">
              {openTickets.map((t) => (
                <Link
                  key={t.id}
                  to={`/chamados/${t.id}`}
                  className="block rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                        #{t.id.slice(0, 8)} — {t.title}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {t.description}
                      </div>

                      <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Técnico:{' '}
                        {t.assigned_to?.user_metadata?.full_name ||
                          t.assigned_to?.name ||
                          t.assigned_to?.email ||
                          (t.assigned_to_id ? technicianNameById.get(t.assigned_to_id) : undefined) ||
                          (t.assigned_to_id ? 'Vinculado' : 'sem vinculo')}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(t.status)}`}>
                          {statusLabel(t.status)}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityBadge(t.priority)}`}>
                          {priorityLabel(t.priority)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Ranking de Atendimento (Técnicos)</h2>
            <div className="text-xs text-gray-500 dark:text-gray-400">Atualiza automaticamente</div>
          </div>

          {ranking.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-300">Nenhum técnico cadastrado.</div>
          ) : (
            <div className="space-y-2">
              {ranking.map((r, idx) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Chamados em atendimento</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                    <div className="text-xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{r.count}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {alertVisible && metrics.totalAbertos > 0 && (
        <div
          key={flashKey}
          className="fixed bottom-6 right-6 z-50 max-w-sm"
          aria-live="polite"
        >
          <button
            type="button"
            onClick={() => openListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className={`w-full text-left rounded-xl shadow-xl border p-4 transition-colors ${
              flashOpenCount !== null
                ? 'bg-red-600 border-red-300 text-white animate-bounce'
                : 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100 animate-pulse'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold">
                  {flashOpenCount !== null ? 'Novo chamado em aberto!' : 'Atenção: chamados em aberto'}
                </div>
                <div className="text-sm opacity-90">
                  {metrics.totalAbertos} chamado(s) aguardando atendimento. Clique para ver a lista.
                </div>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
