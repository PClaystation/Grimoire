import { useState } from 'react'

import type { DeckCardEntry, DeckDraft, DeckSection, SavedDeck } from '@/types/deck'
import type { MagicCard } from '@/types/scryfall'

const DEFAULT_DECK_NAME = 'New Deck'

function sortDeckEntries(entries: DeckCardEntry[]): DeckCardEntry[] {
  return [...entries].sort((left, right) => {
    if (left.card.manaValue !== right.card.manaValue) {
      return left.card.manaValue - right.card.manaValue
    }

    return left.card.name.localeCompare(right.card.name)
  })
}

export function useDeckBuilder() {
  const [deckName, setDeckName] = useState(DEFAULT_DECK_NAME)
  const [mainboard, setMainboard] = useState<DeckCardEntry[]>([])
  const [sideboard, setSideboard] = useState<DeckCardEntry[]>([])
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)

  function updateSection(
    section: DeckSection,
    updater: (cards: DeckCardEntry[]) => DeckCardEntry[],
  ) {
    const setCards = section === 'mainboard' ? setMainboard : setSideboard
    setCards((currentCards) => updater(currentCards))
  }

  function addCard(card: MagicCard, section: DeckSection = 'mainboard') {
    updateSection(section, (currentCards) => {
      const existingEntry = currentCards.find((entry) => entry.card.id === card.id)

      if (existingEntry) {
        return sortDeckEntries(
          currentCards.map((entry) =>
            entry.card.id === card.id
              ? { ...entry, quantity: entry.quantity + 1 }
              : entry,
          ),
        )
      }

      return sortDeckEntries([...currentCards, { card, quantity: 1 }])
    })
  }

  function decreaseCard(cardId: string, section: DeckSection = 'mainboard') {
    updateSection(section, (currentCards) =>
      sortDeckEntries(
        currentCards.flatMap((entry) => {
          if (entry.card.id !== cardId) {
            return entry
          }

          if (entry.quantity <= 1) {
            return []
          }

          return [{ ...entry, quantity: entry.quantity - 1 }]
        }),
      ),
    )
  }

  function removeCard(cardId: string, section: DeckSection = 'mainboard') {
    updateSection(section, (currentCards) =>
      currentCards.filter((entry) => entry.card.id !== cardId),
    )
  }

  function moveCard(cardId: string, from: DeckSection, to: DeckSection) {
    const sourceCards = from === 'mainboard' ? mainboard : sideboard
    const entry = sourceCards.find((item) => item.card.id === cardId)

    if (!entry) {
      return
    }

    decreaseCard(cardId, from)
    addCard(entry.card, to)
  }

  function resetDeck() {
    setDeckName(DEFAULT_DECK_NAME)
    setMainboard([])
    setSideboard([])
    setActiveDeckId(null)
    setCreatedAt(null)
  }

  function loadDeck(deck: SavedDeck) {
    setDeckName(deck.name)
    setMainboard(sortDeckEntries(deck.mainboard))
    setSideboard(sortDeckEntries(deck.sideboard))
    setActiveDeckId(deck.id)
    setCreatedAt(deck.createdAt)
  }

  function syncSavedDeck(deck: SavedDeck) {
    setDeckName(deck.name)
    setActiveDeckId(deck.id)
    setCreatedAt(deck.createdAt)
  }

  function detachSavedDeck() {
    setActiveDeckId(null)
  }

  const deckDraft: DeckDraft = {
    id: activeDeckId,
    name: deckName,
    mainboard,
    sideboard,
    createdAt,
  }

  return {
    deckName,
    setDeckName,
    mainboard,
    sideboard,
    activeDeckId,
    deckDraft,
    addCard,
    decreaseCard,
    removeCard,
    moveCard,
    resetDeck,
    loadDeck,
    syncSavedDeck,
    detachSavedDeck,
  }
}
