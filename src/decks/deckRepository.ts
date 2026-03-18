import type { DeckDraft, SavedDeck } from '@/types/deck'

export interface DeckRepositoryPresentation {
  badgeLabel: string
  subtitle: string
  emptyStateDescription: string
}

export interface DeckSaveResult {
  savedDeck: SavedDeck
  decks: SavedDeck[]
}

export interface DeckRepository {
  id: string
  presentation: DeckRepositoryPresentation
  loadDecks: () => Promise<SavedDeck[]>
  saveDeck: (draft: DeckDraft, currentDecks: SavedDeck[]) => Promise<DeckSaveResult>
  deleteDeck: (deckId: string, currentDecks: SavedDeck[]) => Promise<SavedDeck[]>
}
