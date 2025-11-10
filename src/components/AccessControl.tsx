import { useState, useEffect } from 'react'
import { Shield, User, Key, History, RefreshCw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'

interface Permission {
  id: string
  name: string
  description: string
  adminOnly: boolean
}

interface ChangeLog {
  id: string
  timestamp: string
  user: string
  action: string
  details: string
}

const defaultPermissions: Permission[] = [
  { id: 'manage_statuses', name: 'Gerenciar Status', description: 'Criar, editar e remover status', adminOnly: true },
  { id: 'manage_forms', name: 'Gerenciar Formulários', description: 'Personalizar campos do formulário', adminOnly: true },
  { id: 'manage_kanban', name: 'Gerenciar Kanban', description: 'Configurar colunas e limites do Kanban', adminOnly: true },
  { id: 'manage_users', name: 'Gerenciar Usuários', description: 'Criar e gerenciar usuários', adminOnly: true },
  { id: 'view_reports', name: 'Visualizar Relatórios', description: 'Acessar relatórios e estatísticas', adminOnly: false },
  { id: 'manage_all_tickets', name: 'Gerenciar Todos Chamados', description: 'Editar qualquer chamado do sistema', adminOnly: true },
  { id: 'export_import_settings', name: 'Exportar/Importar Configurações', description: 'Fazer backup e restaurar configurações', adminOnly: true },
  { id: 'reset_settings', name: 'Redefinir Configurações', description: 'Restaurar configurações padrão', adminOnly: true }
]

export default function AccessControl() {
  const { user, isAdmin } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>(defaultPermissions)
  const [changeLog, setChangeLog] = useState<ChangeLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await apiFetch('/settings')
      if (response.data?.accessControl) {
        setPermissions(response.data.accessControl.permissions || defaultPermissions)
        setChangeLog(response.data.accessControl.changeLog || [])
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToChangeLog = (action: string, details: string) => {
    const newLog: ChangeLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: user?.user_metadata?.name || user?.email || 'Sistema',
      action,
      details
    }
    const updatedLog = [newLog, ...changeLog].slice(0, 50) // Mantém apenas os 50 últimos registros
    setChangeLog(updatedLog)
    return updatedLog
  }

  const handlePermissionChange = async (permissionId: string, adminOnly: boolean) => {
    if (!isAdmin) return

    const updatedPermissions = permissions.map(p => 
      p.id === permissionId ? { ...p, adminOnly } : p
    )
    setPermissions(updatedPermissions)

    const permission = updatedPermissions.find(p => p.id === permissionId)
    const updatedLog = addToChangeLog(
      'Alterar Permissão',
      `${permission?.name} - ${adminOnly ? 'Apenas Admin' : 'Todos usuários'}`
    )

    try {
      await apiFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          accessControl: {
            permissions: updatedPermissions,
            changeLog: updatedLog
          }
        })
      })
    } catch (error) {
      console.error('Erro ao salvar permissões:', error)
    }
  }

  const handleResetPermissions = async () => {
    if (!isAdmin) return
    if (!confirm('Tem certeza que deseja restaurar as permissões padrão?')) return

    setPermissions(defaultPermissions)
    const updatedLog = addToChangeLog('Redefinir Permissões', 'Restaurado para configurações padrão')

    try {
      await apiFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          accessControl: {
            permissions: defaultPermissions,
            changeLog: updatedLog
          }
        })
      })
    } catch (error) {
      console.error('Erro ao redefinir permissões:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Permissões */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Key className="w-5 h-5 text-gray-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Permissões do Sistema</h3>
            </div>
            <button
              onClick={handleResetPermissions}
              disabled={!isAdmin}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restaurar Padrão
            </button>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-4">
            {permissions.map((permission) => (
              <div key={permission.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 text-gray-500 mr-2" />
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{permission.name}</h4>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{permission.description}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name={`permission-${permission.id}`}
                      checked={!permission.adminOnly}
                      onChange={() => handlePermissionChange(permission.id, false)}
                      disabled={!isAdmin}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Todos</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name={`permission-${permission.id}`}
                      checked={permission.adminOnly}
                      onChange={() => handlePermissionChange(permission.id, true)}
                      disabled={!isAdmin}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Apenas Admin</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Histórico de Alterações */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <History className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Histórico de Alterações</h3>
          </div>
        </div>
        <div className="px-6 py-4">
          {changeLog.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhuma alteração registrada</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {changeLog.map((log) => (
                <div key={log.id} className="flex items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0">
                    <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.action}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(log.timestamp)}</p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{log.details}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Por: {log.user}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}