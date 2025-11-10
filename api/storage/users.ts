import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

export interface StoredUser {
  id: string
  email: string
  name: string
  role: 'user' | 'technician' | 'admin'
  passwordHash: string
  created_at: string
}

const dataDir = path.join(process.cwd(), 'data')
const usersFile = path.join(dataDir, 'users.json')

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([]), 'utf-8')
  }
}

export function getUsers(): StoredUser[] {
  ensureDataFile()
  const raw = fs.readFileSync(usersFile, 'utf-8')
  try {
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveUsers(users: StoredUser[]) {
  ensureDataFile()
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8')
}

export function findUserByEmail(email: string): StoredUser | undefined {
  const users = getUsers()
  return users.find(u => u.email.toLowerCase() === email.toLowerCase())
}

export function findUserById(id: string): StoredUser | undefined {
  const users = getUsers()
  return users.find(u => u.id === id)
}

export async function addUser(params: { email: string; name: string; role?: StoredUser['role']; password: string }): Promise<StoredUser> {
  const users = getUsers()
  if (findUserByEmail(params.email)) {
    throw new Error('Email já cadastrado')
  }
  const passwordHash = await bcrypt.hash(params.password, 10)
  const user: StoredUser = {
    id: randomUUID(),
    email: params.email,
    name: params.name,
    role: params.role || 'user',
    passwordHash,
    created_at: new Date().toISOString(),
  }
  users.push(user)
  saveUsers(users)
  return user
}

export function updateUser(id: string, updates: Partial<Omit<StoredUser, 'id' | 'passwordHash' | 'created_at'>> & { password?: string }): StoredUser | undefined {
  const users = getUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) return undefined
  const current = users[idx]
  let passwordHash = current.passwordHash
  if (updates.password) {
    // Synchronous hash for simplicity in this context
    const salt = bcrypt.genSaltSync(10)
    passwordHash = bcrypt.hashSync(updates.password, salt)
  }
  const next: StoredUser = {
    ...current,
    email: updates.email ?? current.email,
    name: updates.name ?? current.name,
    role: (updates.role as any) ?? current.role,
    passwordHash,
  }
  users[idx] = next
  saveUsers(users)
  return next
}

export async function ensureDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@empresa.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const name = 'Administrador'

  const existing = findUserByEmail(email)
  if (existing) return existing

  const user = await addUser({ email, name, role: 'admin', password })
  return user
}