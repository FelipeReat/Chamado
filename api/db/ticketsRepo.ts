import { getPool } from './pool'

export async function dbGetTickets(boardId?: string) {
  const pool = getPool()
  if (!pool) throw new Error('Pool não inicializado')
  const res = await pool.query(
    `SELECT id, title, description, category, priority, status, board_id, requester_id, assigned_to_id, custom_fields, created_at, updated_at, resolved_at
     FROM tickets
     ${boardId ? 'WHERE board_id = $1' : ''}
     ORDER BY created_at DESC`,
    boardId ? [boardId] : []
  )
  return res.rows
}

export async function dbFindTicket(id: string) {
  const pool = getPool()
  if (!pool) throw new Error('Pool não inicializado')
  const res = await pool.query(
    `SELECT id, title, description, category, priority, status, board_id, requester_id, assigned_to_id, custom_fields, created_at, updated_at, resolved_at
     FROM tickets WHERE id = $1`,
    [id]
  )
  return res.rows[0]
}

export async function dbCreateTicket(data: any) {
  const pool = getPool()
  if (!pool) throw new Error('Pool não inicializado')
  const res = await pool.query(
    `INSERT INTO tickets(title, description, category, priority, status, board_id, requester_id, assigned_to_id, custom_fields)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'{}'::jsonb))
     RETURNING id, title, description, category, priority, status, board_id, requester_id, assigned_to_id, custom_fields, created_at, updated_at, resolved_at`,
    [
      data.title,
      data.description,
      data.category,
      data.priority,
      data.status,
      data.board_id ?? null,
      data.requester_id ?? '',
      data.assigned_to_id ?? null,
      data.custom_fields ?? null,
    ]
  )
  return res.rows[0]
}

export async function dbUpdateTicket(id: string, updates: any) {
  const pool = getPool()
  if (!pool) throw new Error('Pool não inicializado')
  const fields: string[] = []
  const values: any[] = []
  let idx = 1
  for (const [key, val] of Object.entries(updates)) {
    if (['title','description','category','priority','status','board_id','assigned_to_id','custom_fields','resolved_at'].includes(key)) {
      fields.push(`${key} = $${idx}`)
      values.push(val)
      idx++
    }
  }
  fields.push(`updated_at = now()`) // sempre atualiza
  const sql = `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, title, description, category, priority, status, board_id, requester_id, assigned_to_id, custom_fields, created_at, updated_at, resolved_at`
  values.push(id)
  const res = await pool.query(sql, values)
  return res.rows[0]
}

export async function dbGetComments(ticketId?: string) {
  const pool = getPool()
  if (!pool) throw new Error('Pool não inicializado')
  const res = await pool.query(
    `SELECT id, ticket_id, user_id, content, created_at FROM ticket_comments ${ticketId ? 'WHERE ticket_id = $1' : ''} ORDER BY created_at ASC`,
    ticketId ? [ticketId] : []
  )
  return res.rows
}

export async function dbAddComment(ticketId: string, userId: string, content: string) {
  const pool = getPool()
  if (!pool) throw new Error('Pool não inicializado')
  const res = await pool.query(
    `INSERT INTO ticket_comments(ticket_id, user_id, content) VALUES($1,$2,$3)
     RETURNING id, ticket_id, user_id, content, created_at`,
    [ticketId, userId, content]
  )
  return res.rows[0]
}

