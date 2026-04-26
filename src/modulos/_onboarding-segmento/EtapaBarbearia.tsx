// Etapa 5 do onboarding — específica para BARBEARIA.
// Configura: fila de espera, tempo médio, horário de pico e modo painel TV.
// Esta etapa é OPCIONAL — o usuário pode pular e configurar depois nas
// Configurações > Fila do painel.
//
// Os dados configurados aqui afetam:
// - Estimativa de tempo de espera no painel TV (/painel/fila/tv)
// - Sugestões automáticas de horários de pico no relatório
// - Exibição (ou não) da fila pública na página fila/:slug
import { forwardRef, useImperativeHandle, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { RefEtapaSegmento } from './tipos'

const EtapaBarbearia = forwardRef<RefEtapaSegmento>((_, ref) => {
  const { tenant } = useTenant()

  // Campos com defaults sensatos
  const [filaHabilitada, setFilaHabilitada] = useState(true)
  const [tempoMedio, setTempoMedio] = useState(30)
  const [horarioPico, setHorarioPico] = useState<'manha' | 'tarde' | 'noite'>('tarde')
  const [modoTv, setModoTv] = useState(false)

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!tenant) throw new Error('Tenant não carregado')
      const { error } = await supabase
        .from('configuracoes_segmento')
        .upsert(
          {
            tenant_id: tenant.id,
            segmento: 'barbearia',
            configuracoes: {
              fila_habilitada: filaHabilitada,
              tempo_medio_min: tempoMedio,
              horario_pico: horarioPico,
              modo_tv: modoTv,
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
        <h1 className="text-2xl font-semibold">Configurações da barbearia</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize recursos exclusivos do seu segmento. Você pode pular esta etapa
          e configurar depois nas Configurações.
        </p>
      </div>

      {/* Fila de espera */}
      <div className="flex items-start justify-between p-4 rounded-md border">
        <div className="space-y-0.5">
          <Label className="text-base">Habilitar fila de espera</Label>
          <p className="text-xs text-muted-foreground">
            Permite que clientes entrem na fila sem horário marcado.
          </p>
        </div>
        <Switch checked={filaHabilitada} onCheckedChange={setFilaHabilitada} />
      </div>

      {/* Tempo médio */}
      <div className="space-y-2">
        <Label htmlFor="tempo-medio">Tempo médio de atendimento (min)</Label>
        <Input
          id="tempo-medio"
          type="number"
          min={5}
          max={180}
          value={tempoMedio}
          onChange={(e) => setTempoMedio(Number(e.target.value) || 30)}
          className="max-w-[200px]"
        />
        <p className="text-xs text-muted-foreground">
          Usado para estimar o tempo de espera no painel TV.
        </p>
      </div>

      {/* Horário de pico */}
      <div className="space-y-2">
        <Label>Horário de pico esperado</Label>
        <Select value={horarioPico} onValueChange={(v) => setHorarioPico(v as typeof horarioPico)}>
          <SelectTrigger className="max-w-[280px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manha">Manhã (8h às 12h)</SelectItem>
            <SelectItem value="tarde">Tarde (12h às 18h)</SelectItem>
            <SelectItem value="noite">Noite (18h às 22h)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Usado para sugestões futuras de escala da equipe.
        </p>
      </div>

      {/* Painel TV */}
      <div className="flex items-start justify-between p-4 rounded-md border">
        <div className="space-y-0.5">
          <Label className="text-base">Modo painel TV</Label>
          <p className="text-xs text-muted-foreground">
            Mostrar fila pública em uma TV do estabelecimento.
          </p>
        </div>
        <Switch checked={modoTv} onCheckedChange={setModoTv} />
      </div>

      {modoTv && (
        <Button
          variant="outline"
          onClick={() => window.open('/painel/fila/tv', '_blank')}
          className="w-full sm:w-auto"
        >
          <ExternalLink className="h-4 w-4" /> Configurar painel TV agora
        </Button>
      )}
    </div>
  )
})

EtapaBarbearia.displayName = 'EtapaBarbearia'
export default EtapaBarbearia
