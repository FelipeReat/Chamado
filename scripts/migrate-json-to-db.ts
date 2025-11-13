import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

function readJson<T = any>(file: string, fallback: any = []): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return fallback
  }
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL não definido')
    process.exit(1)
  }
  const client = new Client({ connectionString: url })
  await client.connect()

  const dataDir = path.join(process.cwd(), 'data')
  const usersFile = path.join(dataDir, 'users.json')
  const boardsFile = path.join(dataDir, 'boards.json')
  const ticketsFile = path.join(dataDir, 'tickets.json')
  const commentsFile = path.join(dataDir, 'ticket_comments.json')
  const settingsFile = path.join(dataDir, 'settings.json')

  try {
    await client.query('BEGIN')

    const users = readJson<any[]>(usersFile, [])
    for (const u of users) {
      await client.query(
        `INSERT INTO users(id, email, name, role, password_hash, created_at)
         VALUES($1, $2, $3, $4, $5, COALESCE($6, now()))
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.email, u.name, u.role, u.passwordHash, u.created_at]
      )
    }

    const boards = readJson<any[]>(boardsFile, [])
    for (const b of boards) {
      await client.query(
        `INSERT INTO boards(id, name, description, created_at, updated_at)
         VALUES($1, $2, $3, COALESCE($4, now()), COALESCE($5, now()))
         ON CONFLICT (id) DO NOTHING`,
        [b.id, b.name, b.description ?? '', b.created_at, b.updated_at]
      )
    }

    const tickets = readJson<any[]>(ticketsFile, [])
    for (const t of tickets) {
      await client.query(
        `INSERT INTO tickets(id, title, description, category, priority, status, board_id, requester_id, assigned_to_id, custom_fields, created_at, updated_at, resolved_at)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, '{}'::jsonb), COALESCE($11, now()), COALESCE($12, now()), $13)
         ON CONFLICT (id) DO NOTHING`,
        [
          t.id,
          t.title,
          t.description,
          // normaliza categorias conhecidas
          ['Hardware','Software','Network','Other'].includes(t.category) ? t.category : (t.category?.toLowerCase().includes('rede') ? 'Network' : 'Other'),
          t.priority,
          t.status,
          t.board_id ?? null,
          t.requester_id ?? '',
          t.assigned_to_id ?? null,
          (t as any).custom_fields ?? null,
          t.created_at,
          t.updated_at,
          t.resolved_at ?? null,
        ]
      )
    }

    const comments = readJson<any[]>(commentsFile, [])
    for (const c of comments) {
      await client.query(
        `INSERT INTO ticket_comments(id, ticket_id, user_id, content, created_at)
         VALUES($1, $2, $3, $4, COALESCE($5, now()))
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.ticket_id, c.user_id ?? null, c.content, c.created_at]
      )
    }

    const settings = readJson<any>(settingsFile, {})
    // statuses
    for (const s of settings.statuses || []) {
      await client.query(
        `INSERT INTO statuses(id, name, is_default, is_active, order_no, created_at)
         VALUES($1, $2, $3, $4, $5, now())
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.name || s.label || 'Status', !!s.isDefault, !!s.isActive, s.order || s.order_no || 0]
      )
    }
    // form fields
    for (const f of settings.formFields || []) {
      await client.query(
        `INSERT INTO form_fields(id, name, label, type, required, order_no, is_active, validation, options, placeholder, help_text, default_value)
         VALUES($1, $2, $3, $4, $5, $6, $7, COALESCE($8, '{}'::jsonb), COALESCE($9, '[]'::jsonb), $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [
          f.id,
          f.name || f.label,
          f.label || f.name,
          f.type || 'text',
          !!f.required,
          f.order || f.order_no || 0,
          f.isActive ?? true,
          f.validation ?? null,
          Array.isArray(f.options) ? JSON.stringify(f.options) : null,
          f.placeholder ?? null,
          f.helpText ?? null,
          f.defaultValue ?? null,
        ]
      )
    }
    // kanban columns
    for (const k of settings.kanbanColumns || []) {
      await client.query(
        `INSERT INTO kanban_columns(id, name, status_ids, wip_limit, show_assignee, show_due_date, show_priority, show_tags, show_description, show_created_date, show_status, color, order_no, is_active)
         VALUES($1, $2, COALESCE($3, '[]'::jsonb), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING`,
        [
          k.id,
          k.name,
          Array.isArray(k.statusIds) ? JSON.stringify(k.statusIds) : null,
          k.wipLimit || 0,
          k.showAssignee ?? true,
          k.showDueDate ?? true,
          k.showPriority ?? true,
          k.showTags ?? false,
          k.showDescription ?? true,
          k.showCreatedDate ?? false,
          k.showStatus ?? false,
          k.color || '#fbbf24',
          k.order || k.order_no || 0,
          k.isActive ?? true,
        ]
      )
    }

    // Optional: criar board padrão "Geral" se não existir
    await client.query(`
      INSERT INTO boards(name, description)
      SELECT 'Geral', 'Board padrão para novos chamados'
      WHERE NOT EXISTS (SELECT 1 FROM boards WHERE lower(name) = lower('Geral'))
    `)

    await client.query('COMMIT')
    console.log('Migração concluída')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Falha na migração:', e)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

