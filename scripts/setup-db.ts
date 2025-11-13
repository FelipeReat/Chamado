import { Client } from 'pg'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL não definido')
    process.exit(1)
  }

  const client = new Client({ connectionString: url })
  await client.connect()

  try {
    await client.query('BEGIN')

    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto')

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user','technician','admin')),
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS boards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_boards_name ON boards (lower(name))
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('Hardware','Software','Network','Other')),
        priority TEXT NOT NULL CHECK (priority IN ('Low','Medium','High','Urgent')),
        status TEXT NOT NULL,
        board_id uuid REFERENCES boards(id) ON DELETE SET NULL,
        requester_id TEXT NOT NULL,
        assigned_to_id uuid REFERENCES users(id) ON DELETE SET NULL,
        custom_fields JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        resolved_at TIMESTAMPTZ
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_board_id ON tickets (board_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to_id ON tickets (assigned_to_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets (created_at DESC)
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments (ticket_id)
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_audit (
        id BIGSERIAL PRIMARY KEY,
        ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
        before_status TEXT,
        after_status TEXT,
        before_board_id uuid,
        after_board_id uuid,
        before_assigned_to_id uuid,
        after_assigned_to_id uuid
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_audit_ticket_id ON ticket_audit (ticket_id)
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS statuses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        order_no INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_statuses_order_no ON statuses (order_no)
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS form_fields (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        label TEXT NOT NULL,
        type TEXT NOT NULL,
        required BOOLEAN NOT NULL DEFAULT FALSE,
        order_no INT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        validation JSONB DEFAULT '{}'::jsonb,
        options JSONB DEFAULT '[]'::jsonb,
        placeholder TEXT,
        help_text TEXT,
        default_value JSONB
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_form_fields_order_no ON form_fields (order_no)
    `)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_form_fields_name ON form_fields (lower(name))
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS kanban_columns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        wip_limit INT NOT NULL DEFAULT 0,
        show_assignee BOOLEAN NOT NULL DEFAULT TRUE,
        show_due_date BOOLEAN NOT NULL DEFAULT TRUE,
        show_priority BOOLEAN NOT NULL DEFAULT TRUE,
        show_tags BOOLEAN NOT NULL DEFAULT FALSE,
        show_description BOOLEAN NOT NULL DEFAULT TRUE,
        show_created_date BOOLEAN NOT NULL DEFAULT FALSE,
        show_status BOOLEAN NOT NULL DEFAULT FALSE,
        color TEXT NOT NULL DEFAULT '#fbbf24',
        order_no INT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kanban_columns_order_no ON kanban_columns (order_no)
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings_history (
        id BIGSERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        user_email TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
        details JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_settings_history_timestamp_desc ON settings_history (timestamp DESC)
    `)

    await client.query('COMMIT')
    console.log('Estrutura de banco criada com sucesso')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Falha ao criar estrutura de banco:', e)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

