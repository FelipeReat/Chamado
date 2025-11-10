import { useState } from 'react'
import { toast } from 'sonner'

export default function PublicTicketForm() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    title: '',
    description: '',
    category: 'Hardware',
    priority: 'Medium',
  })

  const categories = ['Hardware','Software','Rede','Email','Sistema','Outro']
  const priorities = [
    { value: 'Low', label: 'Baixa' },
    { value: 'Medium', label: 'Média' },
    { value: 'High', label: 'Alta' },
    { value: 'Urgent', label: 'Urgente' },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/public/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg transition-colors">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 transition-colors">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Formulário de Chamado</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Preencha os campos abaixo para abrir um chamado sem precisar acessar o sistema.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Seu nome</label>
                <input name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Seu email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Título do chamado</label>
              <input name="title" value={formData.title} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
              <textarea name="description" value={formData.description} onChange={handleChange} required rows={5} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                  {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

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