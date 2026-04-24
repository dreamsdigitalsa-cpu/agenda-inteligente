# Headers de Segurança para Produção

Este documento contém os headers de segurança recomendados para configuração no servidor HTTP de produção (Vercel, Netlify, Lovable Deploy, etc.).

> ⚠️ **IMPORTANTE**: NÃO configure estes headers no `vite.config.ts` pois quebram o preview do Lovable (que renderiza em iframe).

## Headers Recomendados

```nginx
# Impede que a aplicação seja embutida em iframes de outros domínios (clickjacking)
X-Frame-Options: DENY

# Impede que o browser faça sniffing do Content-Type
X-Content-Type-Options: nosniff

# Força HTTPS por 1 ano
Strict-Transport-Security: max-age=31536000; includeSubDomains

# Política de referência: não vaza URL em requisições cross-origin
Referrer-Policy: strict-origin-when-cross-origin

# Permissões de APIs sensíveis do browser
Permissions-Policy: camera=(), microphone=(), geolocation=()

# Content Security Policy (CSP)
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.elevenlabs.io; media-src 'self' blob: https://*.supabase.co; frame-ancestors 'none'
```

## Configuração por Plataforma

### Vercel (`vercel.json`)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.elevenlabs.io; media-src 'self' blob: https://*.supabase.co; frame-ancestors 'none'" }
      ]
    }
  ]
}
```

### Netlify (`netlify.toml`)
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.elevenlabs.io; media-src 'self' blob: https://*.supabase.co; frame-ancestors 'none'"
```

## Explicação dos Headers

| Header | Propósito |
|--------|-----------|
| `X-Frame-Options: DENY` | Prevents clickjacking by blocking iframe embedding |
| `X-Content-Type-Options: nosniff` | Prevents MIME type sniffing attacks |
| `Strict-Transport-Security` | Forces HTTPS connections |
| `Referrer-Policy` | Controls referrer information leakage |
| `Permissions-Policy` | Restricts browser API access |
| `Content-Security-Policy` | Defines approved sources for content |
