import type {
  DeckDeleteResult,
  DeckRepository,
  DeckRepositoryPresentation,
  DeckSaveResult,
} from '@/decks/deckRepository'
import {
  buildSavedDeckFromDraft,
  persistLocalSavedDecks,
  readLocalSavedDecks,
  removeSavedDeck,
  upsertSavedDeck,
} from '@/decks/localDeckStorage'

export function createLocalDeckRepository(
  presentation: DeckRepositoryPresentation,
): DeckRepository {
  return {
    id: 'local-browser-storage',
    presentation,
    async loadDecks() {
      return {
        decks: readLocalSavedDecks(),
        syncedAt: null,
      }
    },
    async saveDeck(draft, currentDecks) {
      const savedDeck = buildSavedDeckFromDraft(draft, currentDecks)
      const decks = upsertSavedDeck(savedDeck, currentDecks)

      persistLocalSavedDecks(decks, { strict: true })

      const result: DeckSaveResult = {
        savedDeck,
        decks,
        syncedAt: null,
      }

      return result
    },
    async deleteDeck(deckId, currentDecks) {
      const decks = removeSavedDeck(deckId, currentDecks)

      persistLocalSavedDecks(decks, { strict: true })

      const result: DeckDeleteResult = {
        decks,
        syncedAt: null,
      }

      return result
    },
  }
}
