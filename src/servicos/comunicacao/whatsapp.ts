// Serviço: envio de mensagens via WhatsApp.
// Implementar através de Edge Function — nunca expor token no cliente.
export async function enviarWhatsApp(_para: string, _mensagem: string): Promise<void> {
  throw new Error('enviarWhatsApp: não implementado')
}
