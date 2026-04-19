// Seed de dados-demo do segmento estética.
export const seedEstetica = {
  segmento: 'estetica' as const,
  estabelecimento: { nome: 'Clínica Renove Estética', cor: '#059669' },
  profissionais: [
    { id: 'p1', nome: 'Dra. Camila Torres', especialidade: 'Estética Facial' },
    { id: 'p2', nome: 'Larissa Andrade', especialidade: 'Estética Corporal' },
  ],
  servicos: [
    { id: 's1', nome: 'Limpeza de pele profunda', duracao: 60, preco: 150 },
    { id: 's2', nome: 'Drenagem linfática', duracao: 50, preco: 120 },
    { id: 's3', nome: 'Peeling químico', duracao: 45, preco: 220 },
    { id: 's4', nome: 'Massagem modeladora', duracao: 60, preco: 130 },
  ],
  clientes: [
    { id: 'c1', nome: 'Renata Souza', telefone: '(79) 99999-2001', ultimaVisita: '2025-04-11' },
    { id: 'c2', nome: 'Vanessa Lima', telefone: '(79) 99999-2002', ultimaVisita: '2025-04-07' },
    { id: 'c3', nome: 'Cristina Alves', telefone: '(79) 99999-2003', ultimaVisita: '2025-03-28' },
  ],
  agendamentos: [
    { id: 'a1', clienteId: 'c1', profissionalId: 'p1', servicoId: 's1', data: 'hoje', hora: '09:30', status: 'confirmado' as const },
    { id: 'a2', clienteId: 'c2', profissionalId: 'p2', servicoId: 's2', data: 'hoje', hora: '11:00', status: 'agendado' as const },
    { id: 'a3', clienteId: 'c3', profissionalId: 'p1', servicoId: 's3', data: 'hoje', hora: '15:00', status: 'agendado' as const },
  ],
  financeiro: { receitaHoje: 490, receitaMes: 12300, ticketMedio: 165 },
}
