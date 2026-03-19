import type { DeckDraft, SavedDeck } from '@/types/deck'

export interface DeckRepositoryPresentation {
  badgeLabel: string
  subtitle: string
  emptyStateDescription: string
}

export interface DeckLoadResult {
  decks: SavedDeck[]
  syncedAt: string | null
}

export interface DeckSaveResult {
  savedDeck: SavedDeck
  decks: SavedDeck[]
  syncedAt: string | null
}

export interface DeckDeleteResult {
  decks: SavedDeck[]
  syncedAt: string | null
}

export interface DeckRepository {
  id: string
  presentation: DeckRepositoryPresentation
  loadDecks: () => Promise<DeckLoadResult>
  saveDeck: (draft: DeckDraft, currentDecks: SavedDeck[]) => Promise<DeckSaveResult>
  deleteDeck: (deckId: string, currentDecks: SavedDeck[]) => Promise<DeckDeleteResult>
}
