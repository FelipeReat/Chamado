import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { toast } from 'sonner'
import { Tag, Info, User as UserIcon } from 'lucide-react'

export default function PublicTicketForm() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState<{ name: string; email: string; title: string; description: string; category: string; priority: string; requester_id?: string; assigned_to_id?: string }>({
    name: '',
    email: '',
    title: '',
    description: '',
    category: 'Hardware',
    priority: 'Medium',
  })
  const [dynamicFields, setDynamicFields] = useState<any[]>([])
  const [customValues, setCustomValues] = useState<Record<string, any>>({})
  const [fieldConfigs, setFieldConfigs] = useState<Record<string, any>>({})
  const [users, setUsers] = useState<any[]>([])
  const [technicians, setTechnicians] = useState<any[]>([])
  const [departments, setDepartments] = useState<string[]>([])

  const defaultCategories = ['Hardware','Software','Rede','Email','Sistema','Outro']
  const defaultPriorities = [
    { value: 'Low', label: 'Baixa', icon: Info, color: 'text-green-600' },
    { value: 'Medium', label: 'Média', icon: Info, color: 'text-yellow-600' },
    { value: 'High', label: 'Alta', icon: Info, color: 'text-orange-600' },
    { value: 'Urgent', label: 'Urgente', icon: Info, color: 'text-red-600' },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await apiFetch('/public/settings')
        const fields = (settings as any)?.data?.formFields || []
        const activeRaw = fields.filter((f: any) => f.isActive).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        const byNameActive: Record<string, any> = {}
        activeRaw.forEach((f: any) => { byNameActive[f.name] = f })
        setDynamicFields(Object.values(byNameActive))
        const byNameAll: Record<string, any> = {}
        fields.forEach((f: any) => { byNameAll[f.name] = f })
        setFieldConfigs(byNameAll)
      } catch {}
    }
    loadSettings()
    const onSettingsUpdated = () => loadSettings()
    try { window.addEventListener('settingsUpdated', onSettingsUpdated as any) } catch {}
    return () => { try { window.removeEventListener('settingsUpdated', onSettingsUpdated as any) } catch {} }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const usersResp = await apiFetch('/public/users?role=user')
        const techResp = await apiFetch('/public/users?role=technician')
        setUsers(usersResp.data || [])
        setTechnicians(techResp.data || [])
      } catch {}
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const resp = await apiFetch('/public/departments')
        const list = Array.isArray((resp as any)?.data) ? (resp as any).data : []
        setDepartments(list)
      } catch {}
    })()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/public/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requester_id: (formData as any).requester_id || undefined,
          assigned_to_id: (formData as any).assigned_to_id || undefined,
          custom_fields: customValues
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setSubmitted(true)
      toast.success('Chamado enviado com sucesso!')
    } catch (error) {
      console.error('Erro ao enviar chamado público:', error)
      toast.error('Falha ao enviar chamado')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center transition-colors">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Chamado enviado!</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">Seu chamado foi registrado. A equipe de suporte entrará em contato.</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Você pode fechar esta aba.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto transition-colors">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg transition-colors">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 transition-colors">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Abrir Novo Chamado</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Preencha o formulário abaixo para registrar um novo chamado de suporte
            </p>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {(() => { const cfg = fieldConfigs['requester_id']; const show = cfg ? (cfg.isActive !== false && cfg.visibleInternal !== false) : true; return show })() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['requester_id']?.label || 'Solicitante (usuário)'}</label>
              <select value={(formData as any).requester_id || ''} onChange={(e) => setFormData({ ...formData, requester_id: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                <option value="">Selecionar usuário...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
            )}
          </div>

            {(() => { const cfg = fieldConfigs['title']; const show = cfg ? (cfg.isActive !== false && cfg.visibleInternal !== false) : true; return show })() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['title']?.label || 'Título do Chamado'}</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input name="title" value={formData.title} onChange={handleChange} required={Boolean(fieldConfigs['title']?.required ?? true)} placeholder={fieldConfigs['title']?.placeholder || 'Descreva brevemente o problema'} readOnly={Boolean(fieldConfigs['title']?.readonlyPublic)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-colors" />
              </div>
            </div>
            )}

            {(() => { const cfg = fieldConfigs['description']; const show = cfg ? (cfg.isActive !== false && cfg.visibleInternal !== false) : true; return show })() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['description']?.label || 'Descrição Detalhada'}</label>
              <div className="mt-1">
                <textarea name="description" value={formData.description} onChange={handleChange} required={Boolean(fieldConfigs['description']?.required ?? true)} placeholder={fieldConfigs['description']?.placeholder || 'Forneça detalhes sobre o problema, incluindo mensagens de erro, etapas para reproduzir, etc.'} rows={4} readOnly={Boolean(fieldConfigs['description']?.readonlyPublic)} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-colors" />
              </div>
            </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(() => { const cfg = fieldConfigs['category']; const show = cfg ? (cfg.isActive !== false && cfg.visibleInternal !== false) : true; return show })() && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['category']?.label || 'Categoria'}</label>
                <select name="category" value={formData.category} onChange={handleChange} required={Boolean(fieldConfigs['category']?.required ?? true)} disabled={Boolean(fieldConfigs['category']?.readonlyPublic)} className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                  {(Array.isArray(fieldConfigs['category']?.options) && fieldConfigs['category']?.options?.length ? fieldConfigs['category']!.options : defaultCategories).map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              )}
              {(() => { const cfg = fieldConfigs['priority']; const show = cfg ? (cfg.isActive !== false && cfg.visibleInternal !== false) : true; return show })() && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['priority']?.label || 'Prioridade'}</label>
                <div className="mt-1">
                  <select name="priority" value={formData.priority} onChange={handleChange} required={Boolean(fieldConfigs['priority']?.required ?? true)} disabled={Boolean(fieldConfigs['priority']?.readonlyPublic)} className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                    {(Array.isArray(fieldConfigs['priority']?.options) && fieldConfigs['priority']?.options?.length ? (fieldConfigs['priority']!.options as string[]).map(v => ({ value: v, label: v })) : defaultPriorities).map((p: any) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Info className="w-4 h-4 mr-1" />
                  <span>
                    {formData.priority === 'Urgent' && 'Problema crítico que impede o trabalho'}
                    {formData.priority === 'High' && 'Problema importante que afeta a produtividade'}
                    {formData.priority === 'Medium' && 'Problema moderado que pode esperar'}
                    {formData.priority === 'Low' && 'Problema menor ou melhoria'}
                  </span>
                </div>
              </div>
              )}
            {(() => { const cfg = fieldConfigs['assigned_to_id']; const show = cfg ? (cfg.isActive !== false && cfg.visibleInternal !== false) : true; return show })() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['assigned_to_id']?.label || 'Atribuir a'}</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <select value={(formData as any).assigned_to_id || ''} onChange={(e) => setFormData({ ...formData, assigned_to_id: e.target.value })} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" disabled={Boolean(fieldConfigs['assigned_to_id']?.readonlyInternal)}>
                  <option value="">Selecionar técnico...</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.name || t.email}</option>
                  ))}
                </select>
              </div>
            </div>
            )}
          </div>

            {(() => {
              const normalize = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '')
              const reserved = new Set([
                'title','titulo','titulodochamado',
                'description','descricao','descricaodetalhada',
                'category','categoria',
                'priority','prioridade',
                'assignedtoid','assigned_to_id','atribuir','atribuira',
                'requesterid','requester_id','solicitante'
              ])
              const extraFields = dynamicFields.filter((f: any) => {
                const n = normalize(f.name)
                return !reserved.has(n) && (f.visibleInternal !== false)
              })
              return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {extraFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'text' && (
                    <>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                    {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                    </>
                  )}
                  {field.type === 'user' && (
                    <>
                    <select
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    >
                      <option value="">Selecionar usuário...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                    {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                    </>
                  )}
                  {field.type === 'number' && (
                    <>
                    <input
                      type="number"
                      placeholder={field.placeholder}
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                    {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                    </>
                  )}
                  {field.type === 'email' && (
                    <>
                    <input
                      type="email"
                      placeholder={field.placeholder}
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                    {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                    </>
                )}
                {field.type === 'phone' && (
                  <>
                  <input
                    type="tel"
                      placeholder={field.placeholder}
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                    {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                  </>
                )}
                {field.type === 'url' && (
                  <>
                  <input
                    type="url"
                      placeholder={field.placeholder}
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                    {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                  </>
                )}
                {field.type === 'password' && (
                  <>
                  <input
                    type="password"
                    placeholder={field.placeholder}
                    value={customValues[field.name] ?? ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                    required={Boolean(field.required)}
                    readOnly={Boolean(field.readonlyPublic)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                  />
                  {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                  </>
                )}
                {field.type === 'currency' && (
                  <>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min={(field.validation as any)?.min ?? undefined}
                      max={(field.validation as any)?.max ?? undefined}
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      required={Boolean(field.required)}
                      readOnly={Boolean(field.readonlyPublic)}
                      className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                  </>
                )}
                {field.type === 'time' && (
                  <>
                  <input
                    type="time"
                    value={customValues[field.name] ?? ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                    required={Boolean(field.required)}
                    readOnly={Boolean(field.readonlyPublic)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                  />
                  {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                  </>
                )}
                {field.type === 'department' && (
                  <>
                  {Array.isArray(field.options) && field.options.length > 0 ? (
                    <select
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      required={Boolean(field.required)}
                      disabled={Boolean(field.readonlyPublic)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    >
                      <option value="">Selecione uma opção</option>
                      {(field.options || []).map((opt: string, i: number) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      required={Boolean(field.required)}
                      disabled={Boolean(field.readonlyPublic)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    >
                      <option value="">Selecione uma opção</option>
                      {departments.map((opt: string, i: number) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                  </>
                )}
                {field.type === 'location' && (
                  <>
                  <input
                    type="text"
                    placeholder={field.placeholder || 'Endereço completo'}
                    value={customValues[field.name] ?? ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                    required={Boolean(field.required)}
                    readOnly={Boolean(field.readonlyPublic)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                  />
                  {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                  </>
                )}
                  {field.type === 'date' && (
                    <>
                    <input
                      type="date"
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                    {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                    </>
                  )}
                  {field.type === 'datetime' && (
                    <input
                      type="datetime-local"
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                  )}
                  {field.type === 'select' && (
                    <>
                    <select
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    >
                      <option value="">Selecione uma opção</option>
                      {(field.options || []).map((opt: string, i: number) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                    </>
                  )}
                  {field.type === 'multiselect' && (
                    <>
                    <div className="space-y-2">
                      {(field.options || []).map((opt: string, i: number) => (
                        <label key={i} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={Array.isArray(customValues[field.name]) ? customValues[field.name].includes(opt) : false}
                            onChange={(e) => {
                              const current = Array.isArray(customValues[field.name]) ? customValues[field.name] : []
                              const next = e.target.checked ? [...current, opt] : current.filter((x: any) => x !== opt)
                              setCustomValues({ ...customValues, [field.name]: next })
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                        </label>
                      ))}
                    </div>
                    {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                    </>
                  )}
                  {field.type === 'checkbox' && (
                    <>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!customValues[field.name]}
                        onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{field.placeholder || 'Sim/Não'}</span>
                    </label>
                    {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                    </>
                  )}
                  {field.type === 'textarea' && (
                    <>
                    <textarea
                      placeholder={field.placeholder}
                      value={customValues[field.name] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                    {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                    </>
                  )}
                </div>
              ))}
            </div>
              )
            })()}

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button type="button" onClick={() => window.history.back()} className="w-full sm:w-auto text-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors">
                Cancelar
              </button>
              <button disabled={loading} type="submit" className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-blue-600 dark:hover:bg-blue-700">
                {loading ? 'Enviando...' : 'Criar Chamado'}
              </button>
            </div>
          </form>
        </div>
      </div>
  )
}
