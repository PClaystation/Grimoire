import { useState } from 'react'

import type { DeckCardEntry, DeckDraft, DeckFormat, DeckSection, SavedDeck } from '@/types/deck'
import type { MagicCard } from '@/types/scryfall'

const DEFAULT_DECK_NAME = 'New Deck'
const HISTORY_LIMIT = 80

interface DeckBuilderState {
  deckName: string
  format: DeckFormat
  mainboard: DeckCardEntry[]
  sideboard: DeckCardEntry[]
  notes: string
  matchupNotes: string
  budgetTargetUsd: number | null
  activeDeckId: string | null
  createdAt: string | null
}

interface DeckHistoryState {
  past: DeckBuilderState[]
  present: DeckBuilderState
  future: DeckBuilderState[]
}

const DEFAULT_DECK_STATE: DeckBuilderState = {
  deckName: DEFAULT_DECK_NAME,
  format: 'standard',
  mainboard: [],
  sideboard: [],
  notes: '',
  matchupNotes: '',
  budgetTargetUsd: null,
  activeDeckId: null,
  createdAt: null,
}

function sortDeckEntries(entries: DeckCardEntry[]): DeckCardEntry[] {
  return [...entries].sort((left, right) => {
    if (left.card.manaValue !== right.card.manaValue) {
      return left.card.manaValue - right.card.manaValue
    }

    return left.card.name.localeCompare(right.card.name)
  })
}

function trimHistory(states: DeckBuilderState[]): DeckBuilderState[] {
  return states.slice(Math.max(0, states.length - HISTORY_LIMIT))
}

function createDeckState(
  deck: Pick<
    SavedDeck | DeckDraft,
    | 'name'
    | 'format'
    | 'mainboard'
    | 'sideboard'
    | 'notes'
    | 'matchupNotes'
    | 'budgetTargetUsd'
    | 'createdAt'
  >,
  activeDeckId: string | null,
): DeckBuilderState {
  return {
    deckName: deck.name,
    format: deck.format,
    mainboard: sortDeckEntries(deck.mainboard),
    sideboard: sortDeckEntries(deck.sideboard),
    notes: deck.notes,
    matchupNotes: deck.matchupNotes,
    budgetTargetUsd: deck.budgetTargetUsd,
    activeDeckId,
    createdAt: deck.createdAt,
  }
}

export function useDeckBuilder() {
  const [history, setHistory] = useState<DeckHistoryState>({
    past: [],
    present: DEFAULT_DECK_STATE,
    future: [],
  })

  function applyChange(
    updater: (state: DeckBuilderState) => DeckBuilderState,
    options?: { record?: boolean },
  ) {
    setHistory((currentHistory) => {
      const nextState = updater(currentHistory.present)

      if (nextState === currentHistory.present) {
        return currentHistory
      }

      if (options?.record === false) {
        return {
          ...currentHistory,
          present: nextState,
        }
      }

      return {
        past: trimHistory([...currentHistory.past, currentHistory.present]),
        present: nextState,
        future: [],
      }
    })
  }

  function updateSection(
    section: DeckSection,
    updater: (cards: DeckCardEntry[]) => DeckCardEntry[],
  ) {
    applyChange((currentState) => ({
      ...currentState,
      [section]: updater(currentState[section]),
    }))
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
    applyChange((currentState) => {
      const sourceCards = currentState[from]
      const targetCards = currentState[to]
      const entry = sourceCards.find((item) => item.card.id === cardId)

      if (!entry) {
        return currentState
      }

      const nextSourceCards = sortDeckEntries(
        sourceCards.flatMap((item) => {
          if (item.card.id !== cardId) {
            return item
          }

          if (item.quantity <= 1) {
            return []
          }

          return [{ ...item, quantity: item.quantity - 1 }]
        }),
      )

      const existingTargetEntry = targetCards.find((item) => item.card.id === cardId)
      const nextTargetCards = sortDeckEntries(
        existingTargetEntry
          ? targetCards.map((item) =>
              item.card.id === cardId ? { ...item, quantity: item.quantity + 1 } : item,
            )
          : [...targetCards, { card: entry.card, quantity: 1 }],
      )

      return {
        ...currentState,
        [from]: nextSourceCards,
        [to]: nextTargetCards,
      }
    })
  }

  function setDeckName(deckName: string) {
    applyChange((currentState) => ({ ...currentState, deckName }))
  }

  function setDeckFormat(format: DeckFormat) {
    applyChange((currentState) => ({ ...currentState, format }))
  }

  function setNotes(notes: string) {
    applyChange((currentState) => ({ ...currentState, notes }))
  }

  function setMatchupNotes(matchupNotes: string) {
    applyChange((currentState) => ({ ...currentState, matchupNotes }))
  }

  function setBudgetTargetUsd(budgetTargetUsd: number | null) {
    applyChange((currentState) => ({ ...currentState, budgetTargetUsd }))
  }

  function resetDeck() {
    applyChange(() => DEFAULT_DECK_STATE)
  }

  function loadDeck(deck: SavedDeck) {
    applyChange(() => createDeckState(deck, deck.id))
  }

  function replaceDeck(draft: DeckDraft) {
    applyChange(() => createDeckState(draft, draft.id))
  }

  function syncSavedDeck(deck: SavedDeck) {
    applyChange(
      (currentState) => ({
        ...currentState,
        deckName: deck.name,
        format: deck.format,
        notes: deck.notes,
        matchupNotes: deck.matchupNotes,
        budgetTargetUsd: deck.budgetTargetUsd,
        activeDeckId: deck.id,
        createdAt: deck.createdAt,
      }),
      { record: false },
    )
  }

  function detachSavedDeck() {
    applyChange(
      (currentState) => ({
        ...currentState,
        activeDeckId: null,
      }),
      { record: false },
    )
  }

  function undo() {
    setHistory((currentHistory) => {
      const previousState = currentHistory.past.at(-1)

      if (!previousState) {
        return currentHistory
      }

      return {
        past: currentHistory.past.slice(0, -1),
        present: previousState,
        future: [currentHistory.present, ...currentHistory.future],
      }
    })
  }

  function redo() {
    setHistory((currentHistory) => {
      const nextState = currentHistory.future[0]

      if (!nextState) {
        return currentHistory
      }

      return {
        past: trimHistory([...currentHistory.past, currentHistory.present]),
        present: nextState,
        future: currentHistory.future.slice(1),
      }
    })
  }

  const {
    deckName,
    format,
    mainboard,
    sideboard,
    notes,
    matchupNotes,
    budgetTargetUsd,
    activeDeckId,
    createdAt,
  } = history.present

  const deckDraft: DeckDraft = {
    id: activeDeckId,
    name: deckName,
    format,
    mainboard,
    sideboard,
    notes,
    matchupNotes,
    budgetTargetUsd,
    createdAt,
  }

  return {
    deckName,
    setDeckName,
    format,
    setDeckFormat,
    mainboard,
    sideboard,
    notes,
    setNotes,
    matchupNotes,
    setMatchupNotes,
    budgetTargetUsd,
    setBudgetTargetUsd,
    activeDeckId,
    deckDraft,
    addCard,
    decreaseCard,
    removeCard,
    moveCard,
    resetDeck,
    loadDeck,
    replaceDeck,
    syncSavedDeck,
    detachSavedDeck,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
