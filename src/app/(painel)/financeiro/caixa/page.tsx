// Página do Caixa — módulo financeiro
//
// Máquina de estados:
//   'carregando'   → buscando sessão do dia no banco
//   'sem_caixa'    → nenhum caixa aberto hoje (Estado 1)
//   'aberto'       → caixa em operação (Estado 2)
//   'fechado_hoje' → caixa encerrado hoje, somente leitura (Estado 3)
//
// REGRA CRÍTICA: toda escrita passa pelas Edge Functions via supabase.functions.invoke().
// Nunca usar supabase.from('lancamentos').insert() ou similares diretamente.

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { usePermissao } from '@/hooks/usePermissao'
import { useTenant } from '@/hooks/useTenant'
import { supabase } from '@/lib/supabase/cliente'
import { PERMISSOES } from '@/lib/constantes/permissoes'
import { cn } from '@/lib/utils'

// ─── Tipos locais ────────────────────────────────────────────────────────────

type EstadoCaixa = 'carregando' | 'sem_caixa' | 'aberto' | 'fechado_hoje'

interface SessaoCaixa {
  id: string
  aberturaEm: string
  saldoInicial: number
  status: 'aberto' | 'fechado'
  fechamentoEm?: string | null
  saldoFinal?: number | null
  diferenca?: number | null
}

interface LancamentoCaixa {
  id: string
  tipo: 'receita' | 'despesa'
  categoria: string
  descricao?: string | null
  valor: number
  formaPagamento: string
  criadoEm: string
}

interface RelatorioDia {
  caixaSessaoId: string
  aberturaEm: string
  fechamentoEm: string
  saldoInicial: number
  totalReceitas: number
  totalDespesas: number
  saldoEsperado: number
  saldoFinal: number
  diferenca: number
  lancamentos: LancamentoCaixa[]
}

interface FormLancamento {
  categoria: string
  descricao: string
  valor: string
  formaPagamento: string
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const CATEGORIAS_RECEITA = [
  { value: 'servico', label: 'Serviço' },
  { value: 'produto', label: 'Produto' },
  { value: 'gorjeta', label: 'Gorjeta' },
  { value: 'outros', label: 'Outros' },
]

const CATEGORIAS_DESPESA = [
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'salario', label: 'Salário' },
  { value: 'material', label: 'Material' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'outros', label: 'Outros' },
]

const FORMAS_PAGAMENTO = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de crédito' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
]

const FORM_INICIAL: FormLancamento = {
  categoria: '',
  descricao: '',
  valor: '',
  formaPagamento: 'dinheiro',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function labelCategoria(valor: string): string {
  const todas = [...CATEGORIAS_RECEITA, ...CATEGORIAS_DESPESA]
  return todas.find((c) => c.value === valor)?.label ?? valor
}

function emojiFomaPagamento(forma: string): string {
  const mapa: Record<string, string> = {
    dinheiro: '💵',
    pix: '⚡',
    cartao_credito: '💳',
    cartao_debito: '💳',
    outro: '💰',
  }
  return mapa[forma] ?? '💰'
}

// ─── Modal: Registrar Lançamento ─────────────────────────────────────────────

interface ModalLancamentoProps {
  aberto: boolean
  tipo: 'receita' | 'despesa'
  onFechar: () => void
  onRegistrado: (lancamento: LancamentoCaixa) => void
  tenantId: string
  caixaSessaoId: string
}

function ModalLancamento({
  aberto,
  tipo,
  onFechar,
  onRegistrado,
  tenantId,
  caixaSessaoId,
}: ModalLancamentoProps) {
  const [form, setForm] = useState<FormLancamento>(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)

  const categorias = tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  // Resetar formulário toda vez que o modal abrir
  useEffect(() => {
    if (aberto) setForm(FORM_INICIAL)
  }, [aberto])

  const valido =
    form.categoria !== '' &&
    Number(form.valor.replace(',', '.')) > 0

  const registrar = async () => {
    if (!valido) return

    const valorNum = parseFloat(form.valor.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error('Informe um valor válido')
      return
    }

    setSalvando(true)
    try {
      // Chama a Edge Function registrar-lancamento.
      // NUNCA usar supabase.from('lancamentos').insert() aqui.
      const { data, error } = await supabase.functions.invoke('registrar-lancamento', {
        body: {
          tenant_id: tenantId,
          caixa_sessao_id: caixaSessaoId,
          tipo,
          categoria: form.categoria,
          descricao: form.descricao.trim() || null,
          valor: valorNum,
          forma_pagamento: form.formaPagamento,
        },
      })

      if (error) throw error
      if (data?.erro) {
        if (data.erro === 'sessao_fechada') throw new Error('O caixa já foi fechado')
        throw new Error(data.erro)
      }

      const novo: LancamentoCaixa = {
        id: data.lancamento_id,
        tipo,
        categoria: form.categoria,
        descricao: form.descricao.trim() || null,
        valor: valorNum,
        formaPagamento: form.formaPagamento,
        criadoEm: new Date().toISOString(),
      }

      toast.success(tipo === 'receita' ? 'Entrada registrada' : 'Saída registrada')
      onRegistrado(novo)
      onFechar()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao registrar'
      toast.error(msg)
      console.error('[ModalLancamento]', e)
    } finally {
      setSalvando(false)
    }
  }

  const corTitulo = tipo === 'receita' ? 'text-green-700' : 'text-red-700'
  const corBotao = tipo === 'receita'
    ? 'bg-green-600 hover:bg-green-700'
    : 'bg-red-600 hover:bg-red-700'

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={cn('flex items-center gap-2', corTitulo)}>
            {tipo === 'receita'
              ? <><ArrowUpCircle className="h-5 w-5" /> Registrar entrada</>
              : <><ArrowDownCircle className="h-5 w-5" /> Registrar saída</>
            }
          </DialogTitle>
          <DialogDescription>
            {tipo === 'receita'
              ? 'Informe os dados da receita recebida.'
              : 'Informe os dados da despesa paga.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Categoria */}
          <div className="space-y-1.5">
            <Label htmlFor="lc-categoria">Categoria *</Label>
            <Select
              value={form.categoria}
              onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
            >
              <SelectTrigger id="lc-categoria">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="lc-descricao">Descrição</Label>
            <Input
              id="lc-descricao"
              placeholder={tipo === 'receita' ? 'Ex: Corte · Maria' : 'Ex: Compra de shampoo'}
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            />
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <Label htmlFor="lc-valor">Valor (R$) *</Label>
            <Input
              id="lc-valor"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={form.valor}
              onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
            />
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-1.5">
            <Label htmlFor="lc-forma">
              Forma de pagamento{tipo === 'receita' ? ' *' : ''}
            </Label>
            <Select
              value={form.formaPagamento}
              onValueChange={(v) => setForm((f) => ({ ...f, formaPagamento: v }))}
            >
              <SelectTrigger id="lc-forma">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAS_PAGAMENTO.map((fp) => (
                  <SelectItem key={fp.value} value={fp.value}>
                    {fp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={registrar}
            disabled={!valido || salvando}
            className={corBotao}
          >
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {salvando ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal: Fechar Caixa ──────────────────────────────────────────────────────

interface ModalFecharCaixaProps {
  aberto: boolean
  saldoInicial: number
  totalReceitas: number
  totalDespesas: number
  onFechar: () => void
  onFechado: (relatorio: RelatorioDia) => void
  tenantId: string
  caixaSessaoId: string
}

function ModalFecharCaixa({
  aberto,
  saldoInicial,
  totalReceitas,
  totalDespesas,
  onFechar,
  onFechado,
  tenantId,
  caixaSessaoId,
}: ModalFecharCaixaProps) {
  const [saldoContado, setSaldoContado] = useState('')
  const [fechando, setFechando] = useState(false)

  // Resetar campo ao abrir o modal
  useEffect(() => {
    if (aberto) setSaldoContado('')
  }, [aberto])

  const saldoEsperado = saldoInicial + totalReceitas - totalDespesas
  const saldoContadoNum = parseFloat(saldoContado.replace(',', '.'))
  const diferencaCalculada = !isNaN(saldoContadoNum) && saldoContado !== ''
    ? saldoContadoNum - saldoEsperado
    : null

  const fechar = async () => {
    if (isNaN(saldoContadoNum) || saldoContadoNum < 0) {
      toast.error('Informe o valor contado em caixa')
      return
    }

    setFechando(true)
    try {
      // Chama a Edge Function fechar-caixa.
      // NUNCA usar supabase.from('caixa_sessoes').update() aqui.
      const { data, error } = await supabase.functions.invoke('fechar-caixa', {
        body: {
          tenant_id: tenantId,
          caixa_sessao_id: caixaSessaoId,
          saldo_final_contado: saldoContadoNum,
        },
      })

      if (error) throw error
      if (data?.erro) {
        if (data.erro === 'sessao_ja_fechada') throw new Error('Caixa já foi fechado')
        throw new Error(data.erro)
      }

      // Mapear resposta da Edge Function para o tipo local
      const relatorio: RelatorioDia = {
        caixaSessaoId: data.caixa_sessao_id,
        aberturaEm: data.abertura_em,
        fechamentoEm: data.fechamento_em,
        saldoInicial: Number(data.saldo_inicial),
        totalReceitas: Number(data.total_receitas),
        totalDespesas: Number(data.total_despesas),
        saldoEsperado: Number(data.saldo_esperado),
        saldoFinal: Number(data.saldo_final),
        diferenca: Number(data.diferenca),
        lancamentos: (data.lancamentos ?? []).map((l: Record<string, unknown>) => ({
          id: l.id as string,
          tipo: l.tipo as 'receita' | 'despesa',
          categoria: l.categoria as string,
          descricao: (l.descricao as string | null) ?? null,
          valor: Number(l.valor),
          formaPagamento: l.forma_pagamento as string,
          criadoEm: l.criado_em as string,
        })),
      }

      toast.success('Caixa fechado com sucesso!')
      onFechado(relatorio)
      onFechar()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao fechar o caixa'
      toast.error(msg)
      console.error('[ModalFecharCaixa]', e)
    } finally {
      setFechando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Fechar caixa
          </DialogTitle>
          <DialogDescription>
            Confira o valor físico em caixa antes de encerrar o dia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Resumo esperado */}
          <div className="space-y-2 rounded-lg bg-muted/60 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo inicial</span>
              <span>{formatarMoeda(saldoInicial)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Total entradas</span>
              <span>+ {formatarMoeda(totalReceitas)}</span>
            </div>
            <div className="flex justify-between text-red-700">
              <span>Total saídas</span>
              <span>– {formatarMoeda(totalDespesas)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Saldo esperado</span>
              <span>{formatarMoeda(saldoEsperado)}</span>
            </div>
          </div>

          {/* Campo: valor contado fisicamente */}
          <div className="space-y-1.5">
            <Label htmlFor="fc-contado">Valor contado em caixa (R$) *</Label>
            <Input
              id="fc-contado"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={saldoContado}
              onChange={(e) => setSaldoContado(e.target.value)}
              autoFocus
            />
          </div>

          {/* Diferença calculada em tempo real */}
          {diferencaCalculada !== null && (
            <div className={cn(
              'flex items-center justify-between rounded-lg p-3 text-sm font-medium',
              diferencaCalculada === 0
                ? 'bg-green-50 text-green-700 dark:bg-green-950/30'
                : diferencaCalculada > 0
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/30',
            )}>
              <span>
                {diferencaCalculada === 0 && '✓ Caixa conferido'}
                {diferencaCalculada > 0 && '↑ Sobra em caixa'}
                {diferencaCalculada < 0 && '↓ Falta em caixa'}
              </span>
              <span>
                {diferencaCalculada === 0
                  ? 'Sem diferença'
                  : `${diferencaCalculada > 0 ? '+' : ''}${formatarMoeda(diferencaCalculada)}`
                }
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={fechando}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={fechar}
            disabled={saldoContado === '' || fechando}
          >
            {fechando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {fechando ? 'Fechando...' : 'Confirmar fechamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Componente de linha de lançamento ────────────────────────────────────────

function LinhaLancamento({ l }: { l: LancamentoCaixa }) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/30 transition-colors">
      {l.tipo === 'receita'
        ? <ArrowUpCircle className="h-5 w-5 shrink-0 text-green-600" />
        : <ArrowDownCircle className="h-5 w-5 shrink-0 text-red-600" />
      }
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {labelCategoria(l.categoria)}
          {l.descricao ? ` · ${l.descricao}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatarHora(l.criadoEm)}
          {' · '}
          {emojiFomaPagamento(l.formaPagamento)}{' '}
          {l.formaPagamento.replace('_', ' ')}
        </p>
      </div>
      <p className={cn(
        'shrink-0 text-sm font-semibold tabular-nums',
        l.tipo === 'receita' ? 'text-green-700' : 'text-red-700',
      )}>
        {l.tipo === 'receita' ? '+' : '–'} {formatarMoeda(l.valor)}
      </p>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const PaginaCaixa = () => {
  const { usuario } = useTenant()
  const { temPermissao } = usePermissao()

  const [estadoCaixa, setEstadoCaixa] = useState<EstadoCaixa>('carregando')
  const [sessao, setSessao] = useState<SessaoCaixa | null>(null)
  const [lancamentos, setLancamentos] = useState<LancamentoCaixa[]>([])
  const [relatorio, setRelatorio] = useState<RelatorioDia | null>(null)

  // Estados dos modais
  const [modalEntrada, setModalEntrada] = useState(false)
  const [modalSaida, setModalSaida] = useState(false)
  const [modalFechar, setModalFechar] = useState(false)

  // Loading do botão "Abrir caixa"
  const [abrindo, setAbrindo] = useState(false)
  const [saldoInicialInput, setSaldoInicialInput] = useState('0')

  const podeFecharcaixa = temPermissao(PERMISSOES.FECHAR_CAIXA)
  const podeVerFinanceiro = temPermissao(PERMISSOES.VER_RELATORIOS_FINANCEIROS)

  // Totais recalculados ao vivo a cada lançamento adicionado — sem cache
  const { totalReceitas, totalDespesas } = useMemo(
    () =>
      lancamentos.reduce(
        (acc, l) => {
          if (l.tipo === 'receita') acc.totalReceitas += l.valor
          else acc.totalDespesas += l.valor
          return acc
        },
        { totalReceitas: 0, totalDespesas: 0 },
      ),
    [lancamentos],
  )

  const saldoAtual = (sessao?.saldoInicial ?? 0) + totalReceitas - totalDespesas

  // ── Carrega sessão do dia ao montar e ao trocar de usuário ──────────────────
  useEffect(() => {
    if (!usuario?.tenantId) return

    async function verificarCaixaDoDia() {
      setEstadoCaixa('carregando')

      // Janela de tempo para cobrir o dia inteiro em UTC
      const agora = new Date()
      const inicioDia = new Date(
        Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
      ).toISOString()
      const fimDia = new Date(
        Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + 1),
      ).toISOString()

      // Leitura direta é permitida — RLS concede SELECT com PERM-003
      const { data: sessaoHoje, error } = await supabase
        .from('caixa_sessoes' as never)
        .select('id, abertura_em, fechamento_em, saldo_inicial, saldo_final, diferenca, status')
        .eq('tenant_id', usuario!.tenantId!)
        .gte('abertura_em', inicioDia)
        .lt('abertura_em', fimDia)
        .order('abertura_em', { ascending: false })
        .limit(1)
        .maybeSingle() as { data: Record<string, unknown> | null; error: unknown }

      if (error) {
        console.error('[PaginaCaixa] erro ao buscar sessão:', error)
        setEstadoCaixa('sem_caixa')
        return
      }

      if (!sessaoHoje) {
        setEstadoCaixa('sem_caixa')
        setSessao(null)
        setLancamentos([])
        return
      }

      const s: SessaoCaixa = {
        id: sessaoHoje.id as string,
        aberturaEm: sessaoHoje.abertura_em as string,
        saldoInicial: Number(sessaoHoje.saldo_inicial),
        status: sessaoHoje.status as 'aberto' | 'fechado',
        fechamentoEm: sessaoHoje.fechamento_em as string | null,
        saldoFinal: sessaoHoje.saldo_final != null ? Number(sessaoHoje.saldo_final) : null,
        diferenca: sessaoHoje.diferenca != null ? Number(sessaoHoje.diferenca) : null,
      }
      setSessao(s)

      // Busca lançamentos da sessão para montar o resumo — leitura via RLS
      const { data: rows } = await supabase
        .from('lancamentos' as never)
        .select('id, tipo, categoria, descricao, valor, forma_pagamento, criado_em')
        .eq('caixa_sessao_id', s.id)
        .order('criado_em', { ascending: true }) as {
          data: Record<string, unknown>[] | null
        }

      setLancamentos(
        (rows ?? []).map((l) => ({
          id: l.id as string,
          tipo: l.tipo as 'receita' | 'despesa',
          categoria: l.categoria as string,
          descricao: (l.descricao as string | null) ?? null,
          valor: Number(l.valor),
          formaPagamento: l.forma_pagamento as string,
          criadoEm: l.criado_em as string,
        })),
      )

      setEstadoCaixa(s.status === 'aberto' ? 'aberto' : 'fechado_hoje')
    }

    verificarCaixaDoDia()
  }, [usuario?.tenantId])

  // ── Abrir caixa ──────────────────────────────────────────────────────────────
  const abrirCaixa = async () => {
    if (!usuario?.tenantId || !usuario.unidadeId) {
      toast.error('Dados da unidade não encontrados. Verifique o cadastro.')
      return
    }

    const saldoNum = parseFloat(saldoInicialInput.replace(',', '.'))
    if (isNaN(saldoNum) || saldoNum < 0) {
      toast.error('Saldo inicial inválido')
      return
    }

    setAbrindo(true)
    try {
      // Chama a Edge Function abrir-caixa — NUNCA inserir em caixa_sessoes diretamente
      const { data, error } = await supabase.functions.invoke('abrir-caixa', {
        body: {
          tenant_id: usuario.tenantId,
          unidade_id: usuario.unidadeId,
          usuario_id: usuario.id,
          saldo_inicial: saldoNum,
        },
      })

      if (error) throw error

      // Caixa já estava aberto (409) — redireciona para ele
      if (data?.erro === 'caixa_ja_aberto') {
        toast.info('Caixa já estava aberto. Carregando...')
        setSessao({
          id: data.caixa_sessao_id as string,
          aberturaEm: data.abertura_em as string,
          saldoInicial: Number(data.saldo_inicial),
          status: 'aberto',
        })
        setLancamentos([])
        setEstadoCaixa('aberto')
        return
      }

      if (data?.erro) throw new Error(String(data.erro))

      setSessao({
        id: data.caixa_sessao_id as string,
        aberturaEm: new Date().toISOString(),
        saldoInicial: saldoNum,
        status: 'aberto',
      })
      setLancamentos([])
      setEstadoCaixa('aberto')
      toast.success('Caixa aberto com sucesso!')
    } catch (e) {
      toast.error('Não foi possível abrir o caixa. Tente novamente.')
      console.error('[PaginaCaixa] abrirCaixa:', e)
    } finally {
      setAbrindo(false)
    }
  }

  const aoRegistrarLancamento = (novo: LancamentoCaixa) => {
    setLancamentos((prev) => [...prev, novo])
  }

  const aoFecharCaixa = (rel: RelatorioDia) => {
    setRelatorio(rel)
    setSessao((prev) =>
      prev
        ? {
            ...prev,
            status: 'fechado',
            fechamentoEm: rel.fechamentoEm,
            saldoFinal: rel.saldoFinal,
            diferenca: rel.diferenca,
          }
        : null,
    )
    setLancamentos(rel.lancamentos)
    setEstadoCaixa('fechado_hoje')
  }

  // ── GUARD: sem permissão ──────────────────────────────────────────────────────
  if (!podeVerFinanceiro && estadoCaixa !== 'carregando') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Você não tem permissão para acessar o financeiro. Solicite ao administrador.
        </p>
      </div>
    )
  }

  // ── ESTADO: carregando ────────────────────────────────────────────────────────
  if (estadoCaixa === 'carregando') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ── ESTADO 1: Nenhum caixa aberto hoje ───────────────────────────────────────
  if (estadoCaixa === 'sem_caixa') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-sm">
          <CardHeader className="pb-2 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Wallet className="h-7 w-7 text-muted-foreground" />
            </div>
            <CardTitle>Caixa fechado</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Informe o saldo inicial para abrir o caixa de hoje.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="saldo-inicial">Saldo inicial (R$)</Label>
              <Input
                id="saldo-inicial"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={saldoInicialInput}
                onChange={(e) => setSaldoInicialInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && abrirCaixa()}
              />
            </div>
            <Button
              className="w-full"
              onClick={abrirCaixa}
              disabled={abrindo}
            >
              {abrindo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {abrindo ? 'Abrindo...' : 'Abrir caixa'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── ESTADO 3: Caixa encerrado hoje (somente leitura) ─────────────────────────
  if (estadoCaixa === 'fechado_hoje' && sessao) {
    const totalR = relatorio?.totalReceitas ?? totalReceitas
    const totalD = relatorio?.totalDespesas ?? totalDespesas
    const saldoFinal = sessao.saldoFinal ?? 0
    const diff = sessao.diferenca ?? 0

    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <CalendarCheck className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Caixa encerrado</h1>
            <p className="text-sm text-muted-foreground">
              Fechado em{' '}
              {sessao.fechamentoEm ? formatarDataHora(sessao.fechamentoEm) : '—'}
            </p>
          </div>
        </div>

        {/* Métricas do dia */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="pb-3 pt-4">
              <p className="text-xs text-muted-foreground">Saldo inicial</p>
              <p className="mt-1 text-base font-semibold">
                {formatarMoeda(sessao.saldoInicial)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pb-3 pt-4">
              <p className="text-xs text-green-700">Entradas</p>
              <p className="mt-1 text-base font-semibold text-green-700">
                {formatarMoeda(totalR)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pb-3 pt-4">
              <p className="text-xs text-red-700">Saídas</p>
              <p className="mt-1 text-base font-semibold text-red-700">
                {formatarMoeda(totalD)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pb-3 pt-4">
              <p className="text-xs text-muted-foreground">Saldo final</p>
              <p className="mt-1 text-base font-semibold">{formatarMoeda(saldoFinal)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Indicador de diferença */}
        {diff !== 0 && (
          <div className={cn(
            'rounded-lg p-3 text-sm font-medium',
            diff > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700',
          )}>
            {diff > 0
              ? `Sobra de ${formatarMoeda(diff)} em relação ao esperado`
              : `Falta de ${formatarMoeda(Math.abs(diff))} em relação ao esperado`}
          </div>
        )}

        {/* Lançamentos do dia */}
        {lancamentos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Lançamentos do dia
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({lancamentos.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-72">
                {lancamentos.map((l) => <LinhaLancamento key={l.id} l={l} />)}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Abrir novo caixa (próximo dia) */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSessao(null)
            setLancamentos([])
            setRelatorio(null)
            setSaldoInicialInput('0')
            setEstadoCaixa('sem_caixa')
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Abrir novo caixa
        </Button>
      </div>
    )
  }

  // ── ESTADO 2: Caixa aberto ────────────────────────────────────────────────────
  if (!sessao) return null

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
            <Wallet className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Caixa aberto</h1>
              <Badge variant="outline" className="border-green-500 text-green-700">
                Aberto
              </Badge>
            </div>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Desde {formatarHora(sessao.aberturaEm)}
              {' · '}
              Saldo inicial: {formatarMoeda(sessao.saldoInicial)}
            </p>
          </div>
        </div>

        {/* Botão fechar caixa — requer PERM-004 */}
        {podeFecharcaixa && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setModalFechar(true)}
          >
            <Lock className="mr-2 h-4 w-4" />
            Fechar caixa
          </Button>
        )}
      </div>

      {/* Resumo do dia */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pb-3 pt-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
              <TrendingUp className="h-4 w-4 text-green-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total entradas</p>
              <p className="text-lg font-semibold text-green-700">
                {formatarMoeda(totalReceitas)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pb-3 pt-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
              <TrendingDown className="h-4 w-4 text-red-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total saídas</p>
              <p className="text-lg font-semibold text-red-700">
                {formatarMoeda(totalDespesas)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pb-3 pt-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Wallet className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo atual</p>
              <p className={cn(
                'text-lg font-semibold',
                saldoAtual >= 0 ? 'text-blue-700' : 'text-red-700',
              )}>
                {formatarMoeda(saldoAtual)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-2">
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={() => setModalEntrada(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar entrada
        </Button>
        <Button
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-50"
          onClick={() => setModalSaida(true)}
        >
          <Minus className="mr-2 h-4 w-4" />
          Registrar saída
        </Button>
      </div>

      {/* Lista cronológica de lançamentos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Lançamentos do dia
            {lancamentos.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({lancamentos.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lancamentos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Nenhum lançamento ainda. Registre a primeira movimentação.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              {lancamentos.map((l) => <LinhaLancamento key={l.id} l={l} />)}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <ModalLancamento
        aberto={modalEntrada}
        tipo="receita"
        onFechar={() => setModalEntrada(false)}
        onRegistrado={aoRegistrarLancamento}
        tenantId={usuario!.tenantId!}
        caixaSessaoId={sessao.id}
      />
      <ModalLancamento
        aberto={modalSaida}
        tipo="despesa"
        onFechar={() => setModalSaida(false)}
        onRegistrado={aoRegistrarLancamento}
        tenantId={usuario!.tenantId!}
        caixaSessaoId={sessao.id}
      />
      <ModalFecharCaixa
        aberto={modalFechar}
        saldoInicial={sessao.saldoInicial}
        totalReceitas={totalReceitas}
        totalDespesas={totalDespesas}
        onFechar={() => setModalFechar(false)}
        onFechado={aoFecharCaixa}
        tenantId={usuario!.tenantId!}
        caixaSessaoId={sessao.id}
      />
    </div>
  )
}

export default PaginaCaixa
