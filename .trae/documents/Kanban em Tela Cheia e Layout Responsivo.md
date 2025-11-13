## Objetivo

* Fazer o Kanban ocupar toda a área útil da aplicação (largura e altura) e ajustar-se automaticamente ao tamanho da tela.

* Manter o comportamento atual de boards, mas garantir que a criação de novos boards não limite o layout; o Kanban segue responsivo.

## Contexto no Código

* Kanban: `c:\Chamado\src\components\TicketKanbanView.tsx:128–145, 147–270, 272–366` (flex + overflow, largura fixa por coluna `w-[320px]`, alturas limitadas).

* Layout de app: `c:\Chamado\src\pages\Layout.tsx:51–59, 191–197` (shell com `min-h-screen`, container central com `max-w-7xl`).

* Kanban está embutido em páginas: `c:\Chamado\src\pages\Dashboard.tsx:97–129` e `c:\Chamado\src\pages\TicketList.tsx:103–129`.

## Abordagem

* Habilitar “full-bleed” para páginas com Kanban, removendo o limite `max-w-7xl` apenas nesses contextos.

* Tornar o container de colunas do Kanban 100% largura e altura da área de conteúdo, com scroll horizontal quando necessário.

* Tornar a largura das colunas fluida (mínimo garantido), evitando largura fixa para melhor aproveitamento da tela.

* Usar CSS (flex/grid) para ajuste automático em resize, sem listeners de `window.resize`.

## Mudanças Principais

* Layout

  * Ajustar `Layout.tsx` para suportar modo “full-bleed” no conteúdo quando a rota/página estiver exibindo Kanban, trocando `max-w-7xl` por `max-w-none w-full` e `px-0`.

  * Garantir que a área de conteúdo tenha `flex-1 overflow-hidden` para permitir que o Kanban ocupe altura total disponível.

* Kanban

  * Substituir `min-h-[600px]` por altura baseada em container (`h-full`) no wrapper principal.

  * Trocar `w-[320px]` das colunas por `basis-[320px] flex-shrink-0 min-w-[300px]` para largura mínima fluida.

  * Alterar `DroppableList` de `max-h-[500px]` para `flex-1 min-h-0 overflow-y-auto`, permitindo que a lista use toda a altura do container.

  * Manter overflow horizontal no container de colunas (`overflow-x-auto`) com `h-full`.

* CSS

  * Se necessário, definir uma var CSS para altura do header no `Layout` e usar apenas `flex` com `min-h-0` para evitar cálculos explícitos.

## Ajuste com Boards

* Nenhuma mudança funcional em boards: criação/seleção já é feita via `BoardSelector` (`c:\Chamado\src\components\BoardSelector.tsx:30–41, 76–99`).

* O layout do Kanban permanece full-screen e se adapta ao tamanho da tela independentemente de quantos boards existam; a seleção do board atual continua como hoje.

## Validação

* Verificar visual em `/dashboard` e `/chamados`: Kanban preenche toda a largura; altura acompanha viewport; rolagem vertical por coluna; horizontal entre colunas.

* Redimensionar janela e confirmar ajuste automático sem rolagens duplas indesejadas.

* Criar boards novos e garantir que o Kanban continue ocupando a tela toda.

## Impacto e Riscos

* O ajuste de container `max-w` só será aplicado nas páginas em modo Kanban, preservando layout das demais páginas.

* Performance permanece igual (limite de 15 cards por coluna mantido). Virtualização não será introduzida nesta etapa.

## Entregáveis

* Atualização em `Layout.tsx` para suporte full-bleed condicionado ao Kanban.

* Ajustes de classe/estrutura em `TicketKanbanView.tsx` para altura total e colunas fluidas.

* Testes manuais de usabilidade e resize nas páginas que embutem o Kanban.

