import { createContext } from 'react'

import type { AuthorizedFetch, AuthorizedFetchOptions } from '@/auth/client'
import type { AuthStatus, AuthUser } from '@/auth/types'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  errorMessage: string | null
  isBusy: boolean
  signIn: () => void
  signOut: () => Promise<void>
  authorizedFetch: AuthorizedFetch
  requestJson: <T>(
    input: RequestInfo | URL,
    init?: RequestInit,
    options?: AuthorizedFetchOptions,
  ) => Promise<T>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
