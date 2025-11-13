import fs from 'fs'
import path from 'path'
import { getTickets, saveTickets } from '../api/storage/tickets.js'
import { getOrCreateDefaultBoardId } from '../api/storage/boards.js'

async function run() {
  const tickets = getTickets()
  const beforeNulls = tickets.filter(t => !t.board_id).length
  const defaultBoardId = getOrCreateDefaultBoardId('Geral')
  const next = tickets.map(t => ({ ...t, board_id: t.board_id ?? defaultBoardId }))
  saveTickets(next as any)
  const afterNulls = next.filter(t => !t.board_id).length
  console.log('[Migration] Default board assignment complete', { beforeNulls, afterNulls, defaultBoardId })
}

run().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})