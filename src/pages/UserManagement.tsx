import { useState, useEffect } from 'react'
import { type User } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'
import { sendPasswordResetEmail } from '../utils/notifications'
import { 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Shield, 
  User as UserIcon,
  Mail,
  Calendar,
  Key,
  Save,
  X
} from 'lucide-react'

export default function UserManagement() {
  const { user: currentUser, isAdmin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as 'admin' | 'technician' | 'user'
  })

  const roles = [
    { value: 'user', label: 'Usuário', description: 'Pode criar e visualizar seus chamados' },
    { value: 'technician', label: 'Técnico', description: 'Pode visualizar e atender chamados' },
    { value: 'admin', label: 'Administrador', description: 'Acesso completo ao sistema' }
  ]

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const resp = await apiFetch('/users')
      setUsers(resp.data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAdmin) {
      toast.error('Apenas administradores podem criar usuários')
      return
    }

    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.full_name,
          role: formData.role,
        })
      })

      toast.success('Usuário criado com sucesso!')
      setShowAddModal(false)
      setFormData({ email: '', password: '', full_name: '', role: 'user' })
      fetchUsers()
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('Erro ao criar usuário')
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingUser) return
    if (!isAdmin) {
      toast.error('Apenas administradores podem editar usuários')
      return
    }

    try {
      await apiFetch(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: formData.full_name, role: formData.role })
      })

      toast.success('Usuário atualizado com sucesso!')
      setEditingUser(null)
      setFormData({ email: '', password: '', full_name: '', role: 'user' })
      fetchUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Erro ao atualizar usuário')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem excluir usuários')
      return
    }
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return
    }

    if (userId === currentUser?.id) {
      toast.error('Você não pode excluir seu próprio usuário')
      return
    }

    try {
      const resp = await apiFetch(`/users/${userId}`, { method: 'DELETE' })
      const unassigned = (resp.meta?.tickets_unassigned as number) || 0
      toast.success(`Usuário excluído com sucesso! ${unassigned ? `(${unassigned} chamados desatribuídos)` : ''}`)
      await fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Erro ao excluir usuário')
    }
  }

  const handleResetPassword = async (userId: string, email: string) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem redefinir senhas')
      return
    }
    try {
      await sendPasswordResetEmail(email, `${window.location.origin}/reset-password`) // placeholder
      
      toast.success('Email de redefinição de senha enviado!')
    } catch (error) {
      console.error('Error sending password reset:', error)
      toast.error('Erro ao enviar email de redefinição')
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openModal = (type: 'add' | 'edit', user?: User) => {
    if (type === 'add') {
      setFormData({ email: '', password: '', full_name: '', role: 'user' })
      setShowAddModal(true)
    } else if (user) {
      setFormData({
        email: user.email,
        password: '',
        full_name: (user.name as string) || '',
        role: ((user.role as string) || 'user') as 'user' | 'technician' | 'admin'
      })
      setEditingUser(user)
    }
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingUser(null)
    setFormData({ email: '', password: '', full_name: '', role: 'user' })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 transition-colors">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestão de Usuários</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Gerencie os usuários do sistema e suas permissões
          </p>
        </div>
        {isAdmin && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => openModal('add')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Usuário
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-colors">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Lista de Usuários - Desktop */}
      <div className="hidden md:block bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md transition-colors">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {filteredUsers.length} usuário(s) encontrado(s)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Função
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user.name || user.email}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      (user.role as string) === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                      (user.role as string) === 'technician' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}>
                      {(user.role as string) === 'admin' ? 'Administrador' :
                       (user.role as string) === 'technician' ? 'Técnico' : 'Usuário'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      (user as any).email_confirmed_at ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}>
                      {(user as any).email_confirmed_at ? 'Ativo' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => isAdmin && openModal('edit', user)}
                        className={`text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Editar usuário"
                        disabled={!isAdmin}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => isAdmin && handleResetPassword(user.id, user.email)}
                        className={`text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Redefinir senha"
                        disabled={!isAdmin}
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => isAdmin && handleDeleteUser(user.id)}
                        className={`text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Excluir usuário"
                        disabled={!isAdmin || user.id === currentUser?.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Tente ajustar sua busca ou adicione um novo usuário.
            </p>
            {isAdmin && (
              <button
                onClick={() => openModal('add')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Usuário
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lista de Usuários - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {user.name || user.email}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className={`px-2 py-1 text-xs rounded-full ${
                    (user.role as string) === 'admin' ? 'bg-red-100 text-red-800' :
                    (user.role as string) === 'technician' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}>
                    {(user.role as string) === 'admin' ? 'Administrador' :
                     (user.role as string) === 'technician' ? 'Técnico' : 'Usuário'}
                  </span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                      (user as any).email_confirmed_at ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}>
                      {(user as any).email_confirmed_at ? 'Ativo' : 'Pendente'}
                    </span>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <p>Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => isAdmin && openModal('edit', user)}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!isAdmin}
              >
                Editar
              </button>
              <button
                onClick={() => isAdmin && handleResetPassword(user.id, user.email)}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 dark:border-green-800 rounded-md text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!isAdmin}
              >
                Redefinir Senha
              </button>
              <button
                onClick={() => isAdmin && handleDeleteUser(user.id)}
                className={`inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-800 rounded-md text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!isAdmin || user.id === currentUser?.id}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 transition-colors rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
              </h3>
            </div>

            <form onSubmit={editingUser ? handleEditUser : handleAddUser} className="px-6 py-4 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    disabled={!!editingUser}
                  />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Senha
                  </label>
                  <input
                    type="password"
                    id="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    placeholder={editingUser ? 'Deixe em branco para manter a senha atual' : 'Mínimo 6 caracteres'}
                  />
                </div>
              )}

              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome Completo
                </label>
                <input
                  type="text"
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Função
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'technician' | 'user' }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {roles.find(r => r.value === formData.role)?.description}
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <X className="w-4 h-4 mr-2 inline" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingUser ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}