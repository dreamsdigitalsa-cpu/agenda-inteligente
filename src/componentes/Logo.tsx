// Logo do StudioFlow — alterna automaticamente entre claro/escuro.
import { useTema } from '@/componentes/tema/ProvedorTema'
import logoLight from '@/assets/studioflow-logo-light.png'
import logoDark from '@/assets/studioflow-logo-dark.png'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  /** Quando true, mostra apenas o ícone (não o wordmark). */
  somenteIcone?: boolean
  alt?: string
}

/**
 * Renderiza a logo do StudioFlow respeitando o tema atual.
 * No tema escuro usa a versão com glow, no claro a versão padrão.
 */
export const Logo = ({ className, alt = 'StudioFlow' }: LogoProps) => {
  let temaResolvido: 'claro' | 'escuro' = 'claro'
  try {
    const { tema } = useTema()
    if (tema === 'escuro') temaResolvido = 'escuro'
    else if (tema === 'claro') temaResolvido = 'claro'
    else if (typeof window !== 'undefined') {
      temaResolvido = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'escuro'
        : 'claro'
    }
  } catch {
    // Se for usado fora do provedor, faz fallback pelo media query.
    if (typeof window !== 'undefined') {
      temaResolvido = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'escuro'
        : 'claro'
    }
  }

  const src = temaResolvido === 'escuro' ? logoDark : logoLight
  return (
    <img
      src={src}
      alt={alt}
      className={cn('h-8 w-auto select-none', className)}
      draggable={false}
    />
  )
}

export default Logo
