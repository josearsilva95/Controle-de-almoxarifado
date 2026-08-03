import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../types/database'

export interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  carregando: boolean
  login: (email: string, senha: string) => Promise<{ erro: string | null }>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
