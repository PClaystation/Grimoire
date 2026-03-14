import type { CardColor, MagicCard } from '@/types/scryfall'

export type DeckSection = 'mainboard' | 'sideboard'

export interface DeckCardEntry {
  card: MagicCard
  quantity: number
}

export interface DeckDraft {
  id: string | null
  name: string
  mainboard: DeckCardEntry[]
  sideboard: DeckCardEntry[]
  createdAt: string | null
}

export interface SavedDeck {
  id: string
  name: string
  mainboard: DeckCardEntry[]
  sideboard: DeckCardEntry[]
  createdAt: string
  updatedAt: string
}

export type DeckColorStatKey = CardColor | 'C'

export type DeckTypeStatKey =
  | 'Creature'
  | 'Instant'
  | 'Sorcery'
  | 'Artifact'
  | 'Enchantment'
  | 'Planeswalker'
  | 'Land'
  | 'Battle'
  | 'Other'

export interface DeckSectionStats {
  totalCards: number
  uniqueCards: number
  averageManaValue: string
  estimatedValueUsd: number
  pricedCards: number
  colorCounts: Record<DeckColorStatKey, number>
  typeCounts: Record<DeckTypeStatKey, number>
  manaCurve: Array<{ label: string; count: number }>
}

export interface DeckValidationIssue {
  id: string
  severity: 'error' | 'warning' | 'info'
  title: string
  description: string
}

export interface DeckStats {
  mainboard: DeckSectionStats
  sideboard: DeckSectionStats
  cardsToSixty: number
  sideboardSlotsLeft: number
  totalEstimatedValueUsd: number
  validation: DeckValidationIssue[]
}
