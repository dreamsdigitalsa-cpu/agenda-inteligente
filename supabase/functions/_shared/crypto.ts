// Utilitário de criptografia AES-256-GCM para Edge Functions.
// Usa a Web Crypto API nativa do Deno — sem dependências externas.
//
// Formato armazenado em banco:
//   { _encrypted: true, ciphertext: "<base64(iv || ciphertext)>" }
//
// Uso nas Edge Functions que precisam de credenciais:
//   const creds = await descriptografarSeNecessario<MinhaInterface>(valor, secret)

// Deriva uma chave AES-256 a partir de uma string arbitrária via PBKDF2.
async function derivarChave(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name:       'PBKDF2',
      // Salt fixo por app — protege contra ataques de dicionário na chave derivada
      salt:       new TextEncoder().encode('hubbeleza-crypt-v1'),
      iterations: 100_000,
      hash:       'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// Criptografa um valor arbitrário (objeto, string, número) com AES-256-GCM.
// Retorna o envelope { _encrypted, ciphertext } para armazenar no banco.
export async function criptografar(
  dados:  unknown,
  secret: string,
): Promise<{ _encrypted: true; ciphertext: string }> {
  const chave    = await derivarChave(secret)
  const iv       = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(dados))

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, plaintext)

  // Combinar IV (12 bytes) + ciphertext em uma única string base64
  const combined = new Uint8Array(12 + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), 12)

  return {
    _encrypted: true,
    ciphertext: btoa(String.fromCharCode(...combined)),
  }
}

// Descriptografa um envelope gerado por `criptografar`.
export async function descriptografar<T>(cipherBase64: string, secret: string): Promise<T> {
  const combined  = Uint8Array.from(atob(cipherBase64), (c) => c.charCodeAt(0))
  const iv        = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const chave     = await derivarChave(secret)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, chave, ciphertext)

  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

// Compatibilidade retroativa: se o valor já é um envelope criptografado, descriptografa;
// caso contrário, retorna o valor como está (útil para migrar dados legados).
export async function descriptografarSeNecessario<T>(
  valor:  unknown,
  secret: string,
): Promise<T> {
  if (
    valor != null &&
    typeof valor === 'object' &&
    '_encrypted' in (valor as Record<string, unknown>) &&
    (valor as { _encrypted: unknown })._encrypted === true
  ) {
    const ciphertext = (valor as { ciphertext: string }).ciphertext
    return descriptografar<T>(ciphertext, secret)
  }
  return valor as T
}
