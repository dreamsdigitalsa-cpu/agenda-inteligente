'use client'

import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Receipt, 
  Filter, 
  Search, 
  Download,
  PlusCircle,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function PaginaLancamentos() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 p-6 md:p-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/painel/financeiro')} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Lançamentos</h1>
            <p className="text-sm text-muted-foreground">Histórico completo de entradas e saídas.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" className="rounded-full">
            <Download className="mr-1.5 h-4 w-4" />
            Exportar
          </Button>
          <Button 
            className="rounded-full bg-gradient-primary px-5 font-semibold shadow-elegant hover:opacity-90"
            onClick={() => navigate('/painel/financeiro/caixa')}
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Novo lançamento
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar lançamentos..." className="h-10 rounded-full border-transparent bg-muted/60 pl-9" />
        </div>
        <Button variant="outline" className="h-10 rounded-full">
          <Filter className="mr-1.5 h-4 w-4" />
          Filtros
        </Button>
      </div>

      <Card className="rounded-2xl border-none shadow-card bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center text-muted-foreground italic">
                  <div className="flex flex-col items-center gap-2">
                    <Receipt className="h-8 w-8 opacity-20" />
                    <p>Nenhum lançamento encontrado para os filtros selecionados.</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
