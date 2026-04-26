// Painel do Profissional — Meus Clientes
//
// Lista os clientes que o profissional logado já atendeu (status = concluido),
// com busca por nome/telefone, contagem de atendimentos e data da última visita.
// RLS já restringe por tenant; o filtro por profissional_id evita ver clientes
// de outros profissionais.
import { useEffect, useState } from 'react'
import { useProfissional } from '@/hooks/useProfissional'
import { supabase } from '@/lib/supabase/cliente'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, User, Calendar } from 'lucide-react'

interface ClienteAtendido {
  id: string
  nome: string
  telefone: string | null
  ultima_visita: string | null
  total_atendimentos: number
}

export default function MeusClientes() {
  const { profissional, carregando: profCarregando } = useProfissional()
  const [clientes, setClientes] = useState<ClienteAtendido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    if (profCarregando) return
    if (!profissional?.id) {
      setCarregando(false)
      return
    }

    let cancelado = false

    const buscar = async () => {
      setCarregando(true)
      try {
        // Busca todos os agendamentos concluídos deste profissional
        // junto com dados do cliente, então agrupa em memória.
        const { data, error } = await supabase
          .from('agendamentos')
          .select(
            `cliente_id,
             data_hora_inicio,
             cliente:clientes (id, nome, telefone)`,
          )
          .eq('profissional_id', profissional.id)
          .eq('status', 'concluido')
          .order('data_hora_inicio', { ascending: false })

        if (error) throw error
        if (cancelado) return

        // Agrupa por cliente
        const mapa = new Map<string, ClienteAtendido>()
        for (const row of (data ?? []) as any[]) {
          const c = row.cliente
          if (!c) continue
          const existente = mapa.get(c.id)
          if (existente) {
            existente.total_atendimentos += 1
          } else {
            mapa.set(c.id, {
              id: c.id,
              nome: c.nome,
              telefone: c.telefone,
              ultima_visita: row.data_hora_inicio,
              total_atendimentos: 1,
            })
          }
        }

        setClientes(Array.from(mapa.values()))
      } catch (e) {
        console.error('[meus-clientes] erro:', e)
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    buscar()
    return () => {
      cancelado = true
    }
  }, [profissional?.id, profCarregando])

  // Filtro local por nome/telefone
  const filtrados = clientes.filter(
    (c) =>
      !busca ||
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.telefone ?? '').includes(busca),
  )

  // Estado: profissional não vinculado
  if (!profCarregando && !profissional) {
    return (
      <div className="m-4 rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
        Você não está vinculado a um perfil de profissional.
        <br />
        Contate o administrador.
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold">Meus clientes</h1>
        <p className="text-sm text-muted-foreground">
          Clientes que você já atendeu ({clientes.length} total)
        </p>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista */}
      {carregando || profCarregando ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <User className="mb-2 h-10 w-10 opacity-50" />
            <p>
              {busca
                ? 'Nenhum cliente encontrado.'
                : 'Você ainda não tem clientes atendidos.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => (
            <Card key={c.id} className="transition hover:shadow-md">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {c.nome}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c.telefone ?? 'Sem telefone'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {c.ultima_visita
                        ? new Date(c.ultima_visita).toLocaleDateString('pt-BR')
                        : 'Sem visita'}
                    </span>
                    <span>{c.total_atendimentos} atendimento(s)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
