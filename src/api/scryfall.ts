import type { CardSearchFilters, CardSetOption } from '@/types/filters'
import type {
  CardColor,
  CardSearchResult,
  DeckImportIdentifier,
  MagicCard,
  ScryfallCard,
  ScryfallCollectionResponse,
  ScryfallCardsResponse,
  ScryfallImageUris,
  ScryfallSetsResponse,
} from '@/types/scryfall'

const SCRYFALL_BASE_URL = 'https://api.scryfall.com'

const COLOR_QUERY_MAP: Record<string, string> = {
  W: 'c:w',
  U: 'c:u',
  B: 'c:b',
  R: 'c:r',
  G: 'c:g',
  MULTI: 'c:m',
  COLORLESS: 'c:c',
}

const TYPE_QUERY_MAP: Record<string, string> = {
  Creature: 't:creature',
  Instant: 't:instant',
  Sorcery: 't:sorcery',
  Artifact: 't:artifact',
  Enchantment: 't:enchantment',
  Planeswalker: 't:planeswalker',
  Land: 't:land',
  Battle: 't:battle',
}

const MANA_VALUE_QUERY_MAP: Record<string, string> = {
  '0': 'mv=0',
  '1': 'mv=1',
  '2': 'mv=2',
  '3': 'mv=3',
  '4': 'mv=4',
  '5': 'mv=5',
  '6': 'mv=6',
  '7+': 'mv>=7',
}

const RARITY_QUERY_MAP: Record<string, string> = {
  common: 'r:common',
  uncommon: 'r:uncommon',
  rare: 'r:rare',
  mythic: 'r:mythic',
}

const EXCLUDED_SET_TYPES = new Set([
  'alchemy',
  'archenemy',
  'funny',
  'memorabilia',
  'minigame',
  'token',
  'treasure_chest',
  'vanguard',
])

function buildSubtypeQuery(input: string) {
  return input
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const escapedEntry = entry.replace(/"/g, '')
      return /\s/.test(escapedEntry) ? `t:"${escapedEntry}"` : `t:${escapedEntry}`
    })
}

function buildSearchQuery(filters: CardSearchFilters): string {
  const queryParts = ['game:paper', '-is:token']

  if (filters.legalityOnly) {
    queryParts.push(`legal:${filters.format}`)
  }

  const colorQuery = COLOR_QUERY_MAP[filters.color]
  if (colorQuery) {
    queryParts.push(colorQuery)
  }

  const typeQuery = TYPE_QUERY_MAP[filters.type]
  if (typeQuery) {
    queryParts.push(typeQuery)
  }

  const manaValueQuery = MANA_VALUE_QUERY_MAP[filters.manaValue]
  if (manaValueQuery) {
    queryParts.push(manaValueQuery)
  }

  const rarityQuery = RARITY_QUERY_MAP[filters.rarity]
  if (rarityQuery) {
    queryParts.push(rarityQuery)
  }

  if (filters.setCode !== 'ANY') {
    queryParts.push(`set:${filters.setCode}`)
  }

  queryParts.push(...buildSubtypeQuery(filters.subtype))

  const trimmedQuery = filters.query.trim()
  if (trimmedQuery) {
    queryParts.push(trimmedQuery)
  }

  return queryParts.join(' ')
}

function uniqueColors(colors: CardColor[]): CardColor[] {
  return [...new Set(colors)]
}

function pickImageUris(card: ScryfallCard): ScryfallImageUris | undefined {
  if (card.image_uris) {
    return card.image_uris
  }

  return card.card_faces?.find((face) => face.image_uris)?.image_uris
}

function buildOracleText(card: ScryfallCard): string {
  if (card.oracle_text) {
    return card.oracle_text
  }

  if (!card.card_faces) {
    return ''
  }

  return card.card_faces
    .map((face) => [face.name, face.oracle_text].filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n\n')
}

function parsePrice(value: string | null): number | null {
  if (value === null) {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function normalizeCard(card: ScryfallCard): MagicCard | null {
  const imageUris = pickImageUris(card)
  const imageUrl = imageUris?.normal ?? imageUris?.large ?? imageUris?.small
  const largeImageUrl = imageUris?.large ?? imageUris?.normal ?? imageUris?.small

  if (!imageUrl || !largeImageUrl) {
    return null
  }

  const faceColors = card.card_faces?.flatMap((face) => face.colors ?? []) ?? []
  const colors = uniqueColors(card.colors && card.colors.length > 0 ? card.colors : faceColors)
  const manaCost =
    card.mana_cost ??
    card.card_faces?.find((face) => face.mana_cost)?.mana_cost ??
    ''

  return {
    id: card.id,
    oracleId: card.oracle_id ?? null,
    name: card.name,
    manaCost,
    manaValue: card.cmc,
    releasedAt: card.released_at,
    typeLine: card.type_line,
    oracleText: buildOracleText(card),
    colors,
    colorIdentity: card.color_identity,
    setCode: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    rarity: card.rarity,
    legalities: card.legalities,
    imageUrl,
    largeImageUrl,
    prices: {
      usd: parsePrice(card.prices.usd),
      usdFoil: parsePrice(card.prices.usd_foil),
      eur: parsePrice(card.prices.eur),
      eurFoil: parsePrice(card.prices.eur_foil),
      tix: parsePrice(card.prices.tix),
    },
  }
}

async function fetchJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Scryfall request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

function batchItems<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []

  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize))
  }

  return batches
}

export async function searchCards(
  filters: CardSearchFilters,
  page: number,
  signal?: AbortSignal,
): Promise<CardSearchResult> {
  const url = new URL('/cards/search', SCRYFALL_BASE_URL)
  url.searchParams.set('q', buildSearchQuery(filters))
  url.searchParams.set('unique', filters.setCode === 'ANY' ? 'cards' : 'prints')
  url.searchParams.set('order', filters.query.trim() ? 'name' : 'edhrec')
  url.searchParams.set('page', String(page))

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (response.status === 404) {
    return {
      cards: [],
      totalCards: 0,
      hasMore: false,
    }
  }

  if (!response.ok) {
    throw new Error(`Card search failed with status ${response.status}`)
  }

  const data = (await response.json()) as ScryfallCardsResponse
  return {
    cards: data.data.map(normalizeCard).filter((card): card is MagicCard => card !== null),
    totalCards: data.total_cards,
    hasMore: data.has_more,
  }
}

export async function lookupDeckCards(
  identifiers: DeckImportIdentifier[],
  signal?: AbortSignal,
): Promise<Map<string, MagicCard>> {
  const batches = batchItems(identifiers, 75)
  const resolvedCards = new Map<string, MagicCard>()

  for (const batch of batches) {
    const response = await fetch(new URL('/cards/collection', SCRYFALL_BASE_URL).toString(), {
      method: 'POST',
      signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifiers: batch.map((entry) =>
          entry.setCode ? { name: entry.name, set: entry.setCode } : { name: entry.name },
        ),
      }),
    })

    if (!response.ok) {
      throw new Error(`Deck import lookup failed with status ${response.status}`)
    }

    const data = (await response.json()) as ScryfallCollectionResponse
    const normalizedCards = data.data
      .map((card) => normalizeCard(card))
      .filter((card): card is MagicCard => card !== null)

    for (const card of normalizedCards) {
      resolvedCards.set(card.name.toLowerCase(), card)
      resolvedCards.set(`${card.name.toLowerCase()}|${card.setCode.toLowerCase()}`, card)
    }
  }

  return resolvedCards
}

export async function fetchCardPrints(
  oracleId: string,
  signal?: AbortSignal,
): Promise<MagicCard[]> {
  const url = new URL('/cards/search', SCRYFALL_BASE_URL)
  url.searchParams.set('q', `oracleid:${oracleId}`)
  url.searchParams.set('unique', 'prints')
  url.searchParams.set('order', 'released')
  url.searchParams.set('dir', 'desc')

  const data = await fetchJson<ScryfallCardsResponse>(url, signal)
  return data.data.map(normalizeCard).filter((card): card is MagicCard => card !== null)
}

export async function fetchCardSets(signal?: AbortSignal): Promise<CardSetOption[]> {
  const url = new URL('/sets', SCRYFALL_BASE_URL)
  const data = await fetchJson<ScryfallSetsResponse>(url, signal)

  return data.data
    .filter((set) => !set.digital && !EXCLUDED_SET_TYPES.has(set.set_type))
    .map((set) => ({
      code: set.code,
      name: set.name,
      releasedAt: set.released_at ?? null,
      setType: set.set_type,
    }))
    .sort((left, right) => {
      if (left.releasedAt && right.releasedAt && left.releasedAt !== right.releasedAt) {
        return right.releasedAt.localeCompare(left.releasedAt)
      }

      if (left.releasedAt && !right.releasedAt) {
        return -1
      }

      if (!left.releasedAt && right.releasedAt) {
        return 1
      }

      return left.name.localeCompare(right.name)
    })
}
