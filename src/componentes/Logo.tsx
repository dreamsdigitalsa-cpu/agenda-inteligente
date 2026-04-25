// Logo do StudioFlow — alterna automaticamente entre claro/escuro.
import { useContext } from 'react'
import { useTema } from '@/componentes/tema/ProvedorTema'
import logoLight from '@/assets/studioflow-logo-light.png'
import logoDark from '@/assets/studioflow-logo-dark.png'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  alt?: string
}

/**
 * Renderiza a logo do StudioFlow respeitando o tema atual.
 * Versão "dark" tem glow para fundos escuros; "light" usa wordmark sólido.
 */
export const Logo = ({ className, alt = 'StudioFlow' }: LogoProps) => {
  let temaResolvido: 'claro' | 'escuro' = 'claro'
  try {
    temaResolvido = useTema().temaResolvido
  } catch {
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
