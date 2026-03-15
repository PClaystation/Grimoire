import type { CardSortOption } from '@/types/filters'
import type { MagicCard } from '@/types/scryfall'
import { getCardMarketPriceUsd } from '@/utils/format'

export function sortCards(cards: MagicCard[], sortBy: CardSortOption): MagicCard[] {
  const sortedCards = [...cards]

  switch (sortBy) {
    case 'NAME':
      return sortedCards.sort((left, right) => left.name.localeCompare(right.name))
    case 'MANA_VALUE':
      return sortedCards.sort((left, right) => {
        if (left.manaValue !== right.manaValue) {
          return left.manaValue - right.manaValue
        }

        return left.name.localeCompare(right.name)
      })
    case 'PRICE_HIGH':
      return sortedCards.sort((left, right) => {
        const leftPrice = getCardMarketPriceUsd(left) ?? -1
        const rightPrice = getCardMarketPriceUsd(right) ?? -1

        if (leftPrice !== rightPrice) {
          return rightPrice - leftPrice
        }

        return left.name.localeCompare(right.name)
      })
    case 'PRICE_LOW':
      return sortedCards.sort((left, right) => {
        const leftPrice = getCardMarketPriceUsd(left) ?? Number.POSITIVE_INFINITY
        const rightPrice = getCardMarketPriceUsd(right) ?? Number.POSITIVE_INFINITY

        if (leftPrice !== rightPrice) {
          return leftPrice - rightPrice
        }

        return left.name.localeCompare(right.name)
      })
    case 'NEWEST':
      return sortedCards.sort((left, right) => {
        if (left.releasedAt !== right.releasedAt) {
          return right.releasedAt.localeCompare(left.releasedAt)
        }

        return left.name.localeCompare(right.name)
      })
    case 'RELEVANCE':
    default:
      return sortedCards
  }
}
