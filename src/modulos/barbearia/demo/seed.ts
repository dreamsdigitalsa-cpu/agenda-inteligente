// Seed de dados-demo do segmento barbearia.
// Carregado pela página /demo/barbearia para popular a UI sem persistência.
export const seedBarbearia = {
  segmento: 'barbearia' as const,
  estabelecimento: { nome: 'Barbearia do João', cor: '#1e293b' },
  profissionais: [
    { id: 'p1', nome: 'João Silva', especialidade: 'Corte e Barba' },
    { id: 'p2', nome: 'Carlos Navalha', especialidade: 'Corte Degradê' },
  ],
  servicos: [
    { id: 's1', nome: 'Corte masculino', duracao: 30, preco: 35 },
    { id: 's2', nome: 'Barba completa', duracao: 20, preco: 25 },
    { id: 's3', nome: 'Corte + Barba', duracao: 45, preco: 55 },
  ],
  clientes: [
    { id: 'c1', nome: 'Pedro Alves', telefone: '(79) 99999-0001', ultimaVisita: '2025-04-10' },
    { id: 'c2', nome: 'Marcos Souza', telefone: '(79) 99999-0002', ultimaVisita: '2025-04-08' },
    { id: 'c3', nome: 'Rafael Lima', telefone: '(79) 99999-0003', ultimaVisita: '2025-04-05' },
  ],
  agendamentos: [
    { id: 'a1', clienteId: 'c1', profissionalId: 'p1', servicoId: 's3', data: 'hoje', hora: '09:00', status: 'confirmado' as const },
    { id: 'a2', clienteId: 'c2', profissionalId: 'p2', servicoId: 's1', data: 'hoje', hora: '10:00', status: 'agendado' as const },
    { id: 'a3', clienteId: 'c3', profissionalId: 'p1', servicoId: 's2', data: 'hoje', hora: '11:30', status: 'agendado' as const },
  ],
  filaDeEspera: [
    { posicao: 1, nome: 'André Costa', servico: 'Corte', espera: '5 min' },
    { posicao: 2, nome: 'Bruno Melo', servico: 'Barba', espera: '20 min' },
  ],
  financeiro: { receitaHoje: 165, receitaMes: 3840, ticketMedio: 45 },
}
