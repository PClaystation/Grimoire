interface DeckSiteImportResult {
  normalizedDecklist: string
  provider: string
  sourceUrl: string
}

const SUPPORTED_HOSTS = new Set([
  'archidekt.com',
  'www.archidekt.com',
  'tappedout.net',
  'www.tappedout.net',
  'moxfield.com',
  'www.moxfield.com',
  'aetherhub.com',
  'www.aetherhub.com',
  'mtggoldfish.com',
  'www.mtggoldfish.com',
])

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
}

function sanitizeLine(value: string) {
  return decodeHtmlEntities(value).replace(/\r/g, '').trim()
}

function parseFormatValue(value: string) {
  const normalizedValue = value.trim().toLowerCase()

  if (normalizedValue.includes('commander') || normalizedValue.includes('edh')) {
    return 'commander'
  }

  if (normalizedValue.includes('standard')) {
    return 'standard'
  }

  if (normalizedValue.includes('pioneer')) {
    return 'pioneer'
  }

  if (normalizedValue.includes('modern')) {
    return 'modern'
  }

  if (normalizedValue.includes('legacy')) {
    return 'legacy'
  }

  if (normalizedValue.includes('vintage')) {
    return 'vintage'
  }

  if (normalizedValue.includes('pauper')) {
    return 'pauper'
  }

  return null
}

function normalizeDecklist(title: string, format: string | null, sections: Record<string, string[]>) {
  const lines = [`# ${title.trim() || 'Imported Deck'}`]

  if (format) {
    lines.push(`# Format: ${format}`)
  }

  const commanderLines = sections.Commander ?? []
  const deckLines = sections.Deck ?? []
  const sideboardLines = sections.Sideboard ?? []

  if (commanderLines.length > 0 || deckLines.length > 0) {
    lines.push('', 'Deck')
    lines.push(...commanderLines, ...deckLines)
  }

  if (sideboardLines.length > 0) {
    lines.push('', 'Sideboard')
    lines.push(...sideboardLines)
  }

  return lines.join('\n')
}

export function parseArchidektDeckPage(html: string, sourceUrl: string): DeckSiteImportResult {
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)

  if (!nextDataMatch) {
    throw new Error('Archidekt did not expose a readable deck payload.')
  }

  const nextData = JSON.parse(nextDataMatch[1]) as {
    props?: {
      pageProps?: {
        redux?: {
          deck?: {
            name?: string
            description?: string
            categories?: Record<string, { includedInDeck?: boolean }>
            cardMap?: Record<string, { name?: string; qty?: number; setCode?: string; categories?: string[] }>
          }
        }
      }
    }
  }

  const deckState = nextData.props?.pageProps?.redux?.deck

  if (!deckState?.cardMap) {
    throw new Error('Archidekt did not expose a readable card map.')
  }

  const formatMatch = html.match(/<meta name="twitter:data2" content="([^"]+)"/i)
  const format = formatMatch ? parseFormatValue(formatMatch[1]) : null
  const sections: Record<string, string[]> = {
    Deck: [],
    Sideboard: [],
  }

  const includedCategories = deckState.categories ?? {}

  for (const card of Object.values(deckState.cardMap)) {
    const quantity = Number(card.qty ?? 0)
    const name = sanitizeLine(card.name ?? '')

    if (!name || quantity <= 0) {
      continue
    }

    const includedDeckCategories = (card.categories ?? []).filter((categoryName) => {
      const category = includedCategories[categoryName]
      return category ? category.includedInDeck !== false : categoryName !== 'Maybeboard'
    })

    if (includedDeckCategories.length === 0) {
      continue
    }

    const targetSection = includedDeckCategories.includes('Sideboard') ? 'Sideboard' : 'Deck'
    const setSuffix = card.setCode ? ` (${String(card.setCode).toUpperCase()})` : ''
    sections[targetSection].push(`${quantity} ${name}${setSuffix}`)
  }

  return {
    normalizedDecklist: normalizeDecklist(deckState.name ?? 'Imported Deck', format, sections),
    provider: 'Archidekt',
    sourceUrl,
  }
}

export function parseTappedOutDeckPage(html: string, sourceUrl: string): DeckSiteImportResult {
  const titleMatch = html.match(/<title>([^<]+)\s+\(/i)
  const formatMatch = html.match(/<title>[^<]+\(([^)]+)\)<\/title>/i)
  const textareaMatch = html.match(/<textarea id="mtga-textarea">([\s\S]*?)<\/textarea>/i)

  if (!textareaMatch) {
    throw new Error('TappedOut did not expose an importable deck export.')
  }

  const sections: Record<string, string[]> = {}
  let activeSection: string | null = null

  for (const rawLine of textareaMatch[1].split('\n')) {
    const line = sanitizeLine(rawLine)

    if (!line) {
      continue
    }

    if (line === 'About') {
      activeSection = null
      continue
    }

    const nameMatch = line.match(/^Name\s+(.+)$/)
    if (nameMatch) {
      continue
    }

    if (line === 'Commander' || line === 'Deck' || line === 'Sideboard') {
      activeSection = line
      sections[activeSection] = sections[activeSection] ?? []
      continue
    }

    if (activeSection && /^\d+x?\s+/.test(line)) {
      sections[activeSection].push(line.replace(/^(\d+)x\s+/, '$1 '))
    }
  }

  return {
    normalizedDecklist: normalizeDecklist(
      sanitizeLine(titleMatch?.[1] ?? 'Imported Deck'),
      parseFormatValue(formatMatch?.[1] ?? ''),
      sections,
    ),
    provider: 'TappedOut',
    sourceUrl,
  }
}

function assertSupportedUrl(rawUrl: string) {
  let sourceUrl: URL

  try {
    sourceUrl = new URL(rawUrl)
  } catch {
    throw new Error('Paste a full deck URL, including https://')
  }

  if (!['http:', 'https:'].includes(sourceUrl.protocol)) {
    throw new Error('Only http and https deck URLs are supported.')
  }

  if (!SUPPORTED_HOSTS.has(sourceUrl.hostname.toLowerCase())) {
    throw new Error('That deck site is not supported yet. Try Archidekt or TappedOut.')
  }

  return sourceUrl
}

function getProviderName(hostname: string) {
  if (hostname.includes('archidekt.com')) {
    return 'archidekt'
  }

  if (hostname.includes('tappedout.net')) {
    return 'tappedout'
  }

  if (hostname.includes('moxfield.com')) {
    return 'moxfield'
  }

  if (hostname.includes('aetherhub.com')) {
    return 'aetherhub'
  }

  if (hostname.includes('mtggoldfish.com')) {
    return 'mtggoldfish'
  }

  return 'unknown'
}

export async function resolveDeckSiteImport(rawUrl: string): Promise<DeckSiteImportResult> {
  const sourceUrl = assertSupportedUrl(rawUrl)
  const provider = getProviderName(sourceUrl.hostname.toLowerCase())

  if (provider === 'moxfield' || provider === 'aetherhub' || provider === 'mtggoldfish') {
    throw new Error(
      'That site currently blocks Grimoire from fetching deck pages automatically. Paste the site export text for now.',
    )
  }

  const response = await fetch(sourceUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Grimoire Deck Import/1.0',
    },
  })

  const html = await response.text()

  if (!response.ok) {
    throw new Error(`Unable to load that deck page (${response.status}).`)
  }

  if (provider === 'archidekt') {
    return parseArchidektDeckPage(html, sourceUrl.toString())
  }

  if (provider === 'tappedout') {
    return parseTappedOutDeckPage(html, sourceUrl.toString())
  }

  throw new Error('That deck site is not supported yet.')
}
