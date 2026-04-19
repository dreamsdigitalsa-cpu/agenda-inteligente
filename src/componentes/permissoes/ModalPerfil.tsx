// Modal para criar ou editar um perfil de permissão.
// Lista permissões agrupadas por categoria com checkboxes.
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CATALOGO_PERMISSOES, type CategoriaPermissao, type PerfilPermissao } from '@/tipos/permissao'

interface Props {
  aberto: boolean
  perfilEditando: PerfilPermissao | null
  onFechar: () => void
  onSalvar: (dados: { nome: string; descricao: string; permissoes: string[] }) => Promise<void>
}

const CATEGORIAS: CategoriaPermissao[] = ['AGENDAMENTOS', 'FINANCEIRO', 'CADASTROS', 'SISTEMA']

export function ModalPerfil({ aberto, perfilEditando, onFechar, onSalvar }: Props) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)

  // Sempre que abrir o modal, sincroniza com o perfil em edição (ou limpa)
  useEffect(() => {
    if (!aberto) return
    setNome(perfilEditando?.nome ?? '')
    setDescricao(perfilEditando?.descricao ?? '')
    setSelecionadas(new Set(perfilEditando?.permissoes ?? []))
  }, [aberto, perfilEditando])

  function alternar(codigo: string) {
    setSelecionadas((prev) => {
      const novo = new Set(prev)
      if (novo.has(codigo)) novo.delete(codigo)
      else novo.add(codigo)
      return novo
    })
  }

  async function salvar() {
    if (!nome.trim()) return
    setSalvando(true)
    try {
      await onSalvar({ nome: nome.trim(), descricao: descricao.trim(), permissoes: Array.from(selecionadas) })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{perfilEditando ? 'Editar perfil' : 'Novo perfil'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-perfil">Nome do perfil</Label>
            <Input
              id="nome-perfil"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Gerente, Caixa..."
              disabled={perfilEditando?.padrao}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc-perfil">Descrição (opcional)</Label>
            <Input
              id="desc-perfil"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Para que serve este perfil"
            />
          </div>

          <div className="space-y-4">
            {CATEGORIAS.map((cat) => {
              const itens = CATALOGO_PERMISSOES.filter((p) => p.categoria === cat)
              return (
                <div key={cat} className="rounded-lg border p-4">
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{cat}</h3>
                  <div className="space-y-2">
                    {itens.map((p) => (
                      <label key={p.codigo} className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={selecionadas.has(p.codigo)}
                          onCheckedChange={() => alternar(p.codigo)}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{p.rotulo}</div>
                          <div className="text-xs text-muted-foreground">{p.codigo}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || !nome.trim()}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
