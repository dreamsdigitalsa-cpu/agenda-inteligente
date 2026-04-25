
# Redesign do Painel — Inspiração "Cascal"

Aplicar uma nova identidade visual no painel autenticado, inspirada nas referências enviadas (estilo Cascal), mantendo todo o conteúdo em **português-BR**, adicionando **tema claro e escuro** com toggle global, e refinando sidebar, header e principais páginas (Agenda, Clientes, Estoque/Catálogo, Financeiro, Relatórios, Configurações).

## 1. Sistema de Design (tokens)

Atualizar `src/index.css` e `tailwind.config.ts` com a paleta inspirada nas referências:

**Tema Claro**
- `--background`: cinza-lavanda muito claro (`250 30% 97%`)
- `--card` / surfaces: branco puro com bordas suaves
- `--primary` (violeta): `255 75% 65%` (botões "Add new", item ativo)
- `--accent`: violeta-50 para hover/ativo
- `--muted-foreground`: cinza neutro para textos secundários
- `--sidebar-background`: branco com sombra leve
- Radius global: `1rem` (cards bem arredondados como na referência)

**Tema Escuro**
- `--background`: `240 15% 8%` (quase preto azulado)
- `--card`: `240 12% 12%`
- `--primary`: violeta `260 80% 70%` (mais brilhante para contraste)
- `--sidebar-background`: `240 14% 10%`
- Bordas: `240 10% 18%`

Tudo em HSL via variáveis CSS. Componentes shadcn já consomem esses tokens, então a troca propaga.

## 2. Toggle de Tema (claro/escuro/sistema)

- Criar `src/componentes/tema/ProvedorTema.tsx` (Context + persistência em `localStorage` + classe `dark` no `<html>`).
- Criar `src/componentes/tema/BotaoTema.tsx` com ícones Sol/Lua/Monitor (lucide).
- Envolver `<App />` com o provedor em `src/main.tsx`.
- Botão exposto no header global e também no menu de perfil.

## 3. Nova Sidebar (`SidebarPainel.tsx`)

Reescrita inspirada na referência:

```text
┌─────────────────────────┐
│  ◆ BelezaF3             │  ← logo + brand
├─────────────────────────┤
│  MENU PRINCIPAL         │  ← seção em caps
│  🏠 Início              │
│  📅 Agenda              │
│  👥 Clientes      ▾     │  ← submenu colapsável
│      • Lista            │
│      • Aniversariantes  │
│  💲 Financeiro    ▾     │
│      • Caixa            │
│      • Comissões        │
│  📦 Estoque             │
│  📊 Relatórios          │
│  📋 Fila de espera      │
│                         │
│  PREFERÊNCIAS           │
│  ⚙ Configurações        │
│  💳 Assinatura          │
├─────────────────────────┤
│  ╭─ Setup do perfil ─╮  │
│  │  60% concluído    │  │  ← card de progresso
│  │  [Completar]      │  │
│  ╰───────────────────╯  │
└─────────────────────────┘
```

- Item ativo: fundo `bg-primary/10`, texto `text-primary`, indicador lateral à esquerda (barra vertical de 3px).
- Submenus colapsáveis com `Collapsible` shadcn.
- Card "Setup do perfil" no rodapé com anel de progresso (% de onboarding concluído).
- Versão mobile via `Sheet` (já existe), mantendo o mesmo visual.

## 4. Header Global (novo componente)

Criar `src/componentes/layout/HeaderPainel.tsx` exibido acima do `<Outlet />`:

```text
[🔍 Buscar...        ⚙]              [🔔3] [✉]   👤 Nome do Usuário
                                                     Ver perfil ▾
```

- Busca global (placeholder por enquanto, abre `Command` palette).
- Botão de notificações com badge.
- **Botão de tema** (Sol/Lua).
- Avatar + nome + dropdown (Perfil, Configurações, Sair).

## 5. Páginas redesenhadas

Todas seguem o mesmo padrão: padding `p-6`/`p-8`, cards com `rounded-2xl`, sombras suaves, espaçamento generoso.

**Agenda** — Cabeçalho com título grande, badges de profissionais como "chips" coloridos, grade com slots arredondados, card de "próximo agendamento" em destaque violeta.

**Clientes** — Dois modos de visualização: **grade de cards** (padrão, igual à referência "All Client (5.5K)") e **tabela** (toggle no canto superior direito). Cards com avatar, nome, função, e-mail, telefone, links rápidos para "Avaliações" e "Vendas".

**Modal Novo Cliente** — Refeito conforme referência: dialog centralizado, campos `Nome`, `Sobrenome`, `E-mail`, `Gênero`, `Ano`, `Informações do cliente`, switch "Exibir em todos os agendamentos", botões `Cancelar` (ghost) e `Salvar` (violeta arredondado).

**Estoque (Produtos)** — Grade de cards 3 colunas com imagem do produto à esquerda, nome + preço, descrição em duas linhas, e card final tracejado "+ Adicionar novo".

**Catálogo de Serviços** (em `configuracoes` ou nova rota) — Layout split: lista de serviços à esquerda + painel de detalhes à direita com imagem, descrição e horários disponíveis (igual à referência).

**Financeiro** — Cards de KPI no topo (Receita, Despesas, Lucro, Ticket médio) com mini-gráficos sparkline, gráfico principal e tabela de lançamentos.

**Relatórios** — Card hero violeta no topo (igual ao "Trendy Studio" da referência) com resumo do período, abaixo grid de métricas com barras de progresso horizontais.

**Configurações** — Tabs verticais à esquerda (estilo da referência), conteúdo à direita.

## 6. Componentes auxiliares

- `src/componentes/ui/CardKPI.tsx` — card de métrica padronizado.
- `src/componentes/ui/CardEstatistica.tsx` — card com barra horizontal (estilo "Customer reviews").
- `src/componentes/ui/AneeProgresso.tsx` — anel SVG de progresso para o card de setup.

## 7. Detalhes técnicos

- **Sem novas dependências** — usa apenas shadcn/ui já presente, lucide-react e tailwindcss-animate.
- Todos os textos em **pt-BR**.
- Acessibilidade: contraste AA em ambos os temas, foco visível, `aria-label` no botão de tema.
- Responsivo: sidebar vira `Sheet` em < 768px, grades de cards reduzem para 2 colunas em tablet e 1 em mobile.
- Persistência do tema: `localStorage` chave `tema-belezaf3` com valores `claro` | `escuro` | `sistema`.

## 8. Arquivos a criar / editar

**Criar**
- `src/componentes/tema/ProvedorTema.tsx`
- `src/componentes/tema/BotaoTema.tsx`
- `src/componentes/layout/HeaderPainel.tsx`
- `src/componentes/ui/CardKPI.tsx`
- `src/componentes/ui/CardEstatistica.tsx`
- `src/componentes/ui/AneeProgresso.tsx`

**Editar**
- `src/index.css` (nova paleta + dark mode)
- `tailwind.config.ts` (radius, shadows customizadas)
- `src/main.tsx` (envolver com `ProvedorTema`)
- `src/componentes/layout/SidebarPainel.tsx` (reescrita visual + submenus + card setup)
- `src/componentes/layout/LayoutPainel.tsx` (incluir HeaderPainel)
- `src/app/(painel)/agenda/page.tsx` + componentes da agenda (refino visual)
- `src/app/(painel)/clientes/page.tsx` (modo cards + toggle)
- `src/componentes/clientes/ModalCliente.tsx` (novo layout do dialog)
- `src/app/(painel)/estoque/page.tsx` (grade de cards)
- `src/app/(painel)/financeiro/page.tsx` (KPIs + gráficos)
- `src/app/(painel)/relatorios/page.tsx` (hero + barras)
- `src/app/(painel)/configuracoes/page.tsx` (tabs verticais)

Páginas não citadas (assinatura, fila, tatuagem, super-admin) recebem apenas a atualização automática de tokens (mesma identidade), sem reestruturação de layout nessa rodada — podemos refinar depois conforme prioridade.
