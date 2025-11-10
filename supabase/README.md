# Sistema de Chamados - Supabase

## Configuração do Banco de Dados

Execute os seguintes comandos SQL no seu painel do Supabase para criar as tabelas necessarias:

```sql
-- Tabela de Chamados
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Hardware', 'Software', 'Network', 'Other')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved')),
    requester_id UUID NOT NULL REFERENCES auth.users(id),
    assigned_to_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de Comentarios
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_tickets_requester ON tickets(requester_id);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created ON tickets(created_at DESC);
CREATE INDEX idx_comments_ticket ON ticket_comments(ticket_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- Políticas de seguranca
CREATE POLICY "Users can view own tickets" ON tickets
    FOR SELECT USING (requester_id = auth.uid() OR assigned_to_id = auth.uid());

CREATE POLICY "Admin can view all tickets" ON tickets
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    ));

CREATE POLICY "Authenticated users can create tickets" ON tickets
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Technicians can update ticket status" ON tickets
    FOR UPDATE USING (
        assigned_to_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' IN ('admin', 'technician')
        )
    );

CREATE POLICY "Users can view comments on their tickets" ON ticket_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets
            WHERE id = ticket_comments.ticket_id
            AND (requester_id = auth.uid() OR assigned_to_id = auth.uid())
        )
    );

CREATE POLICY "Users can add comments to tickets" ON ticket_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM tickets
            WHERE id = ticket_comments.ticket_id
            AND (requester_id = auth.uid() OR assigned_to_id = auth.uid())
        )
    );
```

## Configuracao de Email

Para notificacoes por email, configure as variaveis de ambiente:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@empresa.com
```