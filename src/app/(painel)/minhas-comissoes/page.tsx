import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfissional } from '@/hooks/useProfissional'
import { supabase } from '@/lib/supabase/cliente'

/**
 * Interface para os itens de comissão
 * Representa um registro de ganho do profissional por serviço prestado
 */
interface ComissaoItem {
  id: string
  valor_base: number
  valor_calculado: number
  percentual: number | null
  tipo: 'percentual' | 'fixo'
  status: 'pendente' | 'aprovada' | 'paga' | 'cancelada'
  criado_em: string
  agendamento?: {
    cliente_nome: string
    servico_nome: string
  }
}

/**
 * Página de visualização de comissões para o perfil profissional.
 * Permite que o profissional logado acompanhe seus ganhos individuais.
 */
export default function MinhasComissoes() {
  const { profissional, carregando: profCarregando } = useProfissional()
  const [comissoes, setComissoes] = useState<ComissaoItem[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Aguarda o carregamento do perfil do profissional
    if (profCarregando) return
    
    // Se não houver profissional vinculado ao usuário, encerra o carregamento
    if (!profissional?.id) {
      setCarregando(false)
      return
    }

    const buscar = async () => {
      try {
        console.log('[minhas-comissoes] buscando dados para profissional:', profissional.id)
        
        // Busca comissões vinculadas ao profissional logado
        // Utilizamos query direta ignorando o erro de tipos do TS caso o types.ts esteja desatualizado
        const { data, error } = await (supabase as any)
          .from('comissoes')
          .select(`
            id, valor_base, valor_calculado, percentual, tipo, status, criado_em,
            lancamento:lancamentos (
              agendamento:agendamentos (
                cliente:clientes (nome),
                servico:servicos (nome)
              )
            )
          `)
          .eq('profissional_id', profissional.id)
          .order('criado_em', { ascending: false })

        if (error) throw error

        // Mapeamento dos dados para a interface do componente
        const items: ComissaoItem[] = (data ?? []).map((row: any) => ({
          id: row.id,
          valor_base: Number(row.valor_base),
          valor_calculado: Number(row.valor_calculado),
          percentual: row.percentual ? Number(row.percentual) : null,
          tipo: row.tipo,
          status: row.status,
          criado_em: row.criado_em,
          agendamento: row.lancamento?.agendamento ? {
            cliente_nome: row.lancamento.agendamento.cliente?.nome ?? '—',
            servico_nome: row.lancamento.agendamento.servico?.nome ?? '—',
          } : undefined,
        }))

        setComissoes(items)
      } catch (e) {
        console.error('[minhas-comissoes] erro ao buscar comissões:', e)
      } finally {
        setCarregando(false)
      }
    }

    buscar()
  }, [profissional?.id, profCarregando])

  // Estado de carregamento inicial do perfil
  if (profCarregando) return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )

  // Caso o usuário não tenha um perfil de profissional vinculado
  if (!profissional) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Você não está vinculado a um perfil de profissional para visualizar comissões.
      </div>
    )
  }

  // Função auxiliar para traduzir e colorir o badge de status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'paga':
        return <Badge className="bg-green-600 hover:bg-green-700">Paga</Badge>
      case 'aprovada':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Aprovada</Badge>
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>
      default:
        return <Badge variant="outline">Pendente</Badge>
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Minhas comissões</h1>
        <p className="text-sm text-muted-foreground">Acompanhe seus ganhos por serviço realizado</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {carregando ? 'Carregando...' : `${comissoes.length} comissão(ões) registrada(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : comissoes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhuma comissão encontrada no seu histórico.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Data</th>
                    <th className="text-left pb-2 font-medium">Cliente</th>
                    <th className="text-left pb-2 font-medium">Serviço</th>
                    <th className="text-right pb-2 font-medium">Valor</th>
                    <th className="text-center pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {comissoes.map(c => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3">{c.agendamento?.cliente_nome ?? '—'}</td>
                      <td className="py-3">{c.agendamento?.servico_nome ?? '—'}</td>
                      <td className="py-3 text-right font-semibold text-primary">
                        R$ {c.valor_calculado.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        })}
                      </td>
                      <td className="py-3 text-center">
                        {renderStatusBadge(c.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
