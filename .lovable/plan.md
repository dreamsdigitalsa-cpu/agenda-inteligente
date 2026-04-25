## Diagnóstico

A causa mais provável da tela branca recorrente está no cliente Supabase do frontend:

- O `.env` atual possui `VITE_SUPABASE_PUBLISHABLE_KEY`.
- O código ainda lê `VITE_SUPABASE_ANON_KEY` em:
  - `src/integrations/supabase/client.ts`
  - `src/app/agendar/[slug]/page.tsx`
- Com isso, a chave usada pelo `createClient` pode ficar `undefined`, causando erro de inicialização antes das páginas renderizarem.
- Isso explica por que a tela branca “vai e volta”: qualquer rota que importe o cliente Supabase pode quebrar antes do React exibir login, landing ou painel.

Também confirmei que:
- `vite.config.ts` não tem mais `X-Frame-Options` nem `frame-ancestors` no dev server.
- O log recente do Vite não mostra erro de servidor.
- O problema está mais alinhado com erro runtime no browser/preview, não com build server.

## Plano de correção

1. Corrigir o cliente Supabase do frontend
   - Atualizar `src/integrations/supabase/client.ts` para usar `VITE_SUPABASE_PUBLISHABLE_KEY` como variável principal.
   - Manter fallback para `VITE_SUPABASE_ANON_KEY` caso algum ambiente antigo ainda use esse nome.
   - Adicionar validação explícita de `SUPABASE_URL` e chave antes de criar o client, para exibir erro claro em vez de tela branca silenciosa.

2. Corrigir a página pública de agendamento
   - Atualizar `src/app/agendar/[slug]/page.tsx` para usar a mesma regra:
     - `VITE_SUPABASE_PUBLISHABLE_KEY || VITE_SUPABASE_ANON_KEY`
   - Evitar chamadas à Edge Function com token `undefined`.

3. Melhorar a proteção contra tela branca
   - Ajustar o `ErrorBoundary` para exibir uma mensagem técnica mais útil quando houver erro de configuração Supabase.
   - Garantir que erro de variável de ambiente apareça na tela em vez de parecer “branco”.

4. Validar após a correção
   - Rodar build de produção.
   - Verificar se não há referências restantes a `VITE_SUPABASE_ANON_KEY` sem fallback no frontend.
   - Conferir o log do dev server após a correção.

## Resultado esperado

- A rota `/` volta a renderizar normalmente.
- `/login` e `/cadastro` deixam de quebrar por chave Supabase ausente.
- Rotas públicas como `/agendar/:slug` também passam a usar a chave correta.
- Se no futuro faltar alguma variável de ambiente, o app mostra erro claro em vez de tela branca.