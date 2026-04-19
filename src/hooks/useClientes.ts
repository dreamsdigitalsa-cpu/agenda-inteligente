// Hook de leitura/escrita da tabela `clientes`.
// RLS garante o isolamento por tenant — não filtramos manualmente por tenant_id na leitura.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import type { Cliente } from '@/tipos/cliente'

interface FiltrosClientes {
  busca?: string
  ativos?: 'todos' | 'ativos' | 'inativos'
  mesAniversario?: number | null // 1..12
}

interface NovoCliente {
  nome: string
  telefone: string
  email?: string | null
  dataNascimento?: string | null
  comoConheceu?: string | null
  observacoes?: string | null
  temConta?: boolean
}

function mapear(linha: any): Cliente {
  return {
    id: linha.id,
    tenantId: linha.tenant_id,
    nome: linha.nome,
    telefone: linha.telefone,
    email: linha.email,
    dataNascimento: linha.data_nascimento,
    comoConheceu: linha.como_conheceu,
    observacoes: linha.observacoes,
    temConta: linha.tem_conta,
    usuarioId: linha.usuario_id,
    ativo: linha.ativo,
    criadoEm: linha.criado_em,
  }
}

export function useClientes(filtros: FiltrosClientes = {}) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    // tenant_id é restringido pela RLS; a query traz somente clientes do tenant atual.
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      setErro(error.message)
      setClientes([])
    } else {
      setErro(null)
      setClientes((data ?? []).map(mapear))
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Filtros aplicados em memória (lista costuma ser pequena por tenant).
  const filtrados = useMemo(() => {
    let lista = clientes
    if (filtros.ativos === 'ativos') lista = lista.filter((c) => c.ativo)
    if (filtros.ativos === 'inativos') lista = lista.filter((c) => !c.ativo)
    if (filtros.mesAniversario) {
      lista = lista.filter((c) => {
        if (!c.dataNascimento) return false
        const mes = new Date(c.dataNascimento + 'T00:00:00').getMonth() + 1
        return mes === filtros.mesAniversario
      })
    }
    if (filtros.busca && filtros.busca.trim()) {
      const q = filtros.busca.trim().toLowerCase()
      lista = lista.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          c.telefone.replace(/\D/g, '').includes(q.replace(/\D/g, '')),
      )
    }
    return lista
  }, [clientes, filtros.busca, filtros.ativos, filtros.mesAniversario])

  return { clientes: filtrados, todos: clientes, carregando, erro, recarregar: carregar }
}

// Operações de escrita — RLS bloqueia se o usuário não tiver permissão.
export async function criarCliente(tenantId: string, dados: NovoCliente) {
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      tenant_id: tenantId,
      nome: dados.nome,
      telefone: dados.telefone,
      email: dados.email ?? null,
      data_nascimento: dados.dataNascimento ?? null,
      como_conheceu: dados.comoConheceu ?? null,
      observacoes: dados.observacoes ?? null,
      tem_conta: dados.temConta ?? false,
    })
    .select()
    .single()
  if (error) throw error
  return mapear(data)
}

export async function atualizarCliente(id: string, dados: Partial<NovoCliente> & { ativo?: boolean }) {
  const patch: {
    nome?: string
    telefone?: string
    email?: string | null
    data_nascimento?: string | null
    como_conheceu?: string | null
    observacoes?: string | null
    tem_conta?: boolean
    ativo?: boolean
  } = {}
  if (dados.nome !== undefined) patch.nome = dados.nome
  if (dados.telefone !== undefined) patch.telefone = dados.telefone
  if (dados.email !== undefined) patch.email = dados.email
  if (dados.dataNascimento !== undefined) patch.data_nascimento = dados.dataNascimento
  if (dados.comoConheceu !== undefined) patch.como_conheceu = dados.comoConheceu
  if (dados.observacoes !== undefined) patch.observacoes = dados.observacoes
  if (dados.temConta !== undefined) patch.tem_conta = dados.temConta
  if (dados.ativo !== undefined) patch.ativo = dados.ativo

  const { data, error } = await supabase.from('clientes').update(patch).eq('id', id).select().single()
  if (error) throw error
  return mapear(data)
}

export async function buscarClientePorId(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapear(data) : null
}
