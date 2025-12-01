import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Tag, Info } from 'lucide-react'

export default function PublicTicketForm() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  type ValueType = string | number | boolean | string[]
  interface FieldValidation { minLength?: number; maxLength?: number; min?: number; max?: number; pattern?: string; customMessage?: string }
  type FieldType = 'text' | 'number' | 'email' | 'phone' | 'url' | 'date' | 'datetime' | 'select' | 'multiselect' | 'checkbox' | 'textarea'
  interface FormField { id: string; name: string; label: string; type: FieldType; required?: boolean; placeholder?: string; options?: string[]; optionsFromUsers?: boolean; isActive?: boolean; visiblePublic?: boolean; visibleInternal?: boolean; readonlyPublic?: boolean; readonlyInternal?: boolean; defaultValue?: ValueType; helpText?: string; validation?: FieldValidation; order?: number }
  
  const [fieldConfigs, setFieldConfigs] = useState<Record<string, Partial<FormField>>>({})
  
  const [customFields, setCustomFields] = useState<FormField[]>([])
  const [customValues, setCustomValues] = useState<Record<string, ValueType>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [orderedFields, setOrderedFields] = useState<FormField[]>([])
  const [publicUserNames, setPublicUserNames] = useState<string[]>([])
  const [attachments, setAttachments] = useState<string[]>([])
  const formatPhone = (v: string) => {
    const d = String(v || '').replace(/\D+/g, '').slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }
  const [formData, setFormData] = useState<{ name: string; email: string; title: string; description: string; category: string; priority: string; requester_id?: string; assigned_to_id?: string }>({
    name: '',
    email: '',
    title: '',
    description: '',
    category: 'Hardware',
    priority: 'Medium',
  })
  

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
    (async () => {
      try {
        const res = await fetch('/api/public/settings')
        if (!res.ok) return
        const json = await res.json()
        const dataObj = json as unknown as { data?: { formFields?: FormField[] } }
        const fields: FormField[] = Array.isArray(dataObj?.data?.formFields) ? (dataObj.data!.formFields as FormField[]) : []
        const byName: Record<string, Partial<FormField>> = {}
        fields.forEach((f: FormField) => { byName[f.name] = f })
        setFieldConfigs(byName)
        const customs = fields.filter((f: FormField) => (f.isActive ?? true) && (f.visiblePublic ?? true) && !['name','email','title','description','category','priority','assigned_to_id','requester_id'].includes(f.name))
        setCustomFields(customs)
        setCustomValues(prev => {
          const next = { ...prev }
          customs.forEach((f: FormField) => {
            if (f.defaultValue !== undefined && next[f.name] === undefined) next[f.name] = f.defaultValue as ValueType
          })
          return next
        })
        try {
          const rUsers = await fetch('/api/public/users')
          if (rUsers.ok) {
            const j = await rUsers.json()
            const list = ((j as any)?.data || []) as Array<{ name?: string; email?: string }>
            setPublicUserNames(list.map(u => (u.name || u.email || '')).filter(Boolean))
          }
        } catch {}
        const formOrder: string[] = Array.isArray((json as any)?.data?.formOrder) ? (((json as any).data.formOrder as string[]).map(String)) : []
        const defaultCategories = ['Hardware','Software','Rede','Email','Sistema','Outro']
        const defaultPriorities = ['Low','Medium','High','Urgent']
        const builtins: FormField[] = [
          { id: 'builtin:name', name: 'name', label: byName['name']?.label || 'Seu nome', type: 'text', required: Boolean(byName['name']?.required ?? true), order: 0, isActive: (byName['name']?.isActive ?? true) as boolean, visiblePublic: true, visibleInternal: false },
          { id: 'builtin:email', name: 'email', label: byName['email']?.label || 'Seu email', type: 'email', required: Boolean(byName['email']?.required ?? true), order: 0, isActive: (byName['email']?.isActive ?? true) as boolean, visiblePublic: true, visibleInternal: false },
          { id: 'builtin:title', name: 'title', label: byName['title']?.label || 'Título do Chamado', type: 'text', required: Boolean(byName['title']?.required ?? true), order: 1, isActive: (byName['title']?.isActive ?? true) as boolean, visiblePublic: true, visibleInternal: true },
          { id: 'builtin:description', name: 'description', label: byName['description']?.label || 'Descrição Detalhada', type: 'textarea', required: Boolean(byName['description']?.required ?? true), order: 2, isActive: (byName['description']?.isActive ?? true) as boolean, visiblePublic: true, visibleInternal: true },
          { id: 'builtin:category', name: 'category', label: byName['category']?.label || 'Categoria', type: 'select', required: Boolean(byName['category']?.required ?? true), options: (Array.isArray(byName['category']?.options) && byName['category']?.options?.length ? (byName['category']!.options as string[]) : defaultCategories), order: 3, isActive: (byName['category']?.isActive ?? true) as boolean, visiblePublic: true, visibleInternal: true },
          { id: 'builtin:priority', name: 'priority', label: byName['priority']?.label || 'Prioridade', type: 'select', required: Boolean(byName['priority']?.required ?? true), options: (Array.isArray(byName['priority']?.options) && byName['priority']?.options?.length ? (byName['priority']!.options as string[]) : defaultPriorities), order: 4, isActive: (byName['priority']?.isActive ?? true) as boolean, visiblePublic: true, visibleInternal: true },
        ]
        const merged: FormField[] = builtins.map(b => {
          const found = fields.find(f => f.name === b.name)
          return found ? { ...b, ...found } : b
        }).concat(fields.filter(f => !builtins.some(b => b.name === f.name)))
        const byId: Record<string, FormField> = {}
        merged.forEach(f => { byId[f.id] = f })
        let ordered: FormField[] = merged
        if (formOrder.length) {
          const orderSet = new Set(formOrder)
          const front = formOrder.map(id => byId[id]).filter(Boolean) as FormField[]
          const rest = merged.filter(f => !orderSet.has(f.id))
          ordered = front.concat(rest)
        } else {
          ordered = merged.sort((a, b) => ((a as any).order || 0) - ((b as any).order || 0))
        }
        const withDynamic = ordered.map(f => {
          if (f.type === 'select' && (f as any).optionsFromUsers) {
            return { ...f, options: publicUserNames.length ? publicUserNames : (f.options || []) }
          }
          return f
        })
        setOrderedFields(withDynamic.filter(f => (f.isActive ?? true) && (f.visiblePublic ?? true) && f.name !== 'email'))
      } catch (err) { void err }
    })()
  }, [])

  

  

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    customFields.forEach((field: FormField) => {
      const val = customValues[field.name]
      const req = Boolean(field.required)
      if (field.type === 'multiselect') {
        if (req && (!Array.isArray(val) || val.length === 0)) nextErrors[field.name] = 'Campo obrigatório'
      } else if (field.type === 'checkbox') {
        if (req && !val) nextErrors[field.name] = 'Campo obrigatório'
      } else {
        const empty = val === undefined || val === null || String(val).trim() === ''
        if (req && empty) nextErrors[field.name] = 'Campo obrigatório'
      }
      if (nextErrors[field.name]) return
      const v = val !== undefined && val !== null ? String(val) : ''
      const rules: FieldValidation = field.validation || {}
      if ((field.type === 'text' || field.type === 'textarea') && rules.minLength && v.length < rules.minLength) nextErrors[field.name] = rules.customMessage || `Mínimo de ${rules.minLength} caracteres`
      if ((field.type === 'text' || field.type === 'textarea') && rules.maxLength && v.length > rules.maxLength) nextErrors[field.name] = rules.customMessage || `Máximo de ${rules.maxLength} caracteres`
      if (field.type === 'number') {
        const n = Number(v)
        if (!Number.isFinite(n)) nextErrors[field.name] = 'Número inválido'
        if (rules.min !== undefined && n < Number(rules.min)) nextErrors[field.name] = rules.customMessage || `Mínimo ${rules.min}`
        if (rules.max !== undefined && n > Number(rules.max)) nextErrors[field.name] = rules.customMessage || `Máximo ${rules.max}`
      }
      if (field.type === 'email') {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        if (v && !ok) nextErrors[field.name] = 'Email inválido'
      }
      if (field.type === 'url') {
        try { if (v) new URL(v) } catch (err) { void err ; nextErrors[field.name] = 'URL inválida' }
      }
      if (field.type === 'phone') {
        const digits = v.replace(/\D+/g, '')
        if (v && digits.length < 10) nextErrors[field.name] = 'Telefone inválido'
      }
      if (rules.pattern) {
        try {
          const re = new RegExp(rules.pattern)
          if (v && !re.test(v)) nextErrors[field.name] = rules.customMessage || 'Valor inválido'
        } catch (err) { void err }
      }
    })
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { try { toast.error('Verifique os campos destacados') } catch (err) { void err } ; return }
    setLoading(true)
    try {
      const res = await fetch('/api/public/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requester_id: formData.requester_id || undefined,
          assigned_to_id: formData.assigned_to_id || undefined,
          custom_fields: { ...customValues, attachments }
        }),
      })
      if (!res.ok) throw new Error(await res.text())
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
            {orderedFields.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {orderedFields.map((field) => {
                  const fullSpan = ['title','description'].includes(field.name) || field.type === 'textarea'
                  return (
                    <div key={field.id} className={fullSpan ? 'md:col-span-2' : ''}>
                      {field.name === 'name' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                          {field.type === 'select' ? (
                            <select name="name" value={formData.name} onChange={handleChange} required={Boolean(field.required)} className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                              <option value="">Selecione uma opção</option>
                              {(field.options || []).map((opt: string, i: number) => (
                                <option key={i} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input type="text" name="name" value={formData.name} onChange={handleChange} required={Boolean(field.required)} placeholder={field.placeholder || ''} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                          )}
                        </div>
                      )}
                      {field.name === 'email' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                          <input type="email" name="email" value={formData.email} onChange={handleChange} required={Boolean(field.required)} placeholder={field.placeholder || ''} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                        </div>
                      )}
                      {field.name === 'title' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Tag className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            </div>
                            <input name="title" value={formData.title} onChange={handleChange} required={Boolean(field.required)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-colors" placeholder={field.placeholder || 'Descreva brevemente o problema'} />
                          </div>
                        </div>
                      )}
                      {field.name === 'description' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                          <textarea name="description" value={formData.description} onChange={handleChange} required={Boolean(field.required)} rows={4} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-colors" placeholder={field.placeholder || 'Forneça detalhes sobre o problema, incluindo mensagens de erro, etapas para reproduzir, etc.'} />
                          <div className="mt-2">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                const files = e.target.files
                                if (!files || files.length === 0) { setAttachments([]); return }
                                const readers = Array.from(files).map((file) => new Promise<string>((resolve, reject) => {
                                  const reader = new FileReader()
                                  reader.onload = () => resolve(String(reader.result))
                                  reader.onerror = () => reject(reader.error)
                                  reader.readAsDataURL(file)
                                }))
                                Promise.all(readers).then(setAttachments).catch(() => setAttachments([]))
                              }}
                              className="block w-full text-sm text-gray-700 dark:text-gray-300"
                            />
                            {attachments.length > 0 && (
                              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {attachments.map((src, i) => (
                                  <img key={i} src={src} alt={`Anexo ${i + 1}`} className="rounded border border-gray-200 dark:border-gray-700 object-cover max-h-32 w-full" />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {field.name === 'category' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                          <select name="category" value={formData.category} onChange={handleChange} required={Boolean(field.required)} className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                            {(field.options || []).map((c: string) => (<option key={c} value={c}>{c}</option>))}
                          </select>
                        </div>
                      )}
                      {field.name === 'priority' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                          <select name="priority" value={formData.priority} onChange={handleChange} required={Boolean(field.required)} className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                            {((field.options || []) as string[]).map(v => ({ value: v, label: v })).map((p: { value: string; label: string }) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                          </select>
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
                      {!['name','email','title','description','category','priority','assigned_to_id','requester_id'].includes(field.name) && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            <span className="inline-flex items-center">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                              {field.helpText && <span className="ml-2" aria-label={String(field.helpText)}>
                                <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              </span>}
                            </span>
                          </label>
                          {field.type === 'text' && (
                            <>
                              <input type="text" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                              {(field.validation?.maxLength || field.validation?.minLength) && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
                                  {String(customValues[field.name] ?? '').length}{field.validation?.maxLength ? `/${field.validation.maxLength}` : ''}
                                  {!field.validation?.maxLength && field.validation?.minLength ? ` (mín ${field.validation.minLength})` : ''}
                                </div>
                              )}
                            </>
                          )}
                          {field.type === 'number' && (
                            <input type="number" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                          )}
                          {field.type === 'email' && (
                            <input type="email" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                          )}
                          {field.type === 'phone' && (
                            <input type="tel" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder || '(00) 00000-0000'} value={formatPhone(String(customValues[field.name] ?? ''))} onChange={(e) => setCustomValues({ ...customValues, [field.name]: formatPhone(e.target.value) })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                          )}
                          {field.type === 'url' && (
                            <input type="url" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                          )}
                          {field.type === 'date' && (
                            <input type="date" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                          )}
                          {field.type === 'datetime' && (
                            <input type="datetime-local" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                          )}
                          {field.type === 'select' && (
                            <select required={Boolean(field.required)} disabled={Boolean(field.readonlyPublic)} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                              <option value="">Selecione uma opção</option>
                              {(field.options || []).map((opt: string, i: number) => (
                                <option key={i} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}
                          {field.type === 'multiselect' && (
                            <div className="space-y-2">
                              {(field.options || []).map((opt: string, i: number) => (
                                <label key={i} className="flex items-center">
                                  <input type="checkbox" disabled={Boolean(field.readonlyPublic)} checked={Array.isArray(customValues[field.name]) ? (customValues[field.name] as string[]).includes(opt) : false} onChange={(e) => {
                                    const current = Array.isArray(customValues[field.name]) ? (customValues[field.name] as string[]) : []
                                    const next = e.target.checked ? [...current, opt] : current.filter((x: string) => x !== opt)
                                    setCustomValues({ ...customValues, [field.name]: next })
                                  }} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {field.type === 'checkbox' && (
                            <label className="flex items-center">
                              <input type="checkbox" disabled={Boolean(field.readonlyPublic)} checked={!!customValues[field.name]} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{field.placeholder || 'Sim/Não'}</span>
                            </label>
                          )}
                          {field.type === 'textarea' && (
                            <>
                              <textarea required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} rows={4} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {orderedFields.length === 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['name']?.label || 'Seu nome'}</label>
                {String((fieldConfigs['name'] as any)?.type || '') === 'select' ? (
                  <select name="name" value={formData.name} onChange={handleChange} required={Boolean(fieldConfigs['name']?.required ?? true)} className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                    <option value="">Selecione uma opção</option>
                    {(((fieldConfigs['name'] as any)?.optionsFromUsers ? publicUserNames : (fieldConfigs['name']?.options || [])) as string[]).map((opt: string, i: number) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required={Boolean(fieldConfigs['name']?.required ?? true)} placeholder={fieldConfigs['name']?.placeholder || ''} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['title']?.label || 'Título do Chamado'}</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input name="title" value={formData.title} onChange={handleChange} required={Boolean(fieldConfigs['title']?.required ?? true)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-colors" placeholder={fieldConfigs['title']?.placeholder || 'Descreva brevemente o problema'} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['description']?.label || 'Descrição Detalhada'}</label>
                <textarea name="description" value={formData.description} onChange={handleChange} required={Boolean(fieldConfigs['description']?.required ?? true)} rows={4} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-colors" placeholder={fieldConfigs['description']?.placeholder || 'Forneça detalhes sobre o problema, incluindo mensagens de erro, etapas para reproduzir, etc.'} />
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files
                      if (!files || files.length === 0) { setAttachments([]); return }
                      const readers = Array.from(files).map((file) => new Promise<string>((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onload = () => resolve(String(reader.result))
                        reader.onerror = () => reject(reader.error)
                        reader.readAsDataURL(file)
                      }))
                      Promise.all(readers).then(setAttachments).catch(() => setAttachments([]))
                    }}
                    className="block w-full text-sm text-gray-700 dark:text-gray-300"
                  />
                  {attachments.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {attachments.map((src, i) => (
                        <img key={i} src={src} alt={`Anexo ${i + 1}`} className="rounded border border-gray-200 dark:border-gray-700 object-cover max-h-32 w-full" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['category']?.label || 'Categoria'}</label>
                <select name="category" value={formData.category} onChange={handleChange} required={Boolean(fieldConfigs['category']?.required ?? true)} className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                  {(Array.isArray(fieldConfigs['category']?.options) && fieldConfigs['category']?.options?.length ? fieldConfigs['category']!.options : defaultCategories).map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{fieldConfigs['priority']?.label || 'Prioridade'}</label>
                <select name="priority" value={formData.priority} onChange={handleChange} required={Boolean(fieldConfigs['priority']?.required ?? true)} className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                  {(Array.isArray(fieldConfigs['priority']?.options) && fieldConfigs['priority']?.options?.length ? (fieldConfigs['priority']!.options as string[]).map(v => ({ value: v, label: v })) : defaultPriorities).map((p: { value: string; label: string }) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
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

              {customFields.length > 0 && (
                <div className="space-y-6">
                  {customFields.map((field: FormField) => (
                    <div key={field.id} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <span className="inline-flex items-center">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                          {field.helpText && <span className="ml-2" aria-label={String(field.helpText)}>
                            <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          </span>}
                        </span>
                      </label>
                      {field.type === 'text' && (
                        <>
                          <input type="text" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                          {(field.validation?.maxLength || field.validation?.minLength) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
                              {String(customValues[field.name] ?? '').length}{field.validation?.maxLength ? `/${field.validation.maxLength}` : ''}
                              {!field.validation?.maxLength && field.validation?.minLength ? ` (mín ${field.validation.minLength})` : ''}
                            </div>
                          )}
                        </>
                      )}
                      {field.type === 'number' && (
                        <input type="number" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                      )}
                      {field.type === 'email' && (
                        <input type="email" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                      )}
                      {field.type === 'phone' && (
                        <input type="tel" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder || '(00) 00000-0000'} value={formatPhone(String(customValues[field.name] ?? ''))} onChange={(e) => setCustomValues({ ...customValues, [field.name]: formatPhone(e.target.value) })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                      )}
                      {field.type === 'url' && (
                        <input type="url" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                      )}
                      {field.type === 'date' && (
                        <input type="date" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                      )}
                      {field.type === 'datetime' && (
                        <input type="datetime-local" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                      )}
                      {field.type === 'select' && (
                        <select required={Boolean(field.required)} disabled={Boolean(field.readonlyPublic)} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                          <option value="">Selecione uma opção</option>
                          {(field.options || []).map((opt: string, i: number) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {field.type === 'multiselect' && (
                        <div className="space-y-2">
                          {(field.options || []).map((opt: string, i: number) => (
                            <label key={i} className="flex items-center">
                              <input type="checkbox" disabled={Boolean(field.readonlyPublic)} checked={Array.isArray(customValues[field.name]) ? (customValues[field.name] as string[]).includes(opt) : false} onChange={(e) => {
                                const current = Array.isArray(customValues[field.name]) ? (customValues[field.name] as string[]) : []
                                const next = e.target.checked ? [...current, opt] : current.filter((x: string) => x !== opt)
                                setCustomValues({ ...customValues, [field.name]: next })
                              }} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {field.type === 'checkbox' && (
                        <label className="flex items-center">
                          <input type="checkbox" disabled={Boolean(field.readonlyPublic)} checked={!!customValues[field.name]} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{field.placeholder || 'Sim/Não'}</span>
                        </label>
                      )}
                      {field.type === 'textarea' && (
                        <>
                          <textarea required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                          {(field.validation?.maxLength || field.validation?.minLength) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
                              {String(customValues[field.name] ?? '').length}{field.validation?.maxLength ? `/${field.validation.maxLength}` : ''}
                              {!field.validation?.maxLength && field.validation?.minLength ? ` (mín ${field.validation.minLength})` : ''}
                            </div>
                          )}
                        </>
                      )}
                      {errors[field.name] && <p className="text-xs text-red-600 mt-1">{errors[field.name]}</p>}
                    </div>
                  ))}
                </div>
              )}
              {([] as FormField[]).map((field: FormField) => {
                const isBuiltin = ['name','email','title','description','category','priority'].includes(field.name)
                if (isBuiltin) {
                  if (field.name === 'name') {
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label || 'Seu nome'}</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required={Boolean(field.required)} placeholder={field.placeholder || ''} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                      </div>
                    )
                  }
                  if (field.name === 'email') {
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label || 'Seu email'}</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required={Boolean(field.required)} placeholder={field.placeholder || ''} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                      </div>
                    )
                  }
                  if (field.name === 'title') {
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label || 'Título do Chamado'}</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Tag className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          </div>
                          <input name="title" value={formData.title} onChange={handleChange} required={Boolean(field.required)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-colors" placeholder={field.placeholder || 'Descreva brevemente o problema'} />
                        </div>
                      </div>
                    )
                  }
                  if (field.name === 'description') {
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label || 'Descrição Detalhada'}</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} required={Boolean(field.required)} rows={4} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-colors" placeholder={field.placeholder || 'Forneça detalhes sobre o problema, incluindo mensagens de erro, etapas para reproduzir, etc.'} />
                      </div>
                    )
                  }
                  if (field.name === 'category') {
                    const opts = Array.isArray(field.options) && field.options.length ? field.options : defaultCategories
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label || 'Categoria'}</label>
                        <select name="category" value={formData.category} onChange={handleChange} required={Boolean(field.required)} className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                          {opts.map((c: string) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    )
                  }
                  if (field.name === 'priority') {
                    const opts = Array.isArray(field.options) && field.options.length ? (field.options as string[]).map(v => ({ value: v, label: v })) : defaultPriorities
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label || 'Prioridade'}</label>
                        <select name="priority" value={formData.priority} onChange={handleChange} required={Boolean(field.required)} className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                          {opts.map((p: { value: string; label: string }) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
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
                    )
                  }
                }
                return (
                  <div key={field.id} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="inline-flex items-center">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                        {field.helpText && <span className="ml-2" aria-label={String(field.helpText)}>
                          <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </span>}
                      </span>
                    </label>
                    {field.type === 'text' && (
                      <>
                        <input type="text" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                        {(field.validation?.maxLength || field.validation?.minLength) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
                            {String(customValues[field.name] ?? '').length}{field.validation?.maxLength ? `/${field.validation.maxLength}` : ''}
                            {!field.validation?.maxLength && field.validation?.minLength ? ` (mín ${field.validation.minLength})` : ''}
                          </div>
                        )}
                      </>
                    )}
                    {field.type === 'number' && (
                      <input type="number" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                    )}
                    {field.type === 'email' && (
                      <input type="email" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                    )}
                    {field.type === 'phone' && (
                      <input type="tel" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder || '(00) 00000-0000'} value={formatPhone(String(customValues[field.name] ?? ''))} onChange={(e) => setCustomValues({ ...customValues, [field.name]: formatPhone(e.target.value) })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                    )}
                    {field.type === 'url' && (
                      <input type="url" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                    )}
                    {field.type === 'date' && (
                      <input type="date" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                    )}
                    {field.type === 'datetime' && (
                      <input type="datetime-local" required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                    )}
                    {field.type === 'select' && (
                      <select required={Boolean(field.required)} disabled={Boolean(field.readonlyPublic)} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                        <option value="">Selecione uma opção</option>
                        {(field.options || []).map((opt: string, i: number) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                    {field.type === 'multiselect' && (
                      <div className="space-y-2">
                        {(field.options || []).map((opt: string, i: number) => (
                          <label key={i} className="flex items-center">
                            <input type="checkbox" disabled={Boolean(field.readonlyPublic)} checked={Array.isArray(customValues[field.name]) ? (customValues[field.name] as string[]).includes(opt) : false} onChange={(e) => {
                              const current = Array.isArray(customValues[field.name]) ? (customValues[field.name] as string[]) : []
                              const next = e.target.checked ? [...current, opt] : current.filter((x: string) => x !== opt)
                              setCustomValues({ ...customValues, [field.name]: next })
                            }} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {field.type === 'checkbox' && (
                      <label className="flex items-center">
                        <input type="checkbox" disabled={Boolean(field.readonlyPublic)} checked={!!customValues[field.name]} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{field.placeholder || 'Sim/Não'}</span>
                      </label>
                    )}
                    {field.type === 'textarea' && (
                      <>
                        <textarea required={Boolean(field.required)} readOnly={Boolean(field.readonlyPublic)} placeholder={field.placeholder} value={String(customValues[field.name] ?? '')} onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                        {(field.validation?.maxLength || field.validation?.minLength) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
                            {String(customValues[field.name] ?? '').length}{field.validation?.maxLength ? `/${field.validation.maxLength}` : ''}
                            {!field.validation?.maxLength && field.validation?.minLength ? ` (mín ${field.validation.minLength})` : ''}
                          </div>
                        )}
                      </>
                    )}
                    {field.helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>}
                    {errors[field.name] && <p className="text-xs text-red-600 mt-1">{errors[field.name]}</p>}
                  </div>
                )
              })}
            </div>
            )}

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
