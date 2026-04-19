// Seed de dados-demo do segmento salão de beleza.
export const seedSalao = {
  segmento: 'salao' as const,
  estabelecimento: { nome: 'Salão Bella Vita', cor: '#db2777' },
  profissionais: [
    { id: 'p1', nome: 'Mariana Rocha', especialidade: 'Coloração e Mechas' },
    { id: 'p2', nome: 'Juliana Prado', especialidade: 'Cortes Femininos' },
    { id: 'p3', nome: 'Beatriz Lima', especialidade: 'Escova e Penteados' },
  ],
  servicos: [
    { id: 's1', nome: 'Corte feminino', duracao: 60, preco: 80 },
    { id: 's2', nome: 'Coloração', duracao: 120, preco: 180 },
    { id: 's3', nome: 'Escova progressiva', duracao: 180, preco: 350 },
    { id: 's4', nome: 'Hidratação', duracao: 45, preco: 70 },
  ],
  clientes: [
    { id: 'c1', nome: 'Ana Carolina', telefone: '(79) 99999-1001', ultimaVisita: '2025-04-12' },
    { id: 'c2', nome: 'Patrícia Mendes', telefone: '(79) 99999-1002', ultimaVisita: '2025-04-09' },
    { id: 'c3', nome: 'Fernanda Reis', telefone: '(79) 99999-1003', ultimaVisita: '2025-04-02' },
  ],
  agendamentos: [
    { id: 'a1', clienteId: 'c1', profissionalId: 'p1', servicoId: 's2', data: 'hoje', hora: '09:00', status: 'confirmado' },
    { id: 'a2', clienteId: 'c2', profissionalId: 'p2', servicoId: 's1', data: 'hoje', hora: '11:00', status: 'agendado' },
    { id: 'a3', clienteId: 'c3', profissionalId: 'p3', servicoId: 's4', data: 'hoje', hora: '14:30', status: 'agendado' },
  ],
  financeiro: { receitaHoje: 330, receitaMes: 8420, ticketMedio: 145 },
}
