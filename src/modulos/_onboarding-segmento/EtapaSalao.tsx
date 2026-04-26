// Etapa 5 do onboarding — específica para SALÃO de beleza.
// Configura: comissão dos profissionais, atendimento simultâneo e combos.
// Esta etapa é OPCIONAL — pode ser configurada depois em /painel/configuracoes.
//
// Os dados afetam:
// - Cálculo de comissão automática (módulo financeiro)
// - Bloqueio (ou não) de horários sobrepostos no mesmo profissional
// - Combos disponíveis no agendamento online (/agendar/:slug)
import { forwardRef, useImperativeHandle, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { RefEtapaSegmento } from './tipos'

interface ComboForm {
  nome: string
  duracao_minutos: number
  preco: number
}

const SUGESTOES_COMBOS: ComboForm[] = [
  { nome: 'Escova + Hidratação', duracao_minutos: 45, preco: 80 },
  { nome: 'Coloração + Corte', duracao_minutos: 180, preco: 250 },
]

const EtapaSalao = forwardRef<RefEtapaSegmento>((_, ref) => {
  const { tenant } = useTenant()

  const [comissaoTipo, setComissaoTipo] = useState<'percentual' | 'fixo'>('percentual')
  const [comissaoValor, setComissaoValor] = useState(40)
  const [atendimentoSimultaneo, setAtendimentoSimultaneo] = useState(false)
  const [combos, setCombos] = useState<ComboForm[]>(SUGESTOES_COMBOS)

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!tenant) throw new Error('Tenant não carregado')

      // 1) Salva configurações principais em configuracoes_segmento
      const { error } = await supabase.from('configuracoes_segmento').upsert(
        {
          tenant_id: tenant.id,
          segmento: 'salao',
          configuracoes: {
            comissao_tipo: comissaoTipo,
            comissao_valor: comissaoValor,
            atendimento_simultaneo: atendimentoSimultaneo,
          },
          configurado: true,
        },
        { onConflict: 'tenant_id' },
      )
      if (error) throw error

      // 2) Salva combos válidos em combos_servicos
      const validos = combos.filter((c) => c.nome.trim() && c.preco > 0)
      if (validos.length) {
        const { error: errCombos } = await supabase.from('combos_servicos').insert(
          validos.map((c) => ({
            tenant_id: tenant.id,
            nome: c.nome.trim(),
            duracao_minutos: c.duracao_minutos,
            preco: c.preco,
            servicos_ids: [],
          })),
        )
        if (errCombos) throw errCombos
      }
    },
  }))

  const adicionarCombo = () =>
    setCombos([...combos, { nome: '', duracao_minutos: 60, preco: 0 }])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações do salão</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Defina comissão, sobreposição e combos. Esta etapa é opcional.
        </p>
      </div>

      {/* SEÇÃO 1: Comissão */}
      <section className="space-y-3">
        <div>
          <h2 className="font-medium">Comissão padrão dos profissionais</h2>
          <p className="text-xs text-muted-foreground">
            Você pode ajustar individualmente por profissional depois.
          </p>
        </div>

        <RadioGroup
          value={comissaoTipo}
          onValueChange={(v) => setComissaoTipo(v as 'percentual' | 'fixo')}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="percentual" id="com-perc" />
            <Label htmlFor="com-perc">Percentual</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="fixo" id="com-fixo" />
            <Label htmlFor="com-fixo">Valor fixo</Label>
          </div>
        </RadioGroup>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            value={comissaoValor}
            onChange={(e) => setComissaoValor(Number(e.target.value) || 0)}
            className="max-w-[140px]"
          />
          <span className="text-sm text-muted-foreground">
            {comissaoTipo === 'percentual' ? '% por serviço' : 'R$ por serviço'}
          </span>
        </div>
      </section>

      {/* SEÇÃO 2: Atendimento simultâneo */}
      <div
        className="flex items-start justify-between p-4 rounded-md border"
        title="Útil para químicas que esperam tempo de pausa"
      >
        <div className="space-y-0.5">
          <Label className="text-base">Atendimento simultâneo</Label>
          <p className="text-xs text-muted-foreground">
            Profissionais podem atender múltiplos clientes ao mesmo tempo
            (útil para químicas que esperam tempo de pausa).
          </p>
        </div>
        <Switch checked={atendimentoSimultaneo} onCheckedChange={setAtendimentoSimultaneo} />
      </div>

      {/* SEÇÃO 3: Combos */}
      <section className="space-y-3">
        <div>
          <h2 className="font-medium">Combos de serviços</h2>
          <p className="text-xs text-muted-foreground">
            Pacotes vendidos em conjunto com preço promocional. Vincule serviços depois nas Configurações.
          </p>
        </div>
        {combos.map((c, i) => (
          <div
            key={i}
            className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_auto] gap-2 p-3 rounded-md border"
          >
            <Input
              placeholder="Nome do combo"
              value={c.nome}
              onChange={(e) => {
                const novo = [...combos]
                novo[i].nome = e.target.value
                setCombos(novo)
              }}
            />
            <Input
              type="number"
              min={5}
              placeholder="Min"
              value={c.duracao_minutos}
              onChange={(e) => {
                const novo = [...combos]
                novo[i].duracao_minutos = Number(e.target.value) || 30
                setCombos(novo)
              }}
            />
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="R$"
              value={c.preco}
              onChange={(e) => {
                const novo = [...combos]
                novo[i].preco = Number(e.target.value) || 0
                setCombos(novo)
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCombos(combos.filter((_, j) => j !== i))}
              disabled={combos.length === 1}
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" onClick={adicionarCombo} className="w-full">
          <Plus className="h-4 w-4" /> Adicionar combo
        </Button>
      </section>
    </div>
  )
})

EtapaSalao.displayName = 'EtapaSalao'
export default EtapaSalao
