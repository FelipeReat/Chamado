## Objetivo

Conectar ao banco informado e criar toda a estrutura de dados do sistema (tabelas, chaves, índices) para substituir/espelhar os arquivos JSON atuais.

## Assumptions

- Engine: PostgreSQL (porta padrão 5432). Caso o serviço seja MySQL, adapto o DDL.
- Credenciais: usuário `chamados`, senha `BlomaqChamados@2025`, banco `chamados`, host `54.232.194.197`.
- A senha contém `@`; ao montar a URL, usar `BlomaqChamados%402025`.

## Conexão (exemplo)

- DSN: `postgresql://chamados:BlomaqChamados%402025@54.232.194.197:5432/chamados`.
- Habilitar extensão para UUID: `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`.

## DDL (PostgreSQL)

### users

- Campos: `id uuid pk default gen_random_uuid()`, `email text unique not null`, `name text not null`, `role text check (role in ('user','technician','admin')) not null`, `password_hash text not null`, `created_at timestamptz not null default now()`.
- Índices: `idx_users_role` em `role`.

### boards

- Campos: `id uuid pk default gen_random_uuid()`, `name text not null`, `description text`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.
- Índices: `uniq_boards_name` em `lower(name)` (único opcional).

### tickets

- Campos: `id uuid pk default gen_random_uuid()`, `title text not null`, `description text not null`, `category text check (category in ('Hardware','Software','Network','Other')) not null`, `priority text check (priority in ('Low','Medium','High','Urgent')) not null`, `status text not null`, `board_id uuid references boards(id) on delete set null`, `requester_id text not null`, `assigned_to_id uuid references users(id) on delete set null`, `custom_fields jsonb default '{}'`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`, `resolved_at timestamptz`.
- Índices: `idx_tickets_board_id`, `idx_tickets_status`, `idx_tickets_assigned_to_id`, `idx_tickets_created_at_desc` (btree em `created_at desc`).

### ticket_comments

- Campos: `id uuid pk default gen_random_uuid()`, `ticket_id uuid references tickets(id) on delete cascade`, `user_id uuid references users(id) on delete set null`, `content text not null`, `created_at timestamptz not null default now()`.
- Índices: `idx_ticket_comments_ticket_id`.

### ticket_audit

- Campos: `id bigserial pk`, `ticket_id uuid references tickets(id) on delete cascade`, `timestamp timestamptz not null default now()`, `before_status text`, `after_status text`, `before_board_id uuid`, `after_board_id uuid`, `before_assigned_to_id uuid`, `after_assigned_to_id uuid`.
- Índices: `idx_ticket_audit_ticket_id`.

### statuses (Configurações)

- Campos: `id text pk`, `name text not null`, `is_default boolean not null default false`, `is_active boolean not null default true`, `order_no int not null`, `created_at timestamptz not null default now()`.
- Índices: `idx_statuses_order_no`.

### form_fields (Configurações)

- Campos: `id text pk`, `name text not null`, `label text not null`, `type text not null`, `required boolean not null default false`, `order_no int not null`, `is_active boolean not null default true`, `validation jsonb default '{}'`, `options jsonb default '[]'`, `placeholder text`, `help_text text`, `default_value jsonb`.
- Índices: `idx_form_fields_order_no`, `uniq_form_fields_name` único em `lower(name)`.

### kanban_columns (Configurações)

- Campos: `id text pk`, `name text not null`, `status_ids jsonb not null default '[]'`, `wip_limit int not null default 0`, `show_assignee boolean not null default true`, `show_due_date boolean not null default true`, `show_priority boolean not null default true`, `show_tags boolean not null default false`, `show_description boolean not null default true`, `show_created_date boolean not null default false`, `show_status boolean not null default false`, `color text not null default '#fbbf24'`, `order_no int not null`, `is_active boolean not null default true`.
- Índices: `idx_kanban_columns_order_no`.

### settings_history

- Campos: `id bigserial pk`, `action text not null`, `user_email text not null`, `timestamp timestamptz not null default now()`, `details jsonb not null default '{}'`.
- Índices: `idx_settings_history_timestamp_desc`.

## Dados Iniciais

- Criar board padrão `Geral` e (opcional) inserir `statuses` base (`Open`, `In Progress`, `Resolved`) com `order_no` sequencial.

## Migração (JSON → Banco)

- Ler arquivos em `data/`: `users.json`, `boards.json`, `tickets.json`, `ticket_comments.json`, `settings.json`.
- Transformar registros para os tipos acima (UUIDs novos quando necessário; preservar IDs textuais de settings).
- Popular tabelas respeitando ordenação (`order_no`) e integridade; ajustar `category` para enum canônico.

## Integração com o Backend

- Adapter de storage para Postgres (substituir `api/storage/*.ts` por repositórios que usam o banco).
- Manter contratos das rotas (`/tickets`, `/settings`, `/boards`, `/users`) — agora lendo/escrevendo nas tabelas.
- `custom_fields`: aceitar no `POST /api/tickets` e `POST /api/public/tickets`, persistir no campo `jsonb` e exibir em detalhes.

## Segurança/Operação

- Criar usuário `chamados` com permissões limitadas ao banco `chamados`.
- Configurar `JWT_SECRET` em `.env` no servidor; ajustar `CORS` `origin`.
- Backups regulares e transações nas operações de atualização em massa (reorder).

## Execução

- Eu gerarei os scripts `SQL` e rodarei a criação das tabelas e índices via `psql` usando a DSN acima.
- Em seguida, migrarei os dados do `data/` para o banco.
- Por fim, trocarei o storage do backend para usar o banco e validarei as rotas.

Confirma que posso prosseguir com PostgreSQL? Se o banco for MySQL, eu adapto rapidamente o DDL (troca de tipos/auto-increment/indexes).