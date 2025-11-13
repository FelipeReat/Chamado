// Integration test for DELETE /users/:id with ticket unassignment
(async () => {
  const base = 'http://localhost:3003/api'
  const j = async (r) => {
    try { return await r.json() } catch { return { success: false, error: 'Invalid JSON' } }
  }

  const loginRes = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@empresa.com', password: 'admin123' })
  })
  const login = await j(loginRes)
  if (!login.success) {
    console.error('Login failed:', login)
    process.exit(1)
  }
  const token = login.token
  console.log('TOKEN_LEN', token.length)
  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }

  const email = `deleteme+${Date.now()}@example.com`
  const userRes = await fetch(base + '/users', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password: 'Pass123!', name: 'Delete Me', role: 'technician' })
  })
  const user = await j(userRes)
  if (!user.success) {
    console.error('Create user failed:', user)
    process.exit(1)
  }
  const userId = user.data.id
  console.log('NEW_USER', userId)

  const ticketRes = await fetch(base + '/tickets', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Test Delete User', description: 'assigned', category: 'Software', priority: 'Low', assigned_to_id: userId })
  })
  const ticket = await j(ticketRes)
  if (!ticket.success) {
    console.error('Create ticket failed:', ticket)
    process.exit(1)
  }
  const ticketId = ticket.data.id
  console.log('TICKET', ticketId, 'assigned_to_id=', ticket.data.assigned_to_id)

  const delRes = await fetch(base + '/users/' + userId, { method: 'DELETE', headers })
  const del = await j(delRes)
  if (!del.success) {
    console.error('Delete user failed:', del)
    process.exit(1)
  }
  console.log('DELETED', del.data.id, 'unassigned=', del.meta?.tickets_unassigned)

  const listRes = await fetch(base + '/tickets', { method: 'GET', headers })
  const list = await j(listRes)
  const t = (list.data || []).find((it) => it.id === ticketId)
  console.log('TICKET_AFTER assigned_to_id=', t?.assigned_to_id)
  if (t?.assigned_to_id !== null) {
    console.error('Ticket was not unassigned as expected')
    process.exit(1)
  }
  console.log('OK')
  process.exit(0)
})().catch(err => { console.error(err); process.exit(1) })