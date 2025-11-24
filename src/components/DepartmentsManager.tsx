import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { toast } from 'sonner'

export default function DepartmentsManager({ onUpdate }: { onUpdate: () => void }) {
  const [list, setList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newDept, setNewDept] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const resp = await apiFetch('/settings/departments')
        const arr = Array.isArray((resp as any)?.data) ? (resp as any).data : []
        setList(arr)
      } catch {}
      setLoading(false)
    })()
  }, [])

  const addDept = async () => {
    const name = newDept.trim()
    if (!name) return
    try {
      setSaving(true)
      const resp = await apiFetch('/settings/departments', {
        method: 'POST',
        body: JSON.stringify({ name })
      })
      const arr = Array.isArray((resp as any)?.data) ? (resp as any).data : []
      setList(arr)
      setNewDept('')
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
      try { toast.success('Departamento adicionado') } catch {}
    } catch {}
    setSaving(false)
  }

  const removeDept = async (name: string) => {
    if (!confirm(`Remover departamento "${name}"?`)) return
    try {
      setSaving(true)
      const resp = await apiFetch(`/settings/departments/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        body: JSON.stringify({})
      })
      const arr = Array.isArray((resp as any)?.data) ? (resp as any).data : []
      setList(arr)
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
      try { toast.success('Departamento removido') } catch {}
    } catch {}
    setSaving(false)
  }

  const saveAll = async () => {
    try {
      setSaving(true)
      await apiFetch('/settings/departments', {
        method: 'PUT',
        body: JSON.stringify({ departments: list })
      })
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
      try { toast.success('Lista de departamentos salva') } catch {}
    } catch {}
    setSaving(false)
  }

  const onDragStart = (index: number) => setDraggedIndex(index)
  const onDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index) }
  const onDragLeave = () => setDragOverIndex(null)
  const onDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    if (draggedIndex === null || draggedIndex === index) return
    const next = [...list]
    const [item] = next.splice(draggedIndex, 1)
    next.splice(index, 0, item)
    setList(next)
    try {
      setSaving(true)
      const resp = await apiFetch('/settings/departments/reorder', {
        method: 'POST',
        body: JSON.stringify({ departments: next })
      })
      const arr = Array.isArray((resp as any)?.data) ? (resp as any).data : next
      setList(arr)
      onUpdate()
      try { window.dispatchEvent(new CustomEvent('settingsUpdated')) } catch {}
    } catch {}
    setSaving(false)
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Departamentos</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie a lista global de departamentos usada nos formulários.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              placeholder="Novo departamento"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={addDept}
              disabled={saving}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md"
            >Adicionar</button>
          </div>

          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {list.map((name, idx) => (
              <li
                key={name}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, idx)}
                className={`py-2 px-2 flex justify-between items-center rounded ${dragOverIndex === idx ? 'border border-blue-400 dark:border-blue-500' : ''}`}
              >
                <span className="text-gray-800 dark:text-gray-200 cursor-move">{name}</span>
                <button onClick={() => removeDept(name)} disabled={saving} className="px-2 py-1 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded">Remover</button>
              </li>
            ))}
            {list.length === 0 && (
              <li className="py-2 text-gray-500 dark:text-gray-400">Nenhum departamento cadastrado.</li>
            )}
          </ul>

          <div className="mt-4 flex justify-end">
            <button onClick={saveAll} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md">Salvar Lista</button>
          </div>
        </div>
      )}
    </div>
  )
}