import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'
import { 
  BarChart, 
  PieChart, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Download
} from 'lucide-react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'

export default function Reports() {
  const { user, isAdmin, isTechnician } = useAuth()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [chartData, setChartData] = useState({
    status: [],
    priority: [],
    category: [],
    monthly: []
  })
  const [metrics, setMetrics] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    avgResolutionTime: 0,
    userSatisfaction: 0
  })

  useEffect(() => {
    fetchTickets()
  }, [dateRange])

  const fetchTickets = async () => {
    try {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange))
      const resp = await apiFetch('/tickets')
      let data = resp.data || []
      // apply date filter client-side
      data = data.filter((t: any) => new Date(t.created_at) >= daysAgo)
      if (!(isAdmin || isTechnician)) data = data.filter((t: any) => t.requester_id === user?.id || t.assigned_to_id === user?.id)
      setTickets(data)
      processData(data)
    } catch (error) {
      console.error('Error fetching tickets:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const processData = (tickets: any[]) => {
    // Status distribution
    const statusData = [
      { name: 'Abertos', value: tickets.filter(t => t.status === 'Open').length, color: '#3B82F6' },
      { name: 'Em Andamento', value: tickets.filter(t => t.status === 'In Progress').length, color: '#F59E0B' },
      { name: 'Resolvidos', value: tickets.filter(t => t.status === 'Resolved').length, color: '#10B981' }
    ]

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
        resolved: monthTickets.filter(t => t.status === 'Resolved').length
      })
    }

    setChartData({
      status: statusData,
      priority: priorityData,
      category: categoryData,
      monthly: monthlyData
    })

    // Calculate metrics
    const resolvedTickets = tickets.filter(t => t.status === 'Resolved')
    const avgResolutionTime = resolvedTickets.length > 0 
      ? resolvedTickets.reduce((acc, ticket) => {
          const created = new Date(ticket.created_at).getTime()
          const updated = new Date(ticket.updated_at).getTime()
          return acc + (updated - created)
        }, 0) / resolvedTickets.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0

    setMetrics({
      total: tickets.length,
      open: tickets.filter(t => t.status === 'Open').length,
      inProgress: tickets.filter(t => t.status === 'In Progress').length,
      resolved: resolvedTickets.length,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      userSatisfaction: 4.2 // Mock data - would come from user feedback
    })
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
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
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
        </div>
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
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
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
