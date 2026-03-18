const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])
const FALLBACK_ORIGIN = 'http://localhost/'

export function trimTrailingSlash(value: string | null | undefined) {
  return String(value || '').replace(/\/+$/, '')
}

function getRuntimeWindow() {
  return typeof window === 'undefined' ? null : window
}

function getRuntimeHref() {
  return getRuntimeWindow()?.location.href ?? FALLBACK_ORIGIN
}

export function getDefaultApiBaseUrl() {
  const runtimeWindow = getRuntimeWindow()

  if (!runtimeWindow) {
    return 'https://mpmc.ddns.net:5000'
  }

  if (LOCAL_HOSTS.has(runtimeWindow.location.hostname)) {
    return 'http://localhost:5000'
  }

  if (
    runtimeWindow.location.hostname === 'mpmc.ddns.net' &&
    runtimeWindow.location.port === '5000'
  ) {
    return runtimeWindow.location.origin
  }

  return 'https://mpmc.ddns.net:5000'
}

export function getDefaultLoginPopupUrl() {
  const runtimeWindow = getRuntimeWindow()

  if (!runtimeWindow) {
    return 'https://login.continental-hub.com/popup.html'
  }

  if (LOCAL_HOSTS.has(runtimeWindow.location.hostname)) {
    return new URL('../login popup/popup.html', runtimeWindow.location.href).toString()
  }

  return 'https://login.continental-hub.com/popup.html'
}

export const API_BASE_URL = trimTrailingSlash(
  getRuntimeWindow()?.__API_BASE_URL__ ||
    import.meta.env.VITE_CONTINENTAL_AUTH_BASE_URL ||
    getDefaultApiBaseUrl(),
)

export const AUTH_API_BASE = `${API_BASE_URL}/api/auth`

export const LOGIN_POPUP_URL =
  getRuntimeWindow()?.__LOGIN_POPUP_URL__ ||
  import.meta.env.VITE_CONTINENTAL_LOGIN_POPUP_URL ||
  getDefaultLoginPopupUrl()

export const loginPopupOrigin = (() => {
  try {
    return new URL(LOGIN_POPUP_URL, getRuntimeHref()).origin
  } catch {
    return null
  }
})()

export function buildLoginPopupUrl(currentHref = getRuntimeHref()) {
  const runtimeWindow = getRuntimeWindow()
  const popupUrl = new URL(LOGIN_POPUP_URL, currentHref)
  const currentOrigin = runtimeWindow?.location.origin ?? new URL(currentHref).origin

  popupUrl.searchParams.set('origin', currentOrigin)
  popupUrl.searchParams.set('redirect', currentHref)

  return popupUrl
}

export function isTrustedLoginOrigin(origin: string) {
  const runtimeWindow = getRuntimeWindow()

  if (!origin || !runtimeWindow) {
    return false
  }

  if (origin === runtimeWindow.location.origin) {
    return true
  }

  if (loginPopupOrigin && origin === loginPopupOrigin) {
    return true
  }

  try {
    const parsedOrigin = new URL(origin)
    return (
      LOCAL_HOSTS.has(runtimeWindow.location.hostname) && LOCAL_HOSTS.has(parsedOrigin.hostname)
    )
  } catch {
    return false
  }
}
