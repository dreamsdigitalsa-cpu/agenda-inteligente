# Agenda Inteligente — Claude Code Guide

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS + Radix UI (shadcn/ui via `components.json`)
- Supabase (banco PostgreSQL + autenticação + funções)
- TanStack Query v5, React Hook Form, Zod
- Package manager: **Bun** (`bun install`, `bun run dev`)

## Comandos essenciais
```bash
bun run dev        # servidor de desenvolvimento
bun run build      # build de produção
bun run lint       # lint
bun run test       # testes (Vitest)
```

> Se Bun não estiver instalado, use `npm run dev` / `npm run build` etc.

## Estrutura
```
src/
  components/   # componentes React (shadcn/ui + custom)
  pages/        # páginas (React Router)
  hooks/        # custom hooks
  integrations/ # clientes Supabase gerados
  lib/          # utilitários
supabase/
  migrations/   # migrações SQL
```

## Convenções Lovable
- Este projeto é gerenciado via **Lovable** com sincronização GitHub.
- Após qualquer alteração feita via Claude Code, **sempre faça push para `main`**.
- O Lovable detecta o push e sincroniza automaticamente.
- Não renomeie arquivos sem necessidade — o Lovable pode perder referências.
- Para adicionar componentes shadcn: `npx shadcn@latest add <component>`

## Workflow Claude Code → Lovable
1. Editar código localmente via Claude Code
2. `git add . && git commit -m "mensagem"`
3. `git push origin main`
4. Lovable sincroniza automaticamente

## Supabase
- Configuração em `src/integrations/supabase/`
- Migrações em `supabase/migrations/`
- Para rodar migrações locais: `supabase db push`
