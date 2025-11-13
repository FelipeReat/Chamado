import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface ChangeLogItem {
  id: string
  timestamp: string
  user: string
  action: string
  details: any
}

export default function HistoryLog() {
  const [history, setHistory] = useState<ChangeLogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const settings = await apiFetch('/settings')
      const list = Array.isArray((settings as any)?.history) ? (settings as any).history : []
      setHistory(list)
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('pt-BR')

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <History className="w-5 h-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Histórico de Alterações</h3>
        </div>
      </div>
      <div className="px-6 py-4">
        {history.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum evento registrado.</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.action}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-300">
                    {formatDate(item.timestamp)}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Usuário:</span> {item.user}
                </div>
                {item.details && (
                  <pre className="mt-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded p-2 overflow-auto">
                    {JSON.stringify(item.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}