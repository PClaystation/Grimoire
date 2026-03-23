function isDeckUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function buildImportResolverBaseUrl() {
  const configuredServerUrl = import.meta.env.VITE_PLAY_SERVER_URL?.trim()

  if (!configuredServerUrl) {
    return window.location.origin
  }

  const url = new URL(configuredServerUrl, window.location.href)

  if (url.protocol === 'ws:') {
    url.protocol = 'http:'
  } else if (url.protocol === 'wss:') {
    url.protocol = 'https:'
  }

  url.pathname = ''
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/+$/, '')
}

export async function resolveDeckImportInput(input: string) {
  const trimmedInput = input.trim()

  if (!isDeckUrl(trimmedInput)) {
    return {
      normalizedInput: input,
      sourceLabel: null,
    }
  }

  const resolverUrl = new URL('/imports/deck-source', buildImportResolverBaseUrl())
  resolverUrl.searchParams.set('url', trimmedInput)

  const response = await fetch(resolverUrl.toString(), {
    headers: {
      Accept: 'application/json',
    },
  })
  const payload = (await response.json()) as {
    normalizedDecklist?: string
    provider?: string
    message?: string
  }

  if (!response.ok || typeof payload.normalizedDecklist !== 'string') {
    throw new Error(payload.message || 'Unable to import that deck URL.')
  }

  return {
    normalizedInput: payload.normalizedDecklist,
    sourceLabel: typeof payload.provider === 'string' ? payload.provider : 'Deck URL',
  }
}
