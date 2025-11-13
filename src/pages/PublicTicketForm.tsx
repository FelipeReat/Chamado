import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { toast } from 'sonner'

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

  const defaultCategories = ['Hardware','Software','Rede','Email','Sistema','Outro']
  const defaultPriorities = [
    { value: 'Low', label: 'Baixa' },
    { value: 'Medium', label: 'Média' },
    { value: 'High', label: 'Alta' },
    { value: 'Urgent', label: 'Urgente' },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    ;(async () => {
      try {
        const settings = await apiFetch('/public/settings')
        const fields = (settings as any)?.data?.formFields || []
        const activeRaw = fields.filter((f: any) => f.isActive).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        const byName: Record<string, any> = {}
        activeRaw.forEach((f: any) => { byName[f.name] = f })
        const active = Object.values(byName)
        setDynamicFields(active)
        const cfg: Record<string, any> = {}
        active.forEach((f: any) => { cfg[f.name] = f })
        setFieldConfigs(cfg)
      } catch {}
    })()
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg transition-colors">
          <div className="px-8 py-5 border-b border-gray-200 dark:border-gray-700 transition-colors">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Formulário de Chamado</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Preencha os campos abaixo para abrir um chamado sem precisar acessar o sistema.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fieldConfigs['name']?.visiblePublic !== false && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['name']?.label || 'Seu nome'}</label>
              <input name="name" value={formData.name} onChange={handleChange} required={Boolean(fieldConfigs['name']?.required ?? true)} placeholder={fieldConfigs['name']?.placeholder || ''} readOnly={Boolean(fieldConfigs['name']?.readonlyPublic)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
            </div>
            )}
            {fieldConfigs['email']?.visiblePublic !== false && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['email']?.label || 'Seu email'}</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required={Boolean(fieldConfigs['email']?.required ?? true)} placeholder={fieldConfigs['email']?.placeholder || ''} readOnly={Boolean(fieldConfigs['email']?.readonlyPublic)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
            </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Solicitante (usuário)</label>
              <select value={(formData as any).requester_id || ''} onChange={(e) => setFormData({ ...formData, requester_id: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                <option value="">Selecionar usuário...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
          </div>

            {fieldConfigs['title']?.visiblePublic !== false && (
            <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['title']?.label || 'Título do chamado'}</label>
            <input name="title" value={formData.title} onChange={handleChange} required={Boolean(fieldConfigs['title']?.required ?? true)} placeholder={fieldConfigs['title']?.placeholder || ''} readOnly={Boolean(fieldConfigs['title']?.readonlyPublic)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
          </div>
            )}

            {fieldConfigs['description']?.visiblePublic !== false && (
            <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['description']?.label || 'Descrição'}</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required={Boolean(fieldConfigs['description']?.required ?? true)} placeholder={fieldConfigs['description']?.placeholder || ''} rows={5} readOnly={Boolean(fieldConfigs['description']?.readonlyPublic)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
          </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fieldConfigs['category']?.visiblePublic !== false && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['category']?.label || 'Categoria'}</label>
                <select name="category" value={formData.category} onChange={handleChange} required={Boolean(fieldConfigs['category']?.required ?? true)} disabled={Boolean(fieldConfigs['category']?.readonlyPublic)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                  {(Array.isArray(fieldConfigs['category']?.options) && fieldConfigs['category']?.options?.length ? fieldConfigs['category']!.options : defaultCategories).map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              )}
              {fieldConfigs['priority']?.visiblePublic !== false && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['priority']?.label || 'Prioridade'}</label>
                <select name="priority" value={formData.priority} onChange={handleChange} required={Boolean(fieldConfigs['priority']?.required ?? true)} disabled={Boolean(fieldConfigs['priority']?.readonlyPublic)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                  {(Array.isArray(fieldConfigs['priority']?.options) && fieldConfigs['priority']?.options?.length ? (fieldConfigs['priority']!.options as string[]).map(v => ({ value: v, label: v })) : defaultPriorities).map((p: any) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
              </select>
            </div>
              )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Atribuir a (técnico)</label>
              <select value={(formData as any).assigned_to_id || ''} onChange={(e) => setFormData({ ...formData, assigned_to_id: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                <option value="">Selecionar técnico...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.name || t.email}</option>
                ))}
              </select>
            </div>
          </div>

            {(() => {
              const builtinNames = ['name','email','title','description','category','priority','assigned_to_id','requester_id']
              const extraFields = dynamicFields.filter((f: any) => !builtinNames.includes(String(f.name)) && (f.visiblePublic !== false))
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

            <div className="pt-2">
              <button disabled={loading} type="submit" className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {loading ? 'Enviando...' : 'Enviar Chamado'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
