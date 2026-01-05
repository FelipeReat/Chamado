import { addUser, findUserByEmail, saveUsers, getUsers } from '../api/storage/users.js'
import bcrypt from 'bcryptjs'

async function createViewer() {
  const email = 'visualizador@empresa.com'
  const password = 'view123'
  const name = 'Visualizador'
  const role = 'viewer'

  const existing = findUserByEmail(email)
  if (existing) {
    console.log(`Usuário ${email} já existe. Atualizando para viewer...`)
    const users = getUsers()
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase())
    if (idx !== -1) {
      users[idx].role = role
      users[idx].passwordHash = await bcrypt.hash(password, 10)
      saveUsers(users)
      console.log('Usuário atualizado com sucesso!')
    }
    return
  }

  try {
    const user = await addUser({ email, name, role, password })
    console.log(`Usuário ${email} criado com sucesso!`)
    console.log(`ID: ${user.id}`)
    console.log(`Role: ${user.role}`)
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
  }
}

createViewer()
