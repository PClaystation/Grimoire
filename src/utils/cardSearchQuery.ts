import type { CardSearchFilters, CardSortOption } from '@/types/filters'

const COLOR_QUERY_MAP: Record<string, string> = {
  W: 'c:w',
  U: 'c:u',
  B: 'c:b',
  R: 'c:r',
  G: 'c:g',
  MULTI: 'c:m',
  COLORLESS: 'c:c',
}

const COLOR_IDENTITY_QUERY_MAP: Record<string, string> = {
  W: 'id:w',
  U: 'id:u',
  B: 'id:b',
  R: 'id:r',
  G: 'id:g',
  MULTI: 'id:m',
  COLORLESS: 'id:c',
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

const SET_TYPE_QUERY_MAP: Record<string, string> = {
  core: 'st:core',
  expansion: 'st:expansion',
  masters: 'st:masters',
  commander: 'st:commander',
  draft_innovation: 'st:draft_innovation',
}

const LAYOUT_QUERY_MAP: Record<string, string> = {
  ADVENTURE: 'is:adventure',
  MODAL_DFC: 'layout:modal_dfc',
  SPLIT: 'layout:split',
  TRANSFORM: 'layout:transform',
}

const MANA_PRODUCED_QUERY_MAP: Record<string, string> = {
  W: 'produces:w',
  U: 'produces:u',
  B: 'produces:b',
  R: 'produces:r',
  G: 'produces:g',
  C: 'produces:c',
}

function escapeQueryValue(value: string) {
  return value.replace(/"/g, '').trim()
}

function buildQualifiedQuery(prefix: string, value: string) {
  const escapedValue = escapeQueryValue(value)

  if (!escapedValue) {
    return null
  }

  return /\s/.test(escapedValue) ? `${prefix}:"${escapedValue}"` : `${prefix}:${escapedValue}`
}

function buildCommaSeparatedQualifiedQueries(prefix: string, value: string) {
  return value
    .split(',')
    .map((entry) => buildQualifiedQuery(prefix, entry))
    .filter((entry): entry is string => entry !== null)
}

function buildExactNameQuery(value: string) {
  const escapedValue = escapeQueryValue(value)

  if (!escapedValue) {
    return null
  }

  return `!"${escapedValue}"`
}

function parseNumberInput(value: string, integerOnly = false): number | null {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  const parsedValue = Number(trimmedValue)

  if (!Number.isFinite(parsedValue)) {
    return null
  }

  return integerOnly ? Math.trunc(parsedValue) : parsedValue
}

function buildRangeQueryParts(field: string, min: string, max: string, integerOnly = false) {
  const queryParts: string[] = []
  const minValue = parseNumberInput(min, integerOnly)
  const maxValue = parseNumberInput(max, integerOnly)

  if (minValue !== null) {
    queryParts.push(`${field}>=${minValue}`)
  }

  if (maxValue !== null) {
    queryParts.push(`${field}<=${maxValue}`)
  }

  return queryParts
}

function hasRankedSearchTerm(filters: CardSearchFilters) {
  return [
    filters.query,
    filters.exactName,
    filters.subtype,
    filters.oracleText,
    filters.flavorText,
    filters.keyword,
    filters.artist,
    filters.collectorNumber,
  ].some((value) => value.trim().length > 0)
}

export function shouldUsePrintSearch(filters: CardSearchFilters) {
  return (
    filters.setCode !== 'ANY' ||
    filters.setType !== 'ANY' ||
    filters.collectorNumber.trim().length > 0 ||
    filters.releaseYearStart.trim().length > 0 ||
    filters.releaseYearEnd.trim().length > 0 ||
    filters.fullArtOnly ||
    filters.borderlessOnly ||
    filters.showcaseOnly ||
    filters.retroFrameOnly
  )
}

export function buildSearchQuery(filters: CardSearchFilters): string {
  const queryParts = ['game:paper', '-is:token']

  if (filters.legalityOnly) {
    queryParts.push(`legal:${filters.format}`)
  }

  const colorQuery = COLOR_QUERY_MAP[filters.color]
  if (colorQuery) {
    queryParts.push(colorQuery)
  }

  const colorIdentityQuery = COLOR_IDENTITY_QUERY_MAP[filters.colorIdentity]
  if (colorIdentityQuery) {
    queryParts.push(colorIdentityQuery)
  }

  if (filters.colorCount !== 'ANY') {
    queryParts.push(`colors=${filters.colorCount}`)
  }

  const typeQuery = TYPE_QUERY_MAP[filters.type]
  if (typeQuery) {
    queryParts.push(typeQuery)
  }

  const manaValueQuery = MANA_VALUE_QUERY_MAP[filters.manaValue]
  if (manaValueQuery) {
    queryParts.push(manaValueQuery)
  }

  queryParts.push(...buildRangeQueryParts('mv', filters.manaValueMin, filters.manaValueMax))

  const rarityQuery = RARITY_QUERY_MAP[filters.rarity]
  if (rarityQuery) {
    queryParts.push(rarityQuery)
  }

  if (filters.setCode !== 'ANY') {
    queryParts.push(`set:${filters.setCode}`)
  }

  const setTypeQuery = SET_TYPE_QUERY_MAP[filters.setType]
  if (setTypeQuery) {
    queryParts.push(setTypeQuery)
  }

  const layoutQuery = LAYOUT_QUERY_MAP[filters.layout]
  if (layoutQuery) {
    queryParts.push(layoutQuery)
  }

  const manaProducedQuery = MANA_PRODUCED_QUERY_MAP[filters.manaProduced]
  if (manaProducedQuery) {
    queryParts.push(manaProducedQuery)
  }

  queryParts.push(...buildCommaSeparatedQualifiedQueries('t', filters.subtype))

  const exactNameQuery = buildExactNameQuery(filters.exactName)
  if (exactNameQuery) {
    queryParts.push(exactNameQuery)
  }

  const oracleTextQuery = buildQualifiedQuery('o', filters.oracleText)
  if (oracleTextQuery) {
    queryParts.push(oracleTextQuery)
  }

  const flavorTextQuery = buildQualifiedQuery('ft', filters.flavorText)
  if (flavorTextQuery) {
    queryParts.push(flavorTextQuery)
  }

  queryParts.push(...buildCommaSeparatedQualifiedQueries('keyword', filters.keyword))

  const artistQuery = buildQualifiedQuery('a', filters.artist)
  if (artistQuery) {
    queryParts.push(artistQuery)
  }

  const collectorNumberQuery = buildQualifiedQuery('cn', filters.collectorNumber)
  if (collectorNumberQuery) {
    queryParts.push(collectorNumberQuery)
  }

  queryParts.push(...buildRangeQueryParts('year', filters.releaseYearStart, filters.releaseYearEnd, true))
  queryParts.push(...buildRangeQueryParts('usd', filters.priceUsdMin, filters.priceUsdMax))
  queryParts.push(...buildRangeQueryParts('pow', filters.powerMin, filters.powerMax))
  queryParts.push(...buildRangeQueryParts('tou', filters.toughnessMin, filters.toughnessMax))
  queryParts.push(...buildRangeQueryParts('loy', filters.loyaltyMin, filters.loyaltyMax))

  if (filters.legendaryOnly) {
    queryParts.push('t:legendary')
  }

  if (filters.basicOnly) {
    queryParts.push('t:basic')
  }

  if (filters.fullArtOnly) {
    queryParts.push('is:fullart')
  }

  if (filters.borderlessOnly) {
    queryParts.push('is:borderless')
  }

  if (filters.showcaseOnly) {
    queryParts.push('is:showcase')
  }

  if (filters.retroFrameOnly) {
    queryParts.push('frame:1997')
  }

  const trimmedQuery = filters.query.trim()
  if (trimmedQuery) {
    queryParts.push(trimmedQuery)
  }

  return queryParts.join(' ')
}

export function buildSearchRequestConfig(filters: CardSearchFilters, sortBy: CardSortOption): {
  order: string
  dir?: 'asc' | 'desc'
  unique: 'cards' | 'prints'
} {
  switch (sortBy) {
    case 'NAME':
      return {
        order: 'name',
        unique: shouldUsePrintSearch(filters) ? 'prints' : 'cards',
      }
    case 'MANA_VALUE':
      return {
        order: 'cmc',
        unique: shouldUsePrintSearch(filters) ? 'prints' : 'cards',
      }
    case 'PRICE_LOW':
      return {
        order: 'usd',
        dir: 'asc',
        unique: shouldUsePrintSearch(filters) ? 'prints' : 'cards',
      }
    case 'PRICE_HIGH':
      return {
        order: 'usd',
        dir: 'desc',
        unique: shouldUsePrintSearch(filters) ? 'prints' : 'cards',
      }
    case 'NEWEST':
      return {
        order: 'released',
        dir: 'desc',
        unique: shouldUsePrintSearch(filters) ? 'prints' : 'cards',
      }
    case 'RELEVANCE':
    default:
      return {
        order: hasRankedSearchTerm(filters) ? 'name' : 'edhrec',
        unique: shouldUsePrintSearch(filters) ? 'prints' : 'cards',
      }
  }
}
