import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import StatusManager from '../components/StatusManager'
import FormEditor from '../components/FormEditor'
import KanbanCustomization from '../components/KanbanCustomization'
import AccessControl from '../components/AccessControl'
import DepartmentsManager from '../components/DepartmentsManager'
import HistoryLog from '../components/HistoryLog'
import { 
  Settings as SettingsIcon,
  BarChart3,
  FormInput,
  Layout,
  Users,
  History,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Save,
  FileJson,
  FileText,
  Building
} from 'lucide-react'

interface TabProps {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType<{ onUpdate: () => void }>
  preview?: React.ReactNode
}

const TABS: TabProps[] = [
  {
    id: 'status',
    label: 'Status',
    icon: BarChart3,
    component: StatusManager,
    preview: (
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Pré-visualização</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Em Análise</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Em Desenvolvimento</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Concluído</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'forms',
    label: 'Formulários',
    icon: FormInput,
    component: FormEditor,
    preview: (
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Pré-visualização</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Título</label>
            <div className="w-full h-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs px-2 flex items-center">
              <span className="text-gray-400">Digite o título...</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Descrição</label>
            <div className="w-full h-16 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs p-2">
              <span className="text-gray-400">Descreva o problema...</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'kanban',
    label: 'Kanban',
    icon: Layout,
    component: KanbanCustomization,
    preview: (
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Pré-visualização</h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1">A Fazer</div>
            <div className="w-full h-8 bg-gray-100 dark:bg-gray-700 rounded text-xs flex items-center justify-center">
              <span className="text-gray-400">Card</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1">Em Progresso</div>
            <div className="w-full h-8 bg-gray-100 dark:bg-gray-700 rounded text-xs flex items-center justify-center">
              <span className="text-gray-400">Card</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1">Concluído</div>
            <div className="w-full h-8 bg-gray-100 dark:bg-gray-700 rounded text-xs flex items-center justify-center">
              <span className="text-gray-400">Card</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'access',
    label: 'Acesso',
    icon: Users,
    component: AccessControl
  },
  {
    id: 'history',
    label: 'Histórico',
    icon: History,
    component: HistoryLog
  },
  {
    id: 'export',
    label: 'Exportar/Importar',
    icon: FileJson,
    component: () => <div>Exportar/Importar Configurações</div>
  },
  {
    id: 'departments',
    label: 'Departamentos',
    icon: Building,
    component: DepartmentsManager
  }
]

export default function Settings() {
  const { user, isAdmin, isTechnician } = useAuth()
  const [activeTab, setActiveTab] = useState('status')
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/settings')
      setSettings(response as any)
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = () => {
    fetchSettings()
    setLastSaved(new Date())
  }

  const handleExport = async () => {
    try {
      const response = await apiFetch('/settings/export')
      const dataStr = JSON.stringify(response as any, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `configuracoes-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao exportar configurações:', error)
      alert('Erro ao exportar configurações')
    }
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        if (confirm('Tem certeza que deseja importar estas configurações? Isso substituirá as configurações atuais.')) {
          const response = await apiFetch('/settings/import', {
            method: 'POST',
            body: JSON.stringify({ user, settings: data })
          })
          
          alert('Configurações importadas com sucesso!')
          handleUpdate()
        }
      } catch (error) {
        console.error('Erro ao importar configurações:', error)
        alert('Erro ao importar configurações. Verifique o arquivo.')
      }
    }
    reader.readAsText(file)
  }

  const handleReset = () => {
    setShowResetConfirm(true)
  }
  const performReset = async () => {
    try {
      setSaving(true)
      const response = await apiFetch('/settings/reset', {
        method: 'POST',
        body: JSON.stringify({ user })
      })
      alert('Configurações redefinidas com sucesso!')
      handleUpdate()
    } catch (error) {
      console.error('Erro ao redefinir configurações:', error)
      alert('Erro ao redefinir configurações')
    } finally {
      setSaving(false)
      setShowResetConfirm(false)
    }
  }

  const handleSaveAll = async () => {
    try {
      setSaving(true)
      const response = await apiFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify({ user, settings })
      })
      
      if (response.data) {
        setLastSaved(new Date())
        alert('Configurações salvas com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (!(isAdmin || isTechnician)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mr-4" />
              <div>
                <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200">
                  Acesso Negado
                </h2>
                <p className="text-yellow-700 dark:text-yellow-300 mt-2">
                  Você não tem permissão para acessar as configurações do sistema.
                  Entre em contato com um administrador se precisar fazer alterações.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const ActiveComponent = TABS.find(tab => tab.id === activeTab)?.component
  const currentTab = TABS.find(tab => tab.id === activeTab)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Configurações do Sistema
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Personalize o sistema de acordo com suas necessidades
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {lastSaved && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Salvo: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                  showPreview 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                Preview
              </button>
              
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md text-sm transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Tudo'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Abas laterais */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm">
              {TABS.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
            
            {/* Ações rápidas */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Ações Rápidas
              </h3>
              <div className="space-y-2">
                <button
                  onClick={handleExport}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </button>
                
                <label className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
                
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="w-full flex items-center px-3 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 disabled:opacity-50 rounded-md transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Resetar
                </button>
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Configuração */}
                    <div className="lg:col-span-2">
                      {ActiveComponent && <ActiveComponent onUpdate={handleUpdate} />}
                    </div>
                    
                    {/* Preview */}
                    {showPreview && currentTab?.preview && (
                      <div className="lg:col-span-1">
                        <div className="sticky top-6">
                          {currentTab.preview}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showResetConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Confirmar redefinição</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">Tem certeza que deseja redefinir todas as configurações para o padrão? Esta ação não pode ser desfeita.</p>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">Cancelar</button>
                <button onClick={performReset} disabled={saving} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Resetar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
