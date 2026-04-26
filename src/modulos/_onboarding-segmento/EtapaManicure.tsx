// Etapa 5 do onboarding — específica para MANICURE.
// Configura: solo ou equipe, atendimento a domicílio e histórico de cores.
// Esta etapa é OPCIONAL — pode ser configurada depois em /painel/configuracoes.
//
// Os dados afetam:
// - Cálculo automático de taxa de deslocamento ao agendar (módulo financeiro)
// - Filtro por raio de atendimento na agenda
// - Sugestão de cores favoritas no atendimento
import { forwardRef, useImperativeHandle, useState } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { RefEtapaSegmento } from './tipos'

const EtapaManicure = forwardRef<RefEtapaSegmento>((_, ref) => {
  const { tenant } = useTenant()

  const [modo, setModo] = useState<'solo' | 'equipe'>('solo')
  const [duracaoExpress, setDuracaoExpress] = useState(30)
  const [atendeDomicilio, setAtendeDomicilio] = useState(false)
  const [taxaDeslocamento, setTaxaDeslocamento] = useState(20)
  const [raioKm, setRaioKm] = useState(10)
  const [registrarCores, setRegistrarCores] = useState(true)

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!tenant) throw new Error('Tenant não carregado')
      const { error } = await supabase.from('configuracoes_segmento').upsert(
        {
          tenant_id: tenant.id,
          segmento: 'manicure',
          configuracoes: {
            solo: modo === 'solo',
            duracao_express_min: duracaoExpress,
            atende_domicilio: atendeDomicilio,
            taxa_deslocamento: atendeDomicilio ? taxaDeslocamento : null,
            raio_km: atendeDomicilio ? raioKm : null,
            registrar_cores: registrarCores,
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
        <h1 className="text-2xl font-semibold">Configurações da manicure</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure como você atende. Esta etapa é opcional.
        </p>
      </div>

      {/* Modo solo ou equipe */}
      <div className="space-y-3">
        <Label>Atendimento solo ou múltiplas profissionais?</Label>
        <RadioGroup value={modo} onValueChange={(v) => setModo(v as 'solo' | 'equipe')}>
          <div className="flex items-center space-x-2 p-3 rounded-md border">
            <RadioGroupItem value="solo" id="modo-solo" />
            <Label htmlFor="modo-solo" className="cursor-pointer flex-1">
              Sou eu mesma
              <span className="block text-xs text-muted-foreground font-normal">
                Vou preencher meu nome como profissional principal.
              </span>
            </Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-md border">
            <RadioGroupItem value="equipe" id="modo-equipe" />
            <Label htmlFor="modo-equipe" className="cursor-pointer flex-1">
              Tenho equipe
              <span className="block text-xs text-muted-foreground font-normal">
                Quero cadastrar várias profissionais.
              </span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Duração padrão */}
      <div className="space-y-2">
        <Label htmlFor="duracao-express">Duração padrão dos serviços expressos (min)</Label>
        <Input
          id="duracao-express"
          type="number"
          min={5}
          max={120}
          value={duracaoExpress}
          onChange={(e) => setDuracaoExpress(Number(e.target.value) || 30)}
          className="max-w-[200px]"
        />
      </div>

      {/* Atendimento a domicílio */}
      <div className="flex items-start justify-between p-4 rounded-md border">
        <div className="space-y-0.5">
          <Label className="text-base">Aceita atendimento a domicílio?</Label>
          <p className="text-xs text-muted-foreground">
            Cobre uma taxa de deslocamento e defina um raio máximo.
          </p>
        </div>
        <Switch checked={atendeDomicilio} onCheckedChange={setAtendeDomicilio} />
      </div>

      {atendeDomicilio && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/30">
          <div className="space-y-2">
            <Label htmlFor="taxa">Taxa de deslocamento (R$)</Label>
            <Input
              id="taxa"
              type="number"
              min={0}
              value={taxaDeslocamento}
              onChange={(e) => setTaxaDeslocamento(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="raio">Raio máximo de atendimento (km)</Label>
            <Input
              id="raio"
              type="number"
              min={1}
              value={raioKm}
              onChange={(e) => setRaioKm(Number(e.target.value) || 1)}
            />
          </div>
        </div>
      )}

      {/* Histórico de cores */}
      <div className="flex items-start justify-between p-4 rounded-md border">
        <div className="space-y-0.5">
          <Label className="text-base">Cores favoritas dos clientes</Label>
          <p className="text-xs text-muted-foreground">
            Registrar histórico de cores e esmaltes preferidos por cliente.
          </p>
        </div>
        <Switch checked={registrarCores} onCheckedChange={setRegistrarCores} />
      </div>
    </div>
  )
})

EtapaManicure.displayName = 'EtapaManicure'
export default EtapaManicure
