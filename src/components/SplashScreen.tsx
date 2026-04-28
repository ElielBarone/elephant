import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SplashReactionType } from '@/components/MascotReactions'
import i18n from '@/lib/i18n'


export type SplashMood = 'neutral' | 'happy'

interface SplashCopy {
  title?: string
  message?: string
}

export interface SplashScreenState {
  open: boolean
  reactionType: SplashReactionType
  mood: SplashMood
  title?: string
  message?: string
  content?: ReactNode
  autoHideMs?: number
}

interface SplashScreenActions {
  show: (
    reactionType: SplashReactionType,
    copy: SplashCopy,
    mood?: SplashMood,
    content?: ReactNode,
    autoHideMs?: number,
  ) => void
  hide: () => void
}

type SplashScreenValue = [SplashScreenState, SplashScreenActions]

const initialSplashState: SplashScreenState = {
  open: true,
  reactionType: 'default',
  mood: 'happy',
  title: i18n.t('splash.welcomeTitle'),
  message: i18n.t('splash.welcomeMessage'),
  autoHideMs: 2000,
}

const SplashScreenContext = createContext<SplashScreenValue | null>(null)

export function SplashScreenProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SplashScreenState>(initialSplashState)
  

  const actions = useMemo<SplashScreenActions>(
    () => ({
      show: (reactionType, copy, mood = 'neutral', content, autoHideMs) => {
        setState({
          open: true,
          reactionType,
          mood,
          title: copy.title,
          message: copy.message,
          content,
          autoHideMs,
        })
      
      },
      hide: () => {
        setState((current) => ({ ...current, open: false }))
      },
    }),
    [],
  )

  useEffect(() => {
    if (!state.open || !state.autoHideMs || state.autoHideMs <= 0) {
      return
    }
    const id = window.setTimeout(() => {
      setState((current) => ({ ...current, open: false }))
    }, state.autoHideMs)
    return () => window.clearTimeout(id)
  }, [state.open, state.autoHideMs])

  const value = useMemo<SplashScreenValue>(() => [state, actions], [actions, state])

  return <SplashScreenContext.Provider value={value}>{children}</SplashScreenContext.Provider>
}

export function useSplashScreen(): SplashScreenValue {
  const contextValue = useContext(SplashScreenContext)
  if (!contextValue) {
    throw new Error('useSplashScreen must be used within SplashScreenProvider')
  }
  return contextValue
}
