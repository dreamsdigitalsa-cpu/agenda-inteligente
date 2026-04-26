// Etapa 5 do onboarding — específica para TATUAGEM.
// Configura: depósito antecipado, duração de sessão e portfólio público.
// Esta etapa é OPCIONAL — pode ser configurada depois em /painel/tatuagem/*.
//
// Os dados afetam:
// - Cobrança de depósito ao confirmar orçamento (módulo financeiro)
// - Cálculo automático de duração ao agendar sessão
// - Página pública /portfolio/:slug
import { forwardRef, useImperativeHandle, useState } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { RefEtapaSegmento } from './tipos'

const EtapaTatuagem = forwardRef<RefEtapaSegmento>((_, ref) => {
  const { tenant } = useTenant()

  const [depositoHabilitado, setDepositoHabilitado] = useState(true)
  const [valorMinimo, setValorMinimo] = useState(100)
  const [percentual, setPercentual] = useState(30)
  const [duracaoPadrao, setDuracaoPadrao] = useState(3)
  const [portfolioPublico, setPortfolioPublico] = useState(true)

  // Slug derivado do nome do tenant para mostrar a URL do portfólio
  const slug = tenant?.nome
    ? tenant.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : ''

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!tenant) throw new Error('Tenant não carregado')
      const { error } = await supabase.from('configuracoes_segmento').upsert(
        {
          tenant_id: tenant.id,
          segmento: 'tatuagem',
          configuracoes: {
            deposito_habilitado: depositoHabilitado,
            valor_minimo_deposito: valorMinimo,
            percentual_deposito: percentual,
            duracao_padrao_horas: duracaoPadrao,
            portfolio_publico: portfolioPublico,
          },
          configurado: true,
        },
        { onConflict: 'tenant_id' },
      )
      if (error) throw error
    },
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações do estúdio de tatuagem</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure depósitos, sessões e portfólio. Esta etapa é opcional.
        </p>
      </div>

      {/* Depósito antecipado */}
      <div className="flex items-start justify-between p-4 rounded-md border">
        <div className="space-y-0.5">
          <Label className="text-base">Cobrar depósito antecipado</Label>
          <p className="text-xs text-muted-foreground">
            Garante que o cliente confirme a sessão pagando uma parte antes.
          </p>
        </div>
        <Switch checked={depositoHabilitado} onCheckedChange={setDepositoHabilitado} />
      </div>

      {depositoHabilitado && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/30">
          <div className="space-y-2">
            <Label htmlFor="valor-minimo">Valor mínimo de depósito (R$)</Label>
            <Input
              id="valor-minimo"
              type="number"
              min={0}
              value={valorMinimo}
              onChange={(e) => setValorMinimo(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="percentual">Percentual de depósito (%)</Label>
            <Input
              id="percentual"
              type="number"
              min={0}
              max={100}
              value={percentual}
              onChange={(e) => setPercentual(Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">Sobre o orçamento total.</p>
          </div>
        </div>
      )}

      {/* Duração padrão */}
      <div className="space-y-2">
        <Label htmlFor="duracao-padrao">Duração padrão de sessão (horas)</Label>
        <Input
          id="duracao-padrao"
          type="number"
          min={1}
          max={12}
          value={duracaoPadrao}
          onChange={(e) => setDuracaoPadrao(Number(e.target.value) || 1)}
          className="max-w-[200px]"
        />
      </div>

      {/* Portfólio público */}
      <section className="space-y-3">
        <div className="flex items-start justify-between p-4 rounded-md border">
          <div className="space-y-0.5">
            <Label className="text-base">Habilitar página pública de portfólio</Label>
            <p className="text-xs text-muted-foreground">
              Permite que clientes vejam seus trabalhos antes de orçar.
            </p>
          </div>
          <Switch checked={portfolioPublico} onCheckedChange={setPortfolioPublico} />
        </div>

        {portfolioPublico && slug && (
          <div className="bg-muted rounded-md p-4 space-y-2">
            <p className="text-xs text-muted-foreground">URL do seu portfólio:</p>
            <p className="font-mono text-sm break-all">
              {window.location.origin}/portfolio/{slug}
            </p>
            <p className="text-xs text-muted-foreground">
              Você poderá adicionar fotos depois em <strong>/painel/tatuagem/portfolio</strong>.
            </p>
          </div>
        )}
      </section>
    </div>
  )
})

EtapaTatuagem.displayName = 'EtapaTatuagem'
export default EtapaTatuagem
