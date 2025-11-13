## Objetivo

Deixar a tela de Configurações mais clara, responsiva, acessível e confiável, com ações bem delimitadas (salvar por seção e salvar tudo), feedbacks consistentes e integração estável com o backend.

## Achados

- Rota: `c:\Chamado\src\App.tsx:31–46`; link no menu (`Layout.tsx:39–45`).
- Tela principal: `c:\Chamado\src\pages\Settings.tsx:1–419` com seções Status, Formulário, Kanban, Acesso, Histórico, Export/Import/Reset.
- Subcomponentes:
  - StatusManager (`c:\Chamado\src\components\StatusManager.tsx:1–437`)
  - FormEditor (`c:\Chamado\src\components\FormEditor.tsx:1–765`)
  - KanbanCustomization (`c:\Chamado\src\components\KanbanCustomization.tsx:1–585`)
  - AccessControl (`c:\Chamado\src\components\AccessControl.tsx:1–194`)
  - HistoryLog (`c:\Chamado\src\components\HistoryLog.tsx:1–81`)
- Backend: `c:\Chamado\api\routes\settings.ts:80–793` 

## Plano de Melhoria

### Layout e UX
- Full-bleed: remover/condicionar `max-w-7xl` do header e conteúdo em `Settings.tsx`, usar `w-full max-w-none` e `flex-1 min-h-0` no container da página.
- Navegação por abas clara: títulos e descrições curtas; mostrar badge de alterações não salvas por aba.
- Ações claras: botões “Salvar seção” dentro de cada módulo e “Salvar Tudo” global no topo; separar visualmente ações destrutivas (Reset) com estilos de perigo e confirmação explícita.
- Preview: tornar painel de preview opcional/colapsável e sticky apenas em telas grandes; em mobile, mover preview para baixo.

### Acessibilidade
- Padronizar foco visível em todos botões/inputs (`focus-visible`, `focus:ring`), remover `focus:outline-none` onde não necessário.
- Adicionar `aria-live="polite"` para mensagens de sucesso/erro de operações.
- Ícones decorativos com `aria-hidden` e rótulos de ações com `aria-label` descritivo.
- Revisar contraste nos tons de cinza em dark mode (labels e textos secundários).

### Estados e Erros
- Feedback unificado: usar toasts (ex.: `sonner`) para sucesso/erro; mostrar banners contextuais em cada aba quando a última operação falhar.
- Indicadores de loading por seção; desabilitar botões durante operações.
- Confirm dialogs para ações críticas (Import/Reset) com resumo do impacto.

### Tipagem e Consistência
- Introduzir tipos compartilhados (DTOs) para `Settings`, `StatusConfig`, `FormField`, `KanbanColumnConfig`, respostas `{ success, data, error }`.
- Usar `settingsApi.ts` como única fonte de chamadas e alinhar métodos com o backend (reorder `POST` em vez de `PUT`).
- Remover `any/as any` nos componentes de Configurações; tipar payloads e respostas.

### Backend e Contratos
- Padronizar respostas no `settings.ts` com `{ success, data|error }` e códigos HTTP consistentes.
- Validar schema de entrada (ex.: `zod`) para `statuses`, `form-fields`, `kanban-columns`, import e save-all.
- Ajustar diferença estrutural no `reset` para corresponder ao formato consumido pelo frontend (`statusIds` vs `statusId`).
- Emitir evento `settingsUpdated` apenas após operações bem-sucedidas e com payload mínimo (tipo da alteração) para clientes interessados.

### Performance
- Lazy-load de submódulos pesados (FormEditor e KanbanCustomization) quando a aba correspondente for aberta.
- Debounce em inputs e autosave opcional por seção (desligado por padrão).

### Testes
- Adicionar testes de integração para endpoints de `settings` (CRUD/reorder/export/import/reset).
- Testes de interação para as abas principais: salvar seção, salvar tudo, importar, resetar, reordenar.
- Snapshot/ARIA para acessibilidade básica em componentes.

## Entregáveis

- Settings com layout fluido, UX das ações clara, feedbacks acessíveis e consistentes.
- Tipos e contratos alinhados, sem `any` nas áreas críticas.
- Backend validado e respostas padronizadas.
- Testes cobrindo as operações de Configurações.

Posso iniciar pelo layout full-bleed e UX das abas (Fase 1), em seguida tipagem/contratos e ajustes de backend (Fase 2), e finalizar com lazy-load/performance e testes (Fase 3).