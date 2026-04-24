## Diagnóstico

A tela branca em `/` (que deveria mostrar a Landing Page com botão de "Entrar") tem **uma causa raiz clara**:

### Problema 1 (CRÍTICO) — Build quebrado por dependência peer faltando
O build do Vite falha com:
```
Rollup failed to resolve import "@tanstack/query-core"
from "@tanstack/react-query"
```

O pacote `@tanstack/react-query@5.83.0` está instalado, mas sua dependência peer `@tanstack/query-core` **não está declarada no `package.json`**. Em produção (preview publicado / build servido), isso resulta em **bundle inválido → tela 100% branca**, exatamente o que aparece no screenshot. No dev local pode funcionar parcialmente porque o Vite resolve via `node_modules` em runtime.

### Problema 2 — Sidebar do painel
O `SidebarPainel` usa `className="... flex ... hidden md:flex"`. A classe `hidden` ganha porque vem depois, então em desktop o Tailwind aplica `md:flex` corretamente. O sidebar **só aparece dentro de `/painel/*` após login** — não na landing nem no login. Provavelmente "não tem sidebar" é consequência de o app inteiro estar branco (Problema 1), não um bug do sidebar em si. Mesmo assim, vou simplificar para garantir.

### Problema 3 — Falta de feedback visual
O `<RotaProtegida>` mostra "Carregando…" enquanto checa sessão, mas a `LandingPage` em `/` não depende disso. O branco **é** efeito do bundle quebrado.

## Plano de Correção

### 1. Adicionar `@tanstack/query-core` como dependência
Instalar a versão compatível (`^5.83.0`) para que o Rollup resolva o import e o build de produção funcione. Isso resolve a tela branca.

```
bun add @tanstack/query-core@^5.83.0
```

### 2. Validar build limpo
Rodar `bunx vite build` após instalar para confirmar que não há outros imports não resolvidos.

### 3. Pequena melhoria de robustez no Sidebar
No `src/componentes/layout/SidebarPainel.tsx`, trocar a combinação confusa `flex ... hidden md:flex` por apenas `hidden md:flex` (remover o `flex` redundante que precede), evitando ambiguidade em futuras mudanças. Sem impacto visual.

### 4. Garantir fallback de erro global
Adicionar um simples `ErrorBoundary` em volta do `<App />` em `src/main.tsx` para que, se algo quebrar em runtime no futuro, o usuário veja uma mensagem de erro legível em vez de tela branca silenciosa.

## Arquivos a alterar

- `package.json` — adicionar `@tanstack/query-core`
- `src/main.tsx` — envolver `<App />` em `ErrorBoundary` simples
- `src/componentes/ErrorBoundary.tsx` — novo componente (mostra mensagem amigável + botão recarregar)
- `src/componentes/layout/SidebarPainel.tsx` — limpar classe redundante

## Resultado esperado

- Acessar `/` → Landing Page renderiza normalmente com botões "Entrar" / "Cadastro"
- Acessar `/login` → tela de login funcional
- Após login → painel com sidebar visível à esquerda em desktop e menu hamburguer em mobile
- Qualquer erro JS futuro → mensagem visível em vez de tela branca
