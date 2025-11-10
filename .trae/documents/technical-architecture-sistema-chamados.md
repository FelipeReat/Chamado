## 1. Arquitetura do Sistema

```mermaid
graph TD
    A[Navegador do Usuário] --> B[Aplicação React]
    B --> C[Supabase SDK]
    C --> D[Supabase Auth]
    C --> E[Supabase Database]
    C --> F[Supabase Storage]
    
    G[Serviço de Email] --> H[SMTP/Nodemailer]
    
    subgraph "Camada de Frontend"
        B
    end
    
    subgraph "Camada de Serviços (Supabase)"
        D
        E
        F
    end
    
    subgraph "Serviços Externos"
        H
    end
```

## 2. Descrição das Tecnologias

* **Frontend**: React\@18 + TypeScript + Tailwind CSS\@3 + Vite

* **Ferramenta de Inicialização**: vite-init

* **Backend**: Supabase (BaaS - Backend as a Service)

* **Banco de Dados**: PostgreSQL (via Supabase)

* **Autenticação**: Supabase Auth

* **Notificações**: Nodemailer para envio de emails

* **Deploy**: Vercel/Netlify para frontend, Supabase Cloud para backend

## 3. Definições de Rotas

| Rota           | Descrição                                        |
| -------------- | ------------------------------------------------ |
| /              | Login page - autenticação de usuários            |
| /dashboard     | Dashboard principal com visão geral dos chamados |
| /chamados/novo | Formulário para criar novo chamado               |
| /chamados      | Lista de todos os chamados com filtros           |
| /chamados/:id  | Detalhes de um chamado específico                |
| /usuarios      | Gestão de usuários (admin apenas)                |
| /relatorios    | Página de relatórios e métricas                  |
| /perfil        | Página de perfil do usuário                      |

## 4. Definições de API

### 4.1 Autenticação

```typescript
// Login
POST /auth/v1/token?grant_type=password

Request:
{
  email: string;
  password: string;
}

Response:
{
  access_token: string;
  refresh_token: string;
  user: User;
}
```

### 4.2 Chamados (Tickets)

```typescript
// Criar chamado
POST /rest/v1/tickets

Request:
{
  title: string;
  description: string;
  category: 'Hardware' | 'Software' | 'Network' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved';
  requester_id: string;
}

// Listar chamados com filtros
GET /rest/v1/tickets?select=*&status=eq.Open

// Atualizar status do chamado
PATCH /rest/v1/tickets?id=eq.{id}
{
  status: 'In Progress' | 'Resolved';
  assigned_to?: string;
  comments?: string;
}
```

### 4.3 Usuários

```typescript
// Criar usuário
POST /auth/v1/admin/users
{
  email: string;
  password: string;
  user_metadata: {
    name: string;
    department: string;
    role: 'user' | 'technician' | 'admin';
  }
}

// Listar usuários
GET /rest/v1/users?select=*
```

## 5. Diagrama de Arquitetura do Servidor

```mermaid
graph TD
    A[Cliente/React] --> B[Supabase Client SDK]
    B --> C[Supabase Auth Service]
    B --> D[Supabase Database]
    B --> E[Supabase Realtime]
    
    F[Email Service] --> G[Nodemailer]
    G --> H[SMTP Server]
    
    subgraph "Serviços Supabase"
        C
        D
        E
    end
    
    subgraph "Serviço de Notificação"
        F
        G
        H
    end
```

## 6. Modelo de Dados

### 6.1 Definição do Modelo de Dados

```mermaid
erDiagram
    USERS ||--o{ TICKETS : creates
    USERS ||--o{ TICKETS : assigned_to
    TICKETS ||--o{ TICKET_COMMENTS : has
    USERS ||--o{ TICKET_COMMENTS : writes

    USERS {
        uuid id PK
        string email UK
        string name
        string department
        string role
        timestamp created_at
        timestamp updated_at
    }

    TICKETS {
        uuid id PK
        string title
        text description
        string category
        string priority
        string status
        uuid requester_id FK
        uuid assigned_to_id FK
        timestamp created_at
        timestamp updated_at
        timestamp resolved_at
    }

    TICKET_COMMENTS {
        uuid id PK
        uuid ticket_id FK
        uuid user_id FK
        text comment
        timestamp created_at
    }
```

### 6.2 Linguagem de Definição de Dados (DDL)

```sql
-- Tabela de Usuários (gerenciada pelo Supabase Auth)
-- Os dados adicionais são armazenados em user_metadata

-- Tabela de Chamados
create table tickets (
    id uuid primary key default gen_random_uuid(),
    title varchar(255) not null,
    description text not null,
    category varchar(50) not null check (category in ('Hardware', 'Software', 'Network', 'Other')),
    priority varchar(20) not null check (priority in ('Low', 'Medium', 'High', 'Urgent')),
    status varchar(20) not null default 'Open' check (status in ('Open', 'In Progress', 'Resolved')),
    requester_id uuid not null references auth.users(id),
    assigned_to_id uuid references auth.users(id),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    resolved_at timestamp with time zone
);

-- Tabela de Comentários
create table ticket_comments (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null references tickets(id) on delete cascade,
    user_id uuid not null references auth.users(id),
    comment text not null,
    created_at timestamp with time zone default now()
);

-- Índices para performance
create index idx_tickets_requester on tickets(requester_id);
create index idx_tickets_assigned on tickets(assigned_to_id);
create index idx_tickets_status on tickets(status);
create index idx_tickets_created on tickets(created_at desc);
create index idx_comments_ticket on ticket_comments(ticket_id);

-- Permissões RLS (Row Level Security)
-- Permitir que usuários vejam apenas seus próprios chamados (exceto admin)
alter table tickets enable row level security;

-- Política para usuários comuns: podem ver apenas seus próprios chamados
create policy "Users can view own tickets" on tickets
    for select using (requester_id = auth.uid() or assigned_to_id = auth.uid());

-- Política para técnicos: podem ver chamados atribuídos a eles
create policy "Technicians can view assigned tickets" on tickets
    for select using (assigned_to_id = auth.uid());

-- Política para admin: pode ver todos os chamados
create policy "Admin can view all tickets" on tickets
    for select using (exists (
        select 1 from auth.users
        where id = auth.uid() 
        and raw_user_meta_data->>'role' = 'admin'
    ));

-- Permitir inserção de chamados para usuários autenticados
create policy "Authenticated users can create tickets" on tickets
    for insert with check (auth.uid() is not null);

-- Permitir atualização de status apenas para técnicos e admin
create policy "Technicians can update ticket status" on tickets
    for update using (
        assigned_to_id = auth.uid() or 
        exists (
            select 1 from auth.users
            where id = auth.uid() 
            and raw_user_meta_data->>'role' in ('admin', 'technician')
        )
    );

-- Permissões para comentários
create policy "Users can view comments on their tickets" on ticket_comments
    for select using (
        exists (
            select 1 from tickets
            where id = ticket_comments.ticket_id
            and (requester_id = auth.uid() or assigned_to_id = auth.uid())
        )
    );

create policy "Users can add comments to tickets" on ticket_comments
    for insert with check (
        user_id = auth.uid() and
        exists (
            select 1 from tickets
            where id = ticket_comments.ticket_id
            and (requester_id = auth.uid() or assigned_to_id = auth.uid())
        )
    );
```

## 7. Configuração de Email

```typescript
// Configuração do Nodemailer
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Templates de email
const emailTemplates = {
  newTicket: (ticket: Ticket) => ({
    subject: `Novo Chamado #${ticket.id.slice(0, 8)} - ${ticket.title}`,
    html: `
      <h2>Novo chamado criado</h2>
      <p><strong>Título:</strong> ${ticket.title}</p>
      <p><strong>Categoria:</strong> ${ticket.category}</p>
      <p><strong>Prioridade:</strong> ${ticket.priority}</p>
      <p><strong>Descrição:</strong> ${ticket.description}</p>
      <p>Acesse o sistema para atribuir um técnico.</p>
    `
  }),
  
  ticketAssigned: (ticket: Ticket, technician: User) => ({
    subject: `Chamado Atribuído #${ticket.id.slice(0, 8)}`,
    html: `
      <h2>Chamado atribuído a você</h2>
      <p><strong>Título:</strong> ${ticket.title}</p>
      <p><strong>Prioridade:</strong> ${ticket.priority}</p>
      <p>Acesse o sistema para mais detalhes.</p>
    `
  }),
  
  ticketResolved: (ticket: Ticket) => ({
    subject: `Chamado Resolvido #${ticket.id.slice(0, 8)}`,
    html: `
      <h2>Seu chamado foi resolvido</h2>
      <p><strong>Título:</strong> ${ticket.title}</p>
      <p>Obrigado por usar nosso sistema de suporte.</p>
    `
  })
};
```

## 8. Configuração de Backup

```bash
# Script de backup semanal (PostgreSQL)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="chamados_db"
DB_USER="postgres"

# Criar backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/backup_$DATE.sql"

# Comprimir backup
gzip "$BACKUP_DIR/backup_$DATE.sql"

# Remover backups antigos (manter últimos 30 dias)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Notificar admin (opcional)
echo "Backup do banco de dados realizado em $DATE" | mail -s "Backup BD Chamados" admin@empresa.com
```

## 9. Variáveis de Ambiente

```bash
# Frontend (.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend/Email Service (.env)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@empresa.com

# Database (configuração do Supabase)
DATABASE_URL=postgresql://user:password@host:port/database
```

## 10. Considerações de Segurança

* **Autenticação**: JWT tokens com refresh automático via Supabase Auth

* **Autorização**: Row Level Security (RLS) no PostgreSQL

* **CORS**: Configurado apenas para domínios permitidos

* **Rate Limiting**: Implementado no nível do Supabase

* **Sanitização**: Todas as entradas são validadas no frontend e backend

* **HTTPS**: Obrigatório para todas as comunicações

* **Backup**: Automatizado semanalmente com retenção de 30 dias

