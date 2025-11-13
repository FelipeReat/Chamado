## Objetivos

1. Elevar UI/UX e acessibilidade em todas as páginas e componentes.
2. Tornar o layout totalmente responsivo e fluido (especialmente Kanban, Listas e Configurações).
3. Corrigir bugs e reduzir riscos (segurança, consistência de APIs, concorrência de dados).
4. Melhorar desempenho (virtualização/paginação, redução de logs, render eficiente).
5. Aumentar qualidade de código (tipagem, padronização, testes).

## Principais Achados

- Layout com `max-w-7xl` limita páginas densas (Layout.tsx:52–56, 192–196). 
- Kanban usa larguras fixas por coluna e limite de 15 cards; sem virtualização (TicketKanbanView.tsx:308–357). 
- Listas sem virtualização; tabela desktop e cards mobile (TicketList.tsx:285–465). 
- Uso frequente de `any` e `as any` em frontend/backend; contratos de API parcialmente inconsistentes. 
- JWT secret possui fallback `dev-secret` e CORS amplo; tokens em `localStorage`. 
- Testes apenas de utilidades; não há cobertura de componentes/rotas/APIs.

## Plano por Áreas

### UI/UX e Acessibilidade
- Padronizar estados de foco visível (`focus-visible`, `focus:ring`) em botões/links.
- Revisar contraste em dark mode; ajustar classes cinza para acessibilidade.
- Ícones decorativos com `aria-hidden` e rótulos claros em controles interativos.
- Melhorar feedback em ações assíncronas com `aria-live` onde aplicável.

### Layout Responsivo
- Tornar containers de páginas densas full-bleed (`max-w-none w-full`) e alinhar `min-h-0` em flex containers para evitar rolagem dupla (Layout.tsx). 
- Kanban: colunas com largura mínima fluida e comportamento responsivo por breakpoints (`sm/md/lg`); manter overflow horizontal controlado.
- Listas: grids/tabelas adaptativas; cabeçalhos compactos em telas pequenas.

### Performance
- Virtualizar listas grandes (desktop/mobile) com `react-virtual`/`react-window`.
- Opcional: virtualização leve nas colunas Kanban quando exceder 15; alternativa com paginação/"Load more".
- Reduzir logs em produção; condicionar por `NODE_ENV` e níveis (`debug/info/warn`).

### Estado, APIs e Tipagem
- Criar tipos compartilhados (DTOs) para `Ticket`, `Settings`, `User` e respostas `{ success, data, error }`.
- Tipar `apiFetch` para retorno consistente; remover `any/as any` nos componentes principais.
- Consolidar persistências de `localStorage` (board, prefs, tema) com utilitários seguros.

### Backend e Segurança
- Exigir `JWT_SECRET` via `.env` (sem fallback) e validar `CORS` origin apropriado.
- Padronizar respostas em todas rotas de `settings` e `tickets` com `{ success, data|error }` + códigos HTTP corretos.
- Avaliar persistência: introduzir lock/escrita atômica ou migrar para DB simples (SQLite/Prisma) para evitar corrupção sob concorrência.

### Testes
- Adicionar testes de componentes (Kanban/Lista), hooks (`useAuth`, `useTheme`), rotas protegidas e APIs (integração com Supertest).
- Cobertura mínima: utilidades, CRUD de tickets/boards/settings, DnD callback e filtros.

## Fases de Implementação

### Fase 1: Responsividade e UX Base
- Layout: condicionar/remover `max-w-7xl` nas páginas com visões densas, garantir `flex-1 min-h-0`.
- Kanban: colunas fluídas por breakpoint; manter limites e rolagens consistentes.
- Listas: ajustar tabela e cards mobile; foco visível padronizado.

### Fase 2: Tipagem e Contratos
- Introduzir tipos compartilhados e padronizar `apiFetch`.
- Remover `any/as any` nos principais fluxos (Kanban, Tickets, Settings).

### Fase 3: Backend e Segurança
- Endurecer JWT e CORS; respostas de API padronizadas.
- Esquemas de validação (ex.: `zod`) para rotas `settings/tickets`.

### Fase 4: Performance
- Virtualizar listas grandes; avaliar paginação/virtualização no Kanban.
- Reduzir logs em produção com guardas.

### Fase 5: Testes
- Adicionar suites de componentes/hook/rotas e integração de API.
- Configurar script de CI (Vitest + lint) e metas de cobertura.

## Entregáveis
- Layout responsivo em páginas densas; Kanban e Listas ocupando toda a área útil de forma fluida.
- UI com foco e acessibilidade melhorados; contrastes ajustados.
- Contratos de API unificados e tipados; remoção significativa de `any`.
- Segurança endurecida (JWT/CORS) e persistência mais robusta.
- Testes cobrindo fluxos críticos e execução em CI.

Confirma que posso iniciar pela Fase 1 (responsividade e UX base), seguida de tipagem e contratos? Posso priorizar Kanban + Listas primeiro para impacto imediato.