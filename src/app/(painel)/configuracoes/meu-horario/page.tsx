import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfissional } from '@/hooks/useProfissional'
import { supabase } from '@/lib/supabase/cliente'

/**
 * Mapeamento dos dias da semana para exibição
 */
const DIAS_SEMANA = [
  { num: 1, nome: 'Segunda-feira' },
  { num: 2, nome: 'Terça-feira' },
  { num: 3, nome: 'Quarta-feira' },
  { num: 4, nome: 'Quinta-feira' },
  { num: 5, nome: 'Sexta-feira' },
  { num: 6, nome: 'Sábado' },
  { num: 0, nome: 'Domingo' },
]

/**
 * Estrutura de um dia de horário de trabalho
 */
interface HorarioDia {
  dia_semana: number
  trabalha: boolean
  hora_inicio: string
  hora_fim: string
  intervalo_inicio: string
  intervalo_fim: string
  tem_intervalo: boolean
}

/**
 * Horário padrão para dias ainda não configurados no banco
 */
const HORARIO_PADRAO: Omit<HorarioDia, 'dia_semana'> = {
  trabalha: false,
  hora_inicio: '09:00',
  hora_fim: '18:00',
  intervalo_inicio: '12:00',
  intervalo_fim: '13:00',
  tem_intervalo: true,
}

/**
 * Página de configuração de horário individual do profissional.
 * Atualmente exibe apenas os horários cadastrados (read-only).
 */
export default function MeuHorario() {
  const { profissional, carregando: profCarregando } = useProfissional()
  const [horarios, setHorarios] = useState<HorarioDia[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Aguarda o carregamento do perfil do profissional logado
    if (profCarregando) return
    
    // Se não houver profissional vinculado, encerra o carregamento
    if (!profissional?.id) {
      setCarregando(false)
      return
    }

    /**
     * Busca os horários cadastrados na tabela horarios_profissional
     */
    const buscar = async () => {
      try {
        const { data, error } = await supabase
          .from('horarios_profissional')
          .select('*')
          .eq('profissional_id', profissional.id)

        if (error) throw error

        const dadosBanco = data ?? []
        
        // Garante que todos os 7 dias da semana apareçam na lista, 
        // mesmo que não existam no banco de dados
        const todosDias: HorarioDia[] = DIAS_SEMANA.map(d => {
          const banco = dadosBanco.find((h: any) => h.dia_semana === d.num)
          if (banco) {
            return {
              dia_semana: d.num,
              trabalha: banco.ativo ?? true,
              hora_inicio: banco.hora_inicio?.slice(0, 5) ?? '09:00',
              hora_fim: banco.hora_fim?.slice(0, 5) ?? '18:00',
              intervalo_inicio: banco.intervalo_inicio?.slice(0, 5) ?? '12:00',
              intervalo_fim: banco.intervalo_fim?.slice(0, 5) ?? '13:00',
              tem_intervalo: !!banco.intervalo_inicio,
            }
          }
          return { dia_semana: d.num, ...HORARIO_PADRAO }
        })

        setHorarios(todosDias)
      } catch (e) {
        console.error('[meu-horario] erro ao buscar horários:', e)
      } finally {
        setCarregando(false)
      }
    }

    buscar()
  }, [profissional?.id, profCarregando])

  // Exibição de skeleton enquanto carrega os dados
  if (carregando || profCarregando) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-10 w-48 mb-4" />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  // Fallback caso não haja profissional vinculado ao usuário logado
  if (!profissional) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Você não está vinculado a um perfil de profissional para configurar horários.
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Meu horário</h1>
        <p className="text-sm text-muted-foreground">
          Visualize sua escala de trabalho. Esses horários definem quando sua agenda
          estará disponível para novos agendamentos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horário semanal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {horarios.map(h => {
            const nomeDia = DIAS_SEMANA.find(d => d.num === h.dia_semana)?.nome
            return (
              <div key={h.dia_semana} className="border rounded-lg p-3 transition-colors hover:bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{nomeDia}</span>
                  <span className={`text-sm ${h.trabalha ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                    {h.trabalha
                      ? `${h.hora_inicio} - ${h.hora_fim}${h.tem_intervalo ? ` · intervalo ${h.intervalo_inicio} - ${h.intervalo_fim}` : ''}`
                      : 'Não trabalha'}
                  </span>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded-lg border border-dashed">
        A funcionalidade de edição e salvamento de horários será disponibilizada em breve.
      </p>
    </div>
  )
}
