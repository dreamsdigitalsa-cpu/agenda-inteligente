import { supabase } from '@/lib/supabase/cliente'
import type { ItemFila, StatusFila } from '@/tipos/fila'

export const FilaServico = {
  async listar(tenantId: string, unidadeId: string): Promise<ItemFila[]> {
    const { data, error } = await supabase
      .from('fila_espera')
      .select(`
        *,
        profissional:profissionais(id, nome),
        servico:servicos(id, nome)
      `)
      .eq('tenant_id', tenantId)
      .eq('unidade_id', unidadeId)
      .in('status', ['aguardando', 'chamado'])
      .order('posicao', { ascending: true })

    if (error) throw error
    
    return data.map(item => ({
      id: item.id,
      tenantId: item.tenant_id,
      unidadeId: item.unidade_id,
      profissionalId: item.profissional_id,
      clienteId: item.cliente_id,
      clienteNome: item.cliente_nome,
      clienteTelefone: item.cliente_telefone,
      servicoId: item.servico_id,
      posicao: item.posicao,
      status: item.status as StatusFila,
      entradaEm: item.entrada_em,
      chamadoEm: item.chamado_em,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      // Extensão para facilidade na UI
      profissionalNome: item.profissional?.nome,
      servicoNome: item.servico?.nome,
    })) as any
  },

  async adicionar(dados: Partial<ItemFila>): Promise<ItemFila> {
    // Busca última posição
    const { data: ultimaPosicao } = await supabase
      .from('fila_espera')
      .select('posicao')
      .eq('tenant_id', dados.tenantId)
      .eq('unidade_id', dados.unidadeId)
      .in('status', ['aguardando', 'chamado'])
      .order('posicao', { ascending: false })
      .limit(1)
      .maybeSingle()

    const novaPosicao = (ultimaPosicao?.posicao ?? 0) + 1

    const { data, error } = await supabase
      .from('fila_espera')
      .insert({
        tenant_id: dados.tenantId,
        unidade_id: dados.unidadeId,
        profissional_id: dados.profissionalId,
        cliente_id: dados.clienteId,
        cliente_nome: dados.clienteNome,
        cliente_telefone: dados.clienteTelefone,
        servico_id: dados.servicoId,
        posicao: novaPosicao,
        status: 'aguardando'
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  },

  async chamarProximo(id: string): Promise<void> {
    const { error } = await supabase
      .from('fila_espera')
      .update({
        status: 'chamado',
        chamado_em: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error
  },

  async finalizar(id: string): Promise<void> {
    const { error } = await supabase
      .from('fila_espera')
      .update({
        status: 'atendido'
      })
      .eq('id', id)

    if (error) throw error
  },

  async cancelar(id: string): Promise<void> {
    const { error } = await supabase
      .from('fila_espera')
      .update({
        status: 'cancelado'
      })
      .eq('id', id)

    if (error) throw error
  },

  async reordenar(itens: { id: string; posicao: number }[]): Promise<void> {
    // Para simplificar, faremos updates individuais (em produção ideal usar RPC)
    const promises = itens.map(item => 
      supabase
        .from('fila_espera')
        .update({ posicao: item.posicao })
        .eq('id', item.id)
    )
    await Promise.all(promises)
  }
}
