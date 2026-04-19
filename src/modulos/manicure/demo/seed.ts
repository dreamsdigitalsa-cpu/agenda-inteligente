// Seed de dados-demo do segmento manicure.
export const seedManicure = {
  segmento: 'manicure' as const,
  estabelecimento: { nome: 'Espaço Unhas & Arte', cor: '#ea580c' },
  profissionais: [
    { id: 'p1', nome: 'Tatiane Oliveira', especialidade: 'Unhas em gel' },
    { id: 'p2', nome: 'Priscila Cardoso', especialidade: 'Nail art' },
  ],
  servicos: [
    { id: 's1', nome: 'Mão (esmaltação)', duracao: 40, preco: 35 },
    { id: 's2', nome: 'Pé (esmaltação)', duracao: 40, preco: 40 },
    { id: 's3', nome: 'Mão + Pé', duracao: 75, preco: 65 },
    { id: 's4', nome: 'Unhas em gel', duracao: 90, preco: 120 },
  ],
  clientes: [
    { id: 'c1', nome: 'Camila Pires', telefone: '(79) 99999-4001', ultimaVisita: '2025-04-12' },
    { id: 'c2', nome: 'Letícia Moura', telefone: '(79) 99999-4002', ultimaVisita: '2025-04-05' },
    { id: 'c3', nome: 'Bianca Ferreira', telefone: '(79) 99999-4003', ultimaVisita: '2025-04-14' },
  ],
  agendamentos: [
    { id: 'a1', clienteId: 'c1', profissionalId: 'p1', servicoId: 's3', data: 'hoje', hora: '09:00', status: 'confirmado' },
    { id: 'a2', clienteId: 'c2', profissionalId: 'p2', servicoId: 's4', data: 'hoje', hora: '10:30', status: 'agendado' },
    { id: 'a3', clienteId: 'c3', profissionalId: 'p1', servicoId: 's1', data: 'hoje', hora: '13:00', status: 'agendado' },
  ],
  financeiro: { receitaHoje: 220, receitaMes: 5680, ticketMedio: 58 },
}
