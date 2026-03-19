import type { TableCardSnapshot } from '@/shared/play'

export type LibraryCardSortOption = 'DECK_ORDER' | 'NAME' | 'MANA_VALUE' | 'TYPE' | 'NEWEST'

const TOKEN_PATTERN = /(?:[^\s"]+:"[^"]+"|"[^"]+"|\S+)/g

function normalizeValue(value: string) {
  return value.replace(/^"(.*)"$/, '$1').trim().toLowerCase()
}

function tokenizeQuery(rawQuery: string) {
  return rawQuery.match(TOKEN_PATTERN) ?? []
}

function buildPlainHaystack(card: TableCardSnapshot) {
  return [
    card.card.name,
    card.card.typeLine,
    card.card.oracleText,
    card.card.manaCost,
    String(card.card.manaValue),
    card.card.setCode,
    card.card.setName,
    card.card.rarity,
    card.card.collectorNumber,
    card.card.colorIdentity.join(' '),
  ]
    .join(' ')
    .toLowerCase()
}

function parseColorValue(value: string) {
  const normalizedValue = normalizeValue(value)

  if (!normalizedValue) {
    return []
  }

  const aliases = normalizedValue
    .replace(/white/g, 'w')
    .replace(/blue/g, 'u')
    .replace(/black/g, 'b')
    .replace(/red/g, 'r')
    .replace(/green/g, 'g')
    .replace(/colorless/g, 'c')

  return [...new Set(aliases.replace(/[^wubrgc]/g, '').toUpperCase().split('').filter(Boolean))]
}

function matchesColorQuery(card: TableCardSnapshot, value: string, useIdentity: boolean) {
  const normalizedValue = normalizeValue(value)
  const sourceColors = useIdentity ? card.card.colorIdentity : card.card.colors

  if (normalizedValue === 'multicolor') {
    return sourceColors.length > 1
  }

  if (normalizedValue === 'colorless') {
    return sourceColors.length === 0
  }

  const expectedColors = parseColorValue(normalizedValue)

  if (expectedColors.length === 0) {
    return false
  }

  return expectedColors.every((color) => sourceColors.includes(color as (typeof sourceColors)[number]))
}

function matchesNumericComparator(actualValue: number, rawToken: string, fieldPrefix: string) {
  const trimmedToken = rawToken.trim().toLowerCase()
  const prefixedPattern = new RegExp(`^${fieldPrefix}(<=|>=|=|<|>)(-?\\d+(?:\\.\\d+)?)$`)
  const plainPattern = /^(-?\d+(?:\.\d+)?)$/
  const prefixedMatch = trimmedToken.match(prefixedPattern)

  if (prefixedMatch) {
    const [, operator, value] = prefixedMatch
    const expectedValue = Number(value)

    switch (operator) {
      case '<':
        return actualValue < expectedValue
      case '<=':
        return actualValue <= expectedValue
      case '>':
        return actualValue > expectedValue
      case '>=':
        return actualValue >= expectedValue
      case '=':
      default:
        return actualValue === expectedValue
    }
  }

  const normalizedToken = normalizeValue(rawToken)

  if (plainPattern.test(normalizedToken)) {
    return actualValue === Number(normalizedToken)
  }

  return null
}

function matchesToken(card: TableCardSnapshot, token: string) {
  const lowerToken = token.toLowerCase()
  const prefixedManaValue = matchesNumericComparator(card.card.manaValue, lowerToken, 'mv')
  if (prefixedManaValue !== null) {
    return prefixedManaValue
  }

  const separatorIndex = token.indexOf(':')
  if (separatorIndex === -1) {
    return buildPlainHaystack(card).includes(normalizeValue(token))
  }

  const key = token.slice(0, separatorIndex).toLowerCase()
  const value = token.slice(separatorIndex + 1)
  const normalizedValue = normalizeValue(value)

  switch (key) {
    case 'name':
      return card.card.name.toLowerCase().includes(normalizedValue)
    case 'type':
    case 'tag':
      return card.card.typeLine.toLowerCase().includes(normalizedValue)
    case 'text':
    case 'oracle':
      return card.card.oracleText.toLowerCase().includes(normalizedValue)
    case 'set':
      return (
        card.card.setCode.toLowerCase().includes(normalizedValue) ||
        card.card.setName.toLowerCase().includes(normalizedValue)
      )
    case 'rarity':
      return card.card.rarity.toLowerCase() === normalizedValue
    case 'color':
      return matchesColorQuery(card, normalizedValue, false)
    case 'id':
    case 'identity':
      return matchesColorQuery(card, normalizedValue, true)
    case 'mv': {
      const prefixedResult = matchesNumericComparator(card.card.manaValue, normalizedValue, 'mv')
      return prefixedResult ?? false
    }
    default:
      return buildPlainHaystack(card).includes(normalizedValue)
  }
}

function sortCards(cards: TableCardSnapshot[], sortBy: LibraryCardSortOption) {
  if (sortBy === 'DECK_ORDER') {
    return cards
  }

  const sortedCards = [...cards]

  switch (sortBy) {
    case 'NAME':
      return sortedCards.sort((left, right) => left.card.name.localeCompare(right.card.name))
    case 'MANA_VALUE':
      return sortedCards.sort((left, right) => {
        if (left.card.manaValue !== right.card.manaValue) {
          return left.card.manaValue - right.card.manaValue
        }

        return left.card.name.localeCompare(right.card.name)
      })
    case 'TYPE':
      return sortedCards.sort((left, right) => {
        if (left.card.typeLine !== right.card.typeLine) {
          return left.card.typeLine.localeCompare(right.card.typeLine)
        }

        return left.card.name.localeCompare(right.card.name)
      })
    case 'NEWEST':
      return sortedCards.sort((left, right) => {
        if (left.card.releasedAt !== right.card.releasedAt) {
          return right.card.releasedAt.localeCompare(left.card.releasedAt)
        }

        return left.card.name.localeCompare(right.card.name)
      })
    default:
      return sortedCards
  }
}

export function filterLibraryCards(
  cards: TableCardSnapshot[],
  rawQuery: string,
  sortBy: LibraryCardSortOption,
) {
  const normalizedTokens = tokenizeQuery(rawQuery).map((token) => token.trim()).filter(Boolean)
  const filteredCards =
    normalizedTokens.length > 0
      ? cards.filter((card) => normalizedTokens.every((token) => matchesToken(card, token)))
      : cards

  return sortCards(filteredCards, sortBy)
}
