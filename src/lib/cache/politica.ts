// POLÍTICA DE CACHE — ler antes de usar React Query ou localStorage
// Regra de ouro: dados financeiros NUNCA são cacheados no cliente
export const POLITICA_CACHE = {
  PERFIL_USUARIO: 5 * 60 * 1000,        // 5 minutos
  PERMISSOES_USUARIO: 10 * 60 * 1000,   // 10 minutos
  CONFIGURACOES_TENANT: 15 * 60 * 1000, // 15 minutos
  LISTA_SERVICOS: 60 * 60 * 1000,       // 1 hora
  PLANOS_ASSINATURA: 24 * 60 * 60 * 1000, // 24 horas
  AGENDA_DO_DIA: 0,       // Sem cache — usar Supabase Realtime
  DADOS_FINANCEIROS: -1,  // NUNCA cachear — buscar sempre do servidor
  DEMO_PREVIEW: 'sessao', // Apenas memória local (useState)
} as const
