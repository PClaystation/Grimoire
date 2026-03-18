import { AUTH_API_BASE, buildLoginPopupUrl } from '@/auth/config'
import type { AuthSessionPayload } from '@/auth/types'

const REQUEST_TIMEOUT_MS = 12_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractMessage(payload: unknown) {
  return isRecord(payload) && typeof payload.message === 'string' ? payload.message : null
}

export async function parseResponseBody(response: Response) {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return { message: text }
  }
}

export function toRequestError(error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') {
    return new Error('Request timed out. Please try again.')
  }

  if (error instanceof TypeError) {
    return new Error('Network error. Check your connection and try again.')
  }

  return error instanceof Error ? error : new Error('Unexpected request error.')
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}

export function openLoginPopup(existingPopupWindow: Window | null) {
  if (typeof window === 'undefined') {
    return null
  }

  if (existingPopupWindow && !existingPopupWindow.closed) {
    existingPopupWindow.focus()
    return existingPopupWindow
  }

  const width = 520
  const height = 700
  const left = window.screenX + (window.outerWidth - width) / 2
  const top = window.screenY + (window.outerHeight - height) / 2

  return window.open(
    buildLoginPopupUrl().toString(),
    'ContinentalIdLoginPopup',
    `width=${width},height=${height},top=${Math.max(top, 0)},left=${Math.max(left, 0)}`,
  )
}

export async function requestRefreshSession() {
  try {
    const response = await fetchWithTimeout(`${AUTH_API_BASE}/refresh_token`, {
      method: 'POST',
      credentials: 'include',
    })
    const payload = await parseResponseBody(response)
    const accessToken =
      isRecord(payload) && typeof payload.accessToken === 'string'
        ? payload.accessToken
        : isRecord(payload) && typeof payload.token === 'string'
          ? payload.token
          : ''

    if (!response.ok || !accessToken) {
      return null
    }

    return payload as AuthSessionPayload
  } catch {
    return null
  }
}

export interface AuthorizedFetchOptions {
  requiresAuth?: boolean
  retryOn401?: boolean
}

export type AuthorizedFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: AuthorizedFetchOptions,
) => Promise<Response>

export async function requestJson<T>(
  fetcher: AuthorizedFetch,
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: AuthorizedFetchOptions = {},
) {
  const response = await fetcher(input, init, options)
  const payload = await parseResponseBody(response)

  if (!response.ok) {
    throw new Error(extractMessage(payload) || `Request failed (${response.status})`)
  }

  return payload as T
}
