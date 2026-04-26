// Tipos compartilhados pelos componentes de configuração de segmento.
// Cada componente expõe um método save() via useImperativeHandle para que
// o onboarding possa disparar o salvamento ao clicar em "Próximo".

export interface RefEtapaSegmento {
  /** Salva as configurações no banco. Lança erro em caso de falha. */
  save: () => Promise<void>
}
