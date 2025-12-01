import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import { Plus } from 'lucide-react'

interface Board {
  id: string
  name: string
  description?: string
}

export default function BoardSelector({
  boardId,
  setBoardId,
}: {
  boardId: string | null
  setBoardId: (id: string | null) => void
}) {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const currentBoardName = useMemo(() => {
    const found = boards.find(b => b.id === boardId)
    return found?.name || null
  }, [boards, boardId])

  const fetchBoards = async () => {
    try {
      const resp = await apiFetch('/boards')
      setBoards(resp.data || [])
    } catch (err) {
      console.error('Erro ao buscar boards:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBoards() }, [])

  // Persiste seleção do board para manter contexto entre telas
  useEffect(() => {
    try {
      if (boardId) localStorage.setItem('current_board_id', boardId)
      else localStorage.removeItem('current_board_id')
    } catch {}
    try { window.dispatchEvent(new CustomEvent('boardChanged')) } catch {}
  }, [boardId])

  // Persiste nome do board atual para indicar contexto
  useEffect(() => {
    try {
      if (currentBoardName) localStorage.setItem('current_board_name', currentBoardName)
      else localStorage.removeItem('current_board_name')
    } catch {}
  }, [currentBoardName])

  const createBoard = async () => {
    try {
      const resp = await apiFetch('/boards', {
        method: 'POST',
        body: JSON.stringify({ name, description })
      })
      const created = resp.data
      setBoards(prev => [...prev, created])
      setCreating(false)
      setName('')
      setDescription('')
      setBoardId(created.id)
    } catch (err) {
      console.error('Erro ao criar board:', err)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Badge de contexto do board */}
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
        {currentBoardName ? `Board atual: ${currentBoardName}` : 'Todos os boards'}
      </span>

      <select
        value={boardId || ''}
        onChange={e => setBoardId(e.target.value || null)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
      >
        <option value="">Todos os boards</option>
        {boards.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <button
        onClick={() => setCreating(true)}
        className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <Plus className="w-4 h-4 mr-1" /> Criar Board Vazio
      </button>

      <button
        onClick={() => setShowHelp(v => !v)}
        className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        {showHelp ? 'Ocultar ajuda' : 'Ajuda'}
      </button>

      {creating && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Nome do board"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md"
          />
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md"
          />
          <button
            onClick={createBoard}
            className="px-3 py-1 bg-blue-600 text-white rounded-md"
          >Criar</button>
          <button
            onClick={() => setCreating(false)}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md"
          >Cancelar</button>
        </div>
      )}

      {showHelp && (
        <div className="w-full text-xs text-gray-600 dark:text-gray-300 mt-2">
          <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50">
            <p className="mb-1">
              Boards são espaços de trabalho independentes e começam vazios. Selecione um board para ver apenas os chamados dele.
            </p>
            <p>
              As colunas do Kanban são globais e mostram cards conforme o status — personalizar colunas não cria um board vazio.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
