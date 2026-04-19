// Tela de configuração de perfis de permissão.
// - Lista perfis do tenant (padrão + customizados)
// - Mostra permissões ativas de cada perfil
// - Permite criar/editar perfis (apenas admin)
// Permissões padrão (Admin, Profissional, Recepcionista) não podem ser excluídas.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { usePermissao } from '@/hooks/usePermissao'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { CATALOGO_PERMISSOES, type PerfilPermissao } from '@/tipos/permissao'
import { ModalPerfil } from '@/componentes/permissoes/ModalPerfil'

const PaginaPermissoes = () => {
  const { tenant } = useTenant()
  const { ehAdmin } = usePermissao()
  const [perfis, setPerfis] = useState<PerfilPermissao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [perfilEditando, setPerfilEditando] = useState<PerfilPermissao | null>(null)

  // Recarrega lista de perfis do tenant junto com suas permissões
  const carregar = useCallback(async () => {
    if (!tenant?.id) return
    setCarregando(true)
    const { data: perfisRows, error } = await supabase
      .from('perfis_permissao')
      .select('id, tenant_id, nome, descricao, padrao')
      .eq('tenant_id', tenant.id)
      .order('padrao', { ascending: false })
      .order('nome')

    if (error) {
      toast.error('Erro ao carregar perfis')
      setCarregando(false)
      return
    }

    const ids = (perfisRows ?? []).map((p) => p.id)
    let permsPorPerfil: Record<string, string[]> = {}
    if (ids.length > 0) {
      const { data: permRows } = await supabase
        .from('permissoes_do_perfil')
        .select('perfil_id, codigo_permissao')
        .in('perfil_id', ids)
      permsPorPerfil = (permRows ?? []).reduce((acc, r) => {
        const k = r.perfil_id as string
        if (!acc[k]) acc[k] = []
        acc[k].push(r.codigo_permissao as string)
        return acc
      }, {} as Record<string, string[]>)
    }

    setPerfis(
      (perfisRows ?? []).map((p) => ({
        id: p.id,
        tenantId: p.tenant_id,
        nome: p.nome,
        descricao: p.descricao,
        padrao: p.padrao,
        permissoes: permsPorPerfil[p.id] ?? [],
      })),
    )
    setCarregando(false)
  }, [tenant?.id])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Cria ou atualiza um perfil. Quando edita, regrava o conjunto de permissões.
  async function salvarPerfil(dados: { nome: string; descricao: string; permissoes: string[] }) {
    if (!tenant?.id) return
    let perfilId = perfilEditando?.id

    if (perfilEditando) {
      const { error } = await supabase
        .from('perfis_permissao')
        .update({ nome: dados.nome, descricao: dados.descricao || null })
        .eq('id', perfilEditando.id)
      if (error) {
        toast.error('Erro ao atualizar perfil')
        return
      }
      // Limpa permissões antigas antes de inserir as novas (estratégia simples e atômica o suficiente)
      await supabase.from('permissoes_do_perfil').delete().eq('perfil_id', perfilEditando.id)
    } else {
      const { data, error } = await supabase
        .from('perfis_permissao')
        .insert({ tenant_id: tenant.id, nome: dados.nome, descricao: dados.descricao || null, padrao: false })
        .select('id')
        .single()
      if (error || !data) {
        toast.error('Erro ao criar perfil')
        return
      }
      perfilId = data.id
    }

    if (perfilId && dados.permissoes.length > 0) {
      const linhas = dados.permissoes.map((codigo) => ({ perfil_id: perfilId!, codigo_permissao: codigo }))
      const { error } = await supabase.from('permissoes_do_perfil').insert(linhas)
      if (error) {
        toast.error('Perfil salvo, mas falhou ao gravar permissões')
      }
    }

    toast.success('Perfil salvo')
    setModalAberto(false)
    setPerfilEditando(null)
    carregar()
  }

  async function excluirPerfil(perfil: PerfilPermissao) {
    if (perfil.padrao) return
    if (!confirm(`Excluir o perfil "${perfil.nome}"?`)) return
    const { error } = await supabase.from('perfis_permissao').delete().eq('id', perfil.id)
    if (error) {
      toast.error('Erro ao excluir perfil')
      return
    }
    toast.success('Perfil excluído')
    carregar()
  }

  function rotuloPermissao(codigo: string) {
    return CATALOGO_PERMISSOES.find((p) => p.codigo === codigo)?.rotulo ?? codigo
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Perfis de permissão</h1>
          <p className="text-muted-foreground text-sm">
            Defina o que cada tipo de usuário pode fazer no sistema.
          </p>
        </div>
        {ehAdmin && (
          <Button
            onClick={() => {
              setPerfilEditando(null)
              setModalAberto(true)
            }}
          >
            <Plus className="mr-1" /> Novo perfil
          </Button>
        )}
      </header>

      {carregando ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : perfis.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            Nenhum perfil cadastrado para este tenant ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {perfis.map((perfil) => (
            <Card key={perfil.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {perfil.nome}
                    {perfil.padrao && <Badge variant="secondary">Padrão</Badge>}
                  </CardTitle>
                  {perfil.descricao && (
                    <p className="text-sm text-muted-foreground mt-1">{perfil.descricao}</p>
                  )}
                </div>
                {ehAdmin && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPerfilEditando(perfil)
                        setModalAberto(true)
                      }}
                    >
                      <Pencil /> Editar
                    </Button>
                    {!perfil.padrao && (
                      <Button size="sm" variant="destructive" onClick={() => excluirPerfil(perfil)}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {perfil.permissoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma permissão atribuída.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {perfil.permissoes.map((codigo) => (
                      <Badge key={codigo} variant="outline" title={codigo}>
                        {rotuloPermissao(codigo)}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ModalPerfil
        aberto={modalAberto}
        perfilEditando={perfilEditando}
        onFechar={() => {
          setModalAberto(false)
          setPerfilEditando(null)
        }}
        onSalvar={salvarPerfil}
      />
    </div>
  )
}

export default PaginaPermissoes
