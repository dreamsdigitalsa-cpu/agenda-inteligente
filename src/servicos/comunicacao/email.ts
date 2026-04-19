// Serviço: envio de e-mails transacionais.
// Implementar através de Edge Function (Resend, SendGrid, etc.).
export async function enviarEmail(
  _para: string,
  _assunto: string,
  _html: string
): Promise<void> {
  throw new Error('enviarEmail: não implementado')
}
