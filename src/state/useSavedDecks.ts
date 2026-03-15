import { useState } from 'react'

import type { DeckCardEntry, DeckDraft, SavedDeck } from '@/types/deck'
import type { MagicCard } from '@/types/scryfall'

const STORAGE_KEY = 'grimoire.saved-decks.v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number'
}

function normalizeCardPrices(value: unknown): MagicCard['prices'] {
  if (!isRecord(value)) {
    return {
      usd: null,
      usdFoil: null,
      eur: null,
      eurFoil: null,
      tix: null,
    }
  }

  return {
    usd: isNullableNumber(value.usd) ? value.usd : null,
    usdFoil: isNullableNumber(value.usdFoil) ? value.usdFoil : null,
    eur: isNullableNumber(value.eur) ? value.eur : null,
    eurFoil: isNullableNumber(value.eurFoil) ? value.eurFoil : null,
    tix: isNullableNumber(value.tix) ? value.tix : null,
  }
}

function normalizeMagicCard(value: unknown): MagicCard | null {
  if (
    !(
      isRecord(value) &&
      typeof value.id === 'string' &&
      typeof value.name === 'string' &&
      typeof value.manaCost === 'string' &&
      typeof value.manaValue === 'number' &&
      typeof value.typeLine === 'string' &&
      typeof value.oracleText === 'string' &&
      Array.isArray(value.colors) &&
      Array.isArray(value.colorIdentity) &&
      typeof value.setCode === 'string' &&
      typeof value.setName === 'string' &&
      typeof value.collectorNumber === 'string' &&
      typeof value.rarity === 'string' &&
      typeof value.imageUrl === 'string' &&
      typeof value.largeImageUrl === 'string' &&
      isRecord(value.legalities)
    )
  ) {
    return null
  }

  return {
    id: value.id,
    oracleId: typeof value.oracleId === 'string' ? value.oracleId : null,
    name: value.name,
    manaCost: value.manaCost,
    manaValue: value.manaValue,
    releasedAt: typeof value.releasedAt === 'string' ? value.releasedAt : '',
    typeLine: value.typeLine,
    oracleText: value.oracleText,
    colors: value.colors as MagicCard['colors'],
    colorIdentity: value.colorIdentity as MagicCard['colorIdentity'],
    setCode: value.setCode,
    setName: value.setName,
    collectorNumber: value.collectorNumber,
    rarity: value.rarity,
    legalities: value.legalities as MagicCard['legalities'],
    imageUrl: value.imageUrl,
    largeImageUrl: value.largeImageUrl,
    prices: normalizeCardPrices(value.prices),
  }
}

function normalizeDeckCardEntry(value: unknown): DeckCardEntry | null {
  if (
    !(
      isRecord(value) &&
      typeof value.quantity === 'number' &&
      Number.isInteger(value.quantity) &&
      value.quantity > 0
    )
  ) {
    return null
  }

  const card = normalizeMagicCard(value.card)
  if (!card) {
    return null
  }

  return {
    quantity: value.quantity,
    card,
  }
}

function normalizeSavedDeck(value: unknown): SavedDeck | null {
  if (
    !(
      isRecord(value) &&
      typeof value.id === 'string' &&
      typeof value.name === 'string' &&
      typeof value.createdAt === 'string' &&
      typeof value.updatedAt === 'string'
    )
  ) {
    return null
  }

  const legacyMainboard = Array.isArray(value.cards) ? value.cards : []
  const rawMainboard = Array.isArray(value.mainboard) ? value.mainboard : legacyMainboard
  const rawSideboard = Array.isArray(value.sideboard) ? value.sideboard : []

  const mainboard = rawMainboard
    .map((entry) => normalizeDeckCardEntry(entry))
    .filter((entry): entry is DeckCardEntry => entry !== null)
  const sideboard = rawSideboard
    .map((entry) => normalizeDeckCardEntry(entry))
    .filter((entry): entry is DeckCardEntry => entry !== null)

  return {
    id: value.id,
    name: value.name,
    format:
      value.format === 'pioneer' ||
      value.format === 'modern' ||
      value.format === 'legacy' ||
      value.format === 'vintage' ||
      value.format === 'pauper' ||
      value.format === 'commander'
        ? value.format
        : 'standard',
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    mainboard,
    sideboard,
    notes: typeof value.notes === 'string' ? value.notes : '',
    matchupNotes: typeof value.matchupNotes === 'string' ? value.matchupNotes : '',
    budgetTargetUsd:
      isNullableNumber(value.budgetTargetUsd) && value.budgetTargetUsd !== undefined
        ? value.budgetTargetUsd
        : null,
  }
}

function readSavedDecks(): SavedDeck[] {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)

    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue) as unknown

    if (!Array.isArray(parsedValue)) {
      return []
    }

    const normalizedDecks = parsedValue
      .map((deck) => normalizeSavedDeck(deck))
      .filter((deck): deck is SavedDeck => deck !== null)

    return sortSavedDecks(normalizedDecks)
  } catch {
    return []
  }
}

function persistSavedDecks(savedDecks: SavedDeck[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDecks))
}

export function useSavedDecks() {
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>(() => readSavedDecks())

  function saveDeck(draft: DeckDraft): SavedDeck {
    const now = new Date().toISOString()
    let savedDeck: SavedDeck | undefined

    setSavedDecks((currentDecks) => {
      const existingDeck = draft.id
        ? currentDecks.find((deck) => deck.id === draft.id) ?? null
        : null

      savedDeck = {
        id: existingDeck?.id ?? crypto.randomUUID(),
        name: draft.name.trim() || 'Untitled Deck',
        format: draft.format,
        mainboard: draft.mainboard,
        sideboard: draft.sideboard,
        notes: draft.notes.trim(),
        matchupNotes: draft.matchupNotes.trim(),
        budgetTargetUsd: draft.budgetTargetUsd,
        createdAt: existingDeck?.createdAt ?? draft.createdAt ?? now,
        updatedAt: now,
      }

      const nextDecks = existingDeck
        ? currentDecks.map((deck) => (deck.id === existingDeck.id ? savedDeck! : deck))
        : [savedDeck, ...currentDecks]

      const orderedDecks = sortSavedDecks(nextDecks)
      persistSavedDecks(orderedDecks)
      return orderedDecks
    })

    if (!savedDeck) {
      throw new Error('Unable to save deck.')
    }

    return savedDeck
  }

  function deleteDeck(deckId: string) {
    setSavedDecks((currentDecks) => {
      const nextDecks = currentDecks.filter((deck) => deck.id !== deckId)
      persistSavedDecks(nextDecks)
      return nextDecks
    })
  }

  return {
    savedDecks,
    saveDeck,
    deleteDeck,
  }
}
function sortSavedDecks(savedDecks: SavedDeck[]): SavedDeck[] {
  return [...savedDecks].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}
