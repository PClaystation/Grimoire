import type { CardColor, MagicCard } from './scryfall.js'

export type DeckSection = 'mainboard' | 'sideboard'

export type DeckFormat =
  | 'standard'
  | 'pioneer'
  | 'modern'
  | 'legacy'
  | 'vintage'
  | 'pauper'
  | 'commander'

export interface DeckCardEntry {
  card: MagicCard
  quantity: number
}

export interface DeckDraft {
  id: string | null
  name: string
  format: DeckFormat
  mainboard: DeckCardEntry[]
  sideboard: DeckCardEntry[]
  commanderCardId: string | null
  notes: string
  matchupNotes: string
  budgetTargetUsd: number | null
  createdAt: string | null
}

export interface SavedDeckVersion {
  id: string
  label: string
  createdAt: string
  mainboard: DeckCardEntry[]
  sideboard: DeckCardEntry[]
  commanderCardId: string | null
  notes: string
  matchupNotes: string
  budgetTargetUsd: number | null
}

export interface SavedDeck {
  id: string
  name: string
  format: DeckFormat
  mainboard: DeckCardEntry[]
  sideboard: DeckCardEntry[]
  commanderCardId: string | null
  notes: string
  matchupNotes: string
  budgetTargetUsd: number | null
  versions: SavedDeckVersion[]
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

export interface DeckSwapSuggestion {
  cut: string
  add: string
  reason: string
}

export interface DeckRecommendation {
  id: string
  tone: 'success' | 'warning' | 'info'
  title: string
  description: string
  swaps?: DeckSwapSuggestion[]
}

export interface DeckRatingFactor {
  id: string
  label: string
  score: number
  maxScore: number
  summary: string
}

export interface DeckRating {
  score: number
  label: string
  summary: string
  factors: DeckRatingFactor[]
}

export interface DeckStats {
  mainboard: DeckSectionStats
  sideboard: DeckSectionStats
  cardsToTarget: number
  mainboardTarget: number
  sideboardMax: number
  sideboardSlotsLeft: number
  totalEstimatedValueUsd: number
  validation: DeckValidationIssue[]
  rating: DeckRating
  recommendations: DeckRecommendation[]
}
