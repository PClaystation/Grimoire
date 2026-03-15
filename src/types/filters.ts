import type { DeckFormat } from '@/types/deck'
import type { CardColor } from '@/types/scryfall'

export type CardColorFilter = 'ANY' | CardColor | 'MULTI' | 'COLORLESS'

export type CardTypeFilter =
  | 'ANY'
  | 'Creature'
  | 'Instant'
  | 'Sorcery'
  | 'Artifact'
  | 'Enchantment'
  | 'Planeswalker'
  | 'Land'
  | 'Battle'

export type ManaValueFilterOption =
  | 'ANY'
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7+'

export type CardRarityFilter = 'ANY' | 'common' | 'uncommon' | 'rare' | 'mythic'

export type CardSortOption =
  | 'RELEVANCE'
  | 'NAME'
  | 'MANA_VALUE'
  | 'PRICE_LOW'
  | 'PRICE_HIGH'
  | 'NEWEST'

export interface CardSearchFilters {
  query: string
  format: DeckFormat
  legalityOnly: boolean
  color: CardColorFilter
  type: CardTypeFilter
  manaValue: ManaValueFilterOption
  rarity: CardRarityFilter
  setCode: string
}

export interface CardSetOption {
  code: string
  name: string
  releasedAt: string | null
  setType: string
}
