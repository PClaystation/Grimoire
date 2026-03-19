import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { AUTH_API_BASE, isTrustedLoginOrigin } from '@/auth/config'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import {
  fetchWithTimeout,
  openLoginPopup,
  requestJson,
  requestRefreshSession,
  toRequestError,
  type AuthorizedFetch,
  type AuthorizedFetchOptions,
} from '@/auth/client'
import type { AuthSessionPayload, AuthStatus, AuthUser } from '@/auth/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeAuthUser(payload: unknown): AuthUser | null {
  const candidate =
    isRecord(payload) && isRecord(payload.user) ? payload.user : isRecord(payload) ? payload : null

  if (
    !candidate ||
    typeof candidate.userId !== 'string' ||
    typeof candidate.continentalId !== 'string' ||
    typeof candidate.email !== 'string' ||
    typeof candidate.displayName !== 'string'
  ) {
    return null
  }

  return {
    userId: candidate.userId,
    continentalId: candidate.continentalId,
    email: candidate.email,
    displayName: candidate.displayName,
    isVerified: Boolean(candidate.isVerified),
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : null,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
    lastLoginAt: typeof candidate.lastLoginAt === 'string' ? candidate.lastLoginAt : null,
    lastLoginIp: typeof candidate.lastLoginIp === 'string' ? candidate.lastLoginIp : null,
  }
}

function getSessionAccessToken(payload: AuthSessionPayload | null) {
  const accessToken = payload?.accessToken || payload?.token || ''
  return accessToken.trim()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const accessTokenRef = useRef('')
  const authorizedFetchRef = useRef<AuthorizedFetch>(async () => {
    throw new Error('Authorized fetch is not ready yet.')
  })
  const loginPopupWindowRef = useRef<Window | null>(null)
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null)

  const closeLoginPopup = useCallback(() => {
    if (loginPopupWindowRef.current && !loginPopupWindowRef.current.closed) {
      loginPopupWindowRef.current.close()
    }
  }, [])

  const clearSessionState = useCallback(() => {
    accessTokenRef.current = ''
    setUser(null)
  }, [])

  const storeSession = useCallback((payload: AuthSessionPayload | null) => {
    accessTokenRef.current = getSessionAccessToken(payload)
  }, [])

  const refreshSessionToken = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    const refreshPromise = (async () => {
      const payload = await requestRefreshSession()

      if (!payload) {
        accessTokenRef.current = ''
        return false
      }

      storeSession(payload)
      return true
    })()

    refreshPromiseRef.current = refreshPromise

    try {
      return await refreshPromise
    } finally {
      refreshPromiseRef.current = null
    }
  }, [storeSession])

  const authorizedFetch: AuthorizedFetch = useCallback(
    async (
      input: RequestInfo | URL,
      init: RequestInit = {},
      options: AuthorizedFetchOptions = {},
    ): Promise<Response> => {
      const { requiresAuth = true, retryOn401 = true } = options
      const headers = new Headers(init.headers)

      if (requiresAuth) {
        let accessToken = accessTokenRef.current

        if (!accessToken) {
          const refreshed = await refreshSessionToken()
          accessToken = refreshed ? accessTokenRef.current : ''
        }

        if (accessToken) {
          headers.set('Authorization', `Bearer ${accessToken}`)
        }
      }

      let response: Response

      try {
        response = await fetchWithTimeout(input, {
          ...init,
          credentials: init.credentials ?? 'include',
          headers,
        })
      } catch (error) {
        throw toRequestError(error)
      }

      if (response.status === 401 && requiresAuth && retryOn401) {
        const refreshed = await refreshSessionToken()

        if (refreshed) {
          return authorizedFetch(input, init, {
            requiresAuth,
            retryOn401: false,
          })
        }

        clearSessionState()
        setStatus('unauthenticated')
      }

      return response
    },
    [clearSessionState, refreshSessionToken],
  )

  async function loadCurrentUser() {
    const payload = await requestJson<unknown>(authorizedFetch, `${AUTH_API_BASE}/me`)
    const nextUser = normalizeAuthUser(payload)

    if (!nextUser) {
      throw new Error('Authenticated, but the account response was missing expected fields.')
    }

    setUser(nextUser)
    setStatus('authenticated')
    setErrorMessage(null)

    return nextUser
  }

  const restoreSession = useEffectEvent(async () => {
    setStatus('loading')
    const refreshed = await refreshSessionToken()

    if (!refreshed) {
      clearSessionState()
      setStatus('unauthenticated')
      return
    }

    try {
      await loadCurrentUser()
    } catch {
      clearSessionState()
      setStatus('unauthenticated')
    }
  })

  const completePopupLogin = useEffectEvent(async (hasInlineToken: boolean) => {
    setIsBusy(true)
    setErrorMessage(null)

    if (status !== 'authenticated') {
      setStatus('loading')
    }

    try {
      const hasSession =
        hasInlineToken && accessTokenRef.current ? true : await refreshSessionToken()

      if (!hasSession) {
        clearSessionState()
        setStatus('unauthenticated')
        setErrorMessage(
          'Signed in, but Continental ID could not establish a session for this site. If third-party cookies are blocked, cloud auth cannot work here.',
        )
        return
      }

      await loadCurrentUser()
      closeLoginPopup()
    } catch (error) {
      clearSessionState()
      setStatus('unauthenticated')
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load your Continental ID account.',
      )
    } finally {
      setIsBusy(false)
    }
  })

  useEffect(() => {
    void restoreSession()
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (!isTrustedLoginOrigin(event.origin)) {
        return
      }

      if (!isRecord(event.data) || event.data.type !== 'LOGIN_SUCCESS') {
        return
      }

      const accessToken =
        typeof event.data.accessToken === 'string'
          ? event.data.accessToken
          : typeof event.data.token === 'string'
            ? event.data.token
            : ''

      if (accessToken.trim()) {
        storeSession({
          accessToken,
        })
      }

      void completePopupLogin(Boolean(accessToken.trim()))
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [storeSession])

  useEffect(() => {
    authorizedFetchRef.current = authorizedFetch
  }, [authorizedFetch])

  useEffect(() => {
    return () => {
      if (loginPopupWindowRef.current && !loginPopupWindowRef.current.closed) {
        loginPopupWindowRef.current.close()
      }
    }
  }, [])

  function signIn() {
    setErrorMessage(null)
    loginPopupWindowRef.current = openLoginPopup(loginPopupWindowRef.current)

    if (!loginPopupWindowRef.current) {
      setErrorMessage('Login popup blocked. Allow popups for this site and try again.')
    }
  }

  async function signOut() {
    setIsBusy(true)
    setErrorMessage(null)

    try {
      await fetchWithTimeout(`${AUTH_API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Clear the local session state even if the network request fails.
    } finally {
      closeLoginPopup()
      clearSessionState()
      setStatus('unauthenticated')
      setIsBusy(false)
    }
  }

  const requestJsonValue = useCallback(
    <T,>(input: RequestInfo | URL, init?: RequestInit, options?: AuthorizedFetchOptions) =>
      requestJson<T>(authorizedFetchRef.current, input, init, options),
    [],
  )

  const value: AuthContextValue = {
    status,
    user,
    errorMessage,
    isBusy,
    signIn,
    signOut,
    authorizedFetch,
    requestJson: requestJsonValue,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
