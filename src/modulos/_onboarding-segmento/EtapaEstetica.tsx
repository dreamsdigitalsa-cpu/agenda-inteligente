// Etapa 5 do onboarding — específica para ESTÉTICA.
// Configura: protocolos de tratamento, anamnese e fotos before/after.
// Esta etapa é OPCIONAL — pode ser configurada depois em /painel/estetica/*.
//
// Os dados afetam:
// - Pacotes vendidos no módulo financeiro (sessões fechadas)
// - Bloqueio de agendamento sem anamnese (se obrigatória)
// - Captura automática de fotos no atendimento (módulo evolução)
import { forwardRef, useImperativeHandle, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import type { RefEtapaSegmento } from './tipos'

interface ProtocoloForm {
  nome: string
  numero_sessoes: number
  intervalo_minimo_dias: number
}

const SUGESTOES_PROTOCOLOS: ProtocoloForm[] = [
  { nome: 'Limpeza profunda', numero_sessoes: 5, intervalo_minimo_dias: 15 },
  { nome: 'Drenagem linfática', numero_sessoes: 10, intervalo_minimo_dias: 7 },
  { nome: 'Peeling', numero_sessoes: 4, intervalo_minimo_dias: 21 },
]

const EtapaEstetica = forwardRef<RefEtapaSegmento>((_, ref) => {
  const { tenant } = useTenant()

  const [protocolos, setProtocolos] = useState<ProtocoloForm[]>(SUGESTOES_PROTOCOLOS)
  const [anamneseObrigatoria, setAnamneseObrigatoria] = useState(true)
  const [fotosAutomaticas, setFotosAutomaticas] = useState(true)

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!tenant) throw new Error('Tenant não carregado')

      // 1) Salva protocolos válidos na tabela estetica_protocolos
      const validos = protocolos.filter((p) => p.nome.trim())
      if (validos.length) {
        const { error: errProto } = await supabase.from('estetica_protocolos').insert(
          validos.map((p) => ({
            tenant_id: tenant.id,
            nome: p.nome.trim(),
            numero_sessoes: p.numero_sessoes,
            intervalo_minimo_dias: p.intervalo_minimo_dias,
          })),
        )
        if (errProto) throw errProto
      }

      // 2) Salva configurações de comportamento em configuracoes_segmento
      const { error } = await supabase.from('configuracoes_segmento').upsert(
        {
          tenant_id: tenant.id,
          segmento: 'estetica',
          configuracoes: {
            anamnese_obrigatoria: anamneseObrigatoria,
            fotos_automaticas: fotosAutomaticas,
          },
          configurado: true,
        },
        { onConflict: 'tenant_id' },
      )
      if (error) throw error
    },
  }))

  const adicionarProtocolo = () =>
    setProtocolos([...protocolos, { nome: '', numero_sessoes: 1, intervalo_minimo_dias: 7 }])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações da estética</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure protocolos e padrões clínicos. Esta etapa é opcional.
        </p>
      </div>

      {/* SEÇÃO 1: Protocolos */}
      <section className="space-y-3">
        <div>
          <h2 className="font-medium">Protocolos de tratamento</h2>
          <p className="text-xs text-muted-foreground">
            Defina pacotes de sessões com intervalo mínimo entre elas.
          </p>
        </div>
        {protocolos.map((p, i) => (
          <div
            key={i}
            className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_auto] gap-2 p-3 rounded-md border"
          >
            <Input
              placeholder="Nome do protocolo"
              value={p.nome}
              onChange={(e) => {
                const novo = [...protocolos]
                novo[i].nome = e.target.value
                setProtocolos(novo)
              }}
            />
            <Input
              type="number"
              min={1}
              placeholder="Sessões"
              value={p.numero_sessoes}
              onChange={(e) => {
                const novo = [...protocolos]
                novo[i].numero_sessoes = Number(e.target.value) || 1
                setProtocolos(novo)
              }}
            />
            <Input
              type="number"
              min={0}
              placeholder="Intervalo (dias)"
              value={p.intervalo_minimo_dias}
              onChange={(e) => {
                const novo = [...protocolos]
                novo[i].intervalo_minimo_dias = Number(e.target.value) || 0
                setProtocolos(novo)
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setProtocolos(protocolos.filter((_, j) => j !== i))}
              disabled={protocolos.length === 1}
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" onClick={adicionarProtocolo} className="w-full">
          <Plus className="h-4 w-4" /> Adicionar protocolo
        </Button>
      </section>

      {/* SEÇÃO 2: Anamnese */}
      <div className="flex items-start justify-between p-4 rounded-md border">
        <div className="space-y-0.5">
          <Label className="text-base">Anamnese obrigatória</Label>
          <p className="text-xs text-muted-foreground">
            Exigir anamnese antes do primeiro atendimento de cada cliente.
          </p>
        </div>
        <Switch checked={anamneseObrigatoria} onCheckedChange={setAnamneseObrigatoria} />
      </div>

      {/* SEÇÃO 3: Fotos */}
      <div className="flex items-start justify-between p-4 rounded-md border">
        <div className="space-y-0.5">
          <Label className="text-base">Fotos before/after</Label>
          <p className="text-xs text-muted-foreground">
            Capturar fotos automaticamente em cada sessão para acompanhar evolução.
          </p>
        </div>
        <Switch checked={fotosAutomaticas} onCheckedChange={setFotosAutomaticas} />
      </div>
    </div>
  )
})

EtapaEstetica.displayName = 'EtapaEstetica'
export default EtapaEstetica
