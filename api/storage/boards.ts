import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export interface BoardRecord {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

const dataDir = path.join(process.cwd(), 'data')
const boardsFile = path.join(dataDir, 'boards.json')

function ensureFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(boardsFile)) fs.writeFileSync(boardsFile, JSON.stringify([]), 'utf-8')
}

export function getBoards(): BoardRecord[] {
  ensureFiles()
  try {
    return JSON.parse(fs.readFileSync(boardsFile, 'utf-8'))
  } catch {
    return []
  }
}

export function saveBoards(boards: BoardRecord[]) {
  ensureFiles()
  fs.writeFileSync(boardsFile, JSON.stringify(boards, null, 2), 'utf-8')
}

export function findBoard(id: string): BoardRecord | undefined {
  return getBoards().find(b => b.id === id)
}

export function createBoard(data: Partial<BoardRecord>): BoardRecord {
  const boards = getBoards()
  const now = new Date().toISOString()
  const record: BoardRecord = {
    id: randomUUID(),
    name: data.name || 'Novo Board',
    description: data.description || '',
    created_at: now,
    updated_at: now,
  }
  boards.push(record)
  saveBoards(boards)
  return record
}

export function updateBoard(id: string, updates: Partial<BoardRecord>): BoardRecord | undefined {
  const boards = getBoards()
  const idx = boards.findIndex(b => b.id === id)
  if (idx === -1) return undefined
  boards[idx] = { ...boards[idx], ...updates, updated_at: new Date().toISOString() }
  saveBoards(boards)
  return boards[idx]
}

export function deleteBoard(id: string): boolean {
  const boards = getBoards()
  const idx = boards.findIndex(b => b.id === id)
  if (idx === -1) return false
  boards.splice(idx, 1)
  saveBoards(boards)
  return true
}

// Retorna o ID de um board padrão, criando-o se necessário
export function getOrCreateDefaultBoardId(preferredName: string = 'Geral'): string {
  let boards = getBoards()
  // Primeiro tenta achar por nomes convencionais
  const candidates = ['Geral', 'Aberto', preferredName].map(n => n.toLowerCase())
  const found = boards.find(b => candidates.includes((b.name || '').toLowerCase()))
  if (found) return found.id
  // Se não existir, cria um novo board com o nome preferido
  const now = new Date().toISOString()
  const record: BoardRecord = {
    id: randomUUID(),
    name: preferredName,
    description: 'Board padrão para novos chamados',
    created_at: now,
    updated_at: now,
  }
  boards.push(record)
  saveBoards(boards)
  return record.id
}