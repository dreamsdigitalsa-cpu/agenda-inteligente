import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Fatura {
  id: string
  valor: number
  status: string
  vencimento: string
  pago_em?: string
  url_boleto?: string
  url_nota_fiscal?: string
}

interface HistoricoFaturasProps {
  faturas: Fatura[]
}

export function HistoricoFaturas({ faturas }: HistoricoFaturasProps) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  if (faturas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-3xl border-2 border-dashed">
        <FileText className="h-10 w-10 mb-2 opacity-20" />
        <p>Nenhuma fatura encontrada.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {faturas.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-medium">
                {format(new Date(f.vencimento), 'dd/MM/yyyy', { locale: ptBR })}
              </TableCell>
              <TableCell>{formatarMoeda(f.valor)}</TableCell>
              <TableCell>
                <Badge variant={f.status === 'paga' ? 'success' : 'secondary'} className="rounded-full">
                  {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {f.url_boleto && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={f.url_boleto} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-1" /> Boleto
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" disabled={!f.url_nota_fiscal}>
                    <Download className="h-4 w-4 mr-1" /> NF
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
