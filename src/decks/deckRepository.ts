import type { DeckDraft, SavedDeck } from '@/types/deck'

export interface DeckRepositoryPresentation {
  badgeLabel: string
  subtitle: string
  emptyStateDescription: string
}

export interface DeckSyncState {
  mode: 'local' | 'cloud'
  health: 'ready' | 'pending' | 'offline'
  pendingDeckCount: number
  message: string | null
}

export interface DeckLoadResult {
  decks: SavedDeck[]
  syncedAt: string | null
  syncState: DeckSyncState
}

export interface DeckSaveResult {
  savedDeck: SavedDeck
  decks: SavedDeck[]
  syncedAt: string | null
  syncState: DeckSyncState
}

export interface DeckDeleteResult {
  decks: SavedDeck[]
  syncedAt: string | null
  syncState: DeckSyncState
}

export interface DeckRepository {
  id: string
  presentation: DeckRepositoryPresentation
  loadDecks: () => Promise<DeckLoadResult>
  saveDeck: (draft: DeckDraft, currentDecks: SavedDeck[]) => Promise<DeckSaveResult>
  deleteDeck: (deckId: string, currentDecks: SavedDeck[]) => Promise<DeckDeleteResult>
}
