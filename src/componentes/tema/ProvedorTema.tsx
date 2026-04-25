// Provedor de tema (claro / escuro / sistema).
// Persiste a preferência em localStorage e aplica a classe `dark` no <html>.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Tema = 'claro' | 'escuro' | 'sistema'

interface ContextoTema {
  tema: Tema
  temaResolvido: 'claro' | 'escuro'
  definirTema: (t: Tema) => void
}

const Contexto = createContext<ContextoTema | undefined>(undefined)
const CHAVE = 'tema-belezaf3'

function lerTemaInicial(): Tema {
  if (typeof window === 'undefined') return 'sistema'
  const salvo = localStorage.getItem(CHAVE) as Tema | null
  if (salvo === 'claro' || salvo === 'escuro' || salvo === 'sistema') return salvo
  return 'sistema'
}

function resolver(tema: Tema): 'claro' | 'escuro' {
  if (tema !== 'sistema') return tema
  if (typeof window === 'undefined') return 'claro'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => lerTemaInicial())
  const [temaResolvido, setResolvido] = useState<'claro' | 'escuro'>(() => resolver(lerTemaInicial()))

  useEffect(() => {
    const r = resolver(tema)
    setResolvido(r)
    const html = document.documentElement
    if (r === 'escuro') html.classList.add('dark')
    else html.classList.remove('dark')
  }, [tema])

  // Reage a mudanças do SO quando o usuário escolheu "sistema"
  useEffect(() => {
    if (tema !== 'sistema') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const r = mq.matches ? 'escuro' : 'claro'
      setResolvido(r)
      document.documentElement.classList.toggle('dark', r === 'escuro')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [tema])

  const valor = useMemo<ContextoTema>(
    () => ({
      tema,
      temaResolvido,
      definirTema: (t) => {
        localStorage.setItem(CHAVE, t)
        setTema(t)
      },
    }),
    [tema, temaResolvido],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useTema(): ContextoTema {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useTema deve ser usado dentro de <ProvedorTema>')
  return ctx
}
