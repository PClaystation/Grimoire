function buildSearchString(params?: URLSearchParams | Record<string, string | null | undefined>) {
  if (!params) {
    return ''
  }

  const searchParams =
    params instanceof URLSearchParams ? new URLSearchParams(params) : new URLSearchParams()

  if (!(params instanceof URLSearchParams)) {
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        searchParams.set(key, value)
      }
    }
  }

  return searchParams.toString()
}

export function buildAppRouteUrl(
  pathname: string,
  params?: URLSearchParams | Record<string, string | null | undefined>,
) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  const search = buildSearchString(params)
  const basePath = String(import.meta.env.BASE_URL || '/')
  const routeMode = import.meta.env.VITE_ROUTER_MODE === 'hash' ? 'hash' : 'browser'
  const url = new URL(window.location.origin)

  if (routeMode === 'hash') {
    url.pathname = basePath
    url.hash = `${normalizedPath}${search ? `?${search}` : ''}`
    return url.toString()
  }

  const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
  url.pathname = `${normalizedBasePath}${normalizedPath}`.replace(/\/{2,}/g, '/')
  url.search = search
  return url.toString()
}
