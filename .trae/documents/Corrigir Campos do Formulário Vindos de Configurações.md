## Diagnóstico

- A criação de campos em Configurações funciona e persiste em `settings.formFields` (`c:\Chamado\api\routes\settings.ts:285–328`).
- Os formulários (interno e público) não consomem `settings.formFields`:
  - Interno: `c:\Chamado\src\pages\NewTicket.tsx:14–21, 144–296` — campos estáticos.
  - Público: `c:\Chamado\src\pages\PublicTicketForm.tsx:7–22, 70–112` — campos fixos.
- Backend de criação de tickets não armazena campos extras; o modelo `TicketRecord` não tem `custom_fields` (`c:\Chamado\api\storage\tickets.ts:6–19, 103–125`).

Resultado: os campos novos no Settings não aparecem nem são persistidos nos tickets.

## Plano de Correção

### Fase 1 — Formular os campos dinamicamente no frontend
1. `PublicTicketForm.tsx`
   - Buscar `settings` (`GET /api/settings`) no `useEffect` e extrair `formFields`.
   - Renderizar inputs dinâmicos com base em `type`, `label`, `required`, `options`, `placeholder`; apenas `isActive === true` e respeitar `order`.
   - Manter campos básicos (nome, email, título, descrição, categoria, prioridade) e acrescentar os dinamicamente.
   - Coletar valores em um objeto `custom_fields` indexado por `field.name` e enviar junto no `POST /api/public/tickets`.

2. `NewTicket.tsx`
   - Buscar `settings.formFields` e renderizar da mesma forma.
   - Ao criar o chamado (`POST /api/tickets`), incluir `custom_fields` com os valores.
   - Validar `required` dos campos dinâmicos antes de submeter.

3. Componente utilitário
   - Criar um pequeno utilitário de renderização (mapa `type -> input`) para reaproveitar entre os dois formulários, cobrindo: `text, number, email, phone, url, date, datetime, select, multiselect, checkbox, textarea, password, currency, time, user, department, location`.

### Fase 2 — Backend: aceitar e persistir os campos dinâmicos
1. `api/storage/tickets.ts`
   - Estender `TicketRecord` com `custom_fields?: Record<string, any>`.
   - Em `createTicket(...)` atribuir `custom_fields` do `data` (default `{}`) e salvar junto.
   - Em `updateTicket(...)` permitir atualizar `custom_fields` (validar que é objeto).

2. `api/routes/tickets.ts`
   - No `POST /api/tickets` (31–35), repassar `custom_fields` recebido no body ao `createTicket`.
   - No `PUT /tickets/:id`, permitir `custom_fields` no `updates` com validação mínima de tipo.

3. `api/routes/public.ts`
   - No `POST /api/public/tickets` (9–49), aceitar `custom_fields` no body e repassar ao `createTicket`.

### Fase 3 — Exibir campos dinâmicos em detalhes
1. `TicketDetails.tsx`
   - Adicionar seção “Campos do Formulário” que liste `ticket.custom_fields`.
   - Usar rótulos de `settings.formFields` quando possível (match por `name`); se um campo foi removido do settings, exibir chave/valor salvos.

### Fase 4 — UX/A11y
- Mostrar erro amigável quando os campos requeridos não forem preenchidos.
- Padronizar `focus-visible` nos inputs e botões dinâmicos.
- Validar coerência (ex.: `number`/`currency`/`date`/`email`).

### Fase 5 — Testes
- Backend: testes de integração para `POST /api/tickets` e `POST /api/public/tickets` gravando `custom_fields` e leitura correta.
- Frontend: teste de renderização de campos dinâmicos e validação de `required`.

## Impacto
- Nenhum quebra para dados existentes: `custom_fields` é opcional.
- Formular os campos passa a ser realmente influenciado pelas Configurações.
- Tickets armazenam os valores personalizados e exibem nos detalhes.

Se aprovar, implemento as mudanças nos arquivos acima, iniciando pelos formulários (Fase 1) e em seguida backend (Fase 2) e detalhes (Fase 3).