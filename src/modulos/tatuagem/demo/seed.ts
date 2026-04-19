// Seed de dados-demo do segmento tatuagem.
export const seedTatuagem = {
  segmento: 'tatuagem' as const,
  estabelecimento: { nome: 'Ink Studio Tattoo', cor: '#7c3aed' },
  profissionais: [
    { id: 'p1', nome: 'Diego Black', especialidade: 'Realismo' },
    { id: 'p2', nome: 'Marina Tinta', especialidade: 'Old School' },
  ],
  servicos: [
    { id: 's1', nome: 'Tatuagem pequena (até 5cm)', duracao: 60, preco: 250 },
    { id: 's2', nome: 'Tatuagem média (até 15cm)', duracao: 180, preco: 600 },
    { id: 's3', nome: 'Sessão fechada (4h)', duracao: 240, preco: 900 },
    { id: 's4', nome: 'Orçamento / consulta', duracao: 30, preco: 0 },
  ],
  clientes: [
    { id: 'c1', nome: 'Lucas Henrique', telefone: '(79) 99999-3001', ultimaVisita: '2025-04-06' },
    { id: 'c2', nome: 'Gabriel Santos', telefone: '(79) 99999-3002', ultimaVisita: '2025-03-30' },
    { id: 'c3', nome: 'Isabela Rocha', telefone: '(79) 99999-3003', ultimaVisita: '2025-04-13' },
  ],
  agendamentos: [
    { id: 'a1', clienteId: 'c1', profissionalId: 'p1', servicoId: 's2', data: 'hoje', hora: '10:00', status: 'confirmado' as const },
    { id: 'a2', clienteId: 'c2', profissionalId: 'p2', servicoId: 's1', data: 'hoje', hora: '14:00', status: 'agendado' as const },
    { id: 'a3', clienteId: 'c3', profissionalId: 'p1', servicoId: 's4', data: 'hoje', hora: '17:00', status: 'agendado' as const },
  ],
  financeiro: { receitaHoje: 850, receitaMes: 18750, ticketMedio: 480 },
}
