import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Headers de segurança para o servidor de desenvolvimento local.
    // Em produção (Lovable/Vercel/etc.), configure estes headers no servidor HTTP.
    headers: {
      // Impede que a aplicação seja embutida em iframes de outros domínios (clickjacking)
      "X-Frame-Options": "DENY",
      // Impede que o browser faça sniffing do Content-Type
      "X-Content-Type-Options": "nosniff",
      // Força HTTPS por 1 ano (só relevante em produção com HTTPS)
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      // Política de referência: não vaza URL em requisições cross-origin
      "Referrer-Policy": "strict-origin-when-cross-origin",
      // Permissões de APIs sensíveis do browser
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      // Content Security Policy:
      //   - default-src 'self': bloqueia tudo por padrão
      //   - script-src 'self' 'unsafe-inline': necessário para Vite HMR em dev
      //   - style-src 'self' 'unsafe-inline': Tailwind inline styles
      //   - img-src 'self' data: blob: https: — permite logos do Supabase Storage
      //   - connect-src 'self' https://*.supabase.co wss://*.supabase.co — Supabase API + Realtime
      //   - font-src 'self' data: — fontes embutidas
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.elevenlabs.io",
        "media-src 'self' blob: https://*.supabase.co",
        "frame-ancestors 'none'",
      ].join("; "),
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // Emite aviso se chunks maiores que 1MB (padrão 500KB é muito baixo para este projeto)
    chunkSizeWarningLimit: 1000,
  },
}));
