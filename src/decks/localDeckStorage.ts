import type { DeckCardEntry, DeckDraft, SavedDeck } from '@/types/deck'
import type { MagicCard } from '@/types/scryfall'

const LEGACY_STORAGE_KEY = 'grimoire.saved-decks.v1'
const LOCAL_STORAGE_KEY = 'grimoire.saved-decks.local.v1'
const CLOUD_STORAGE_KEY_PREFIX = 'grimoire.saved-decks.cloud.v1'
const PENDING_IMPORT_STORAGE_KEY_PREFIX = 'grimoire.saved-decks.pending.v1'
const SYNC_STATUS_KEY = 'grimoire.saved-decks.sync-status.v1'

interface SyncStatusState {
  [continentalId: string]: {
    lastSyncedAt: string | null
  }
}

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

function readStorageValue(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function removeStorageValue(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage removal failures and keep the existing data in place.
  }
}

function writeStorageValue(key: string, value: string, strict: boolean) {
  try {
    window.localStorage.setItem(key, value)
  } catch (error) {
    if (strict) {
      throw error
    }
  }
}

export function sortSavedDecks(savedDecks: SavedDeck[]) {
  return [...savedDecks].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function parseSavedDecks(rawValue: string | null) {
  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return sortSavedDecks(
      parsedValue
        .map((deck) => normalizeSavedDeck(deck))
        .filter((deck): deck is SavedDeck => deck !== null),
    )
  } catch {
    return []
  }
}

function buildCloudStorageKey(continentalId: string) {
  return `${CLOUD_STORAGE_KEY_PREFIX}:${encodeURIComponent(continentalId.trim())}`
}

function buildPendingImportStorageKey(continentalId: string) {
  return `${PENDING_IMPORT_STORAGE_KEY_PREFIX}:${encodeURIComponent(continentalId.trim())}`
}

function getSyncedAccountIds() {
  return Object.keys(readSyncStatusState())
    .map((value) => value.trim())
    .filter(Boolean)
}

export function readLocalSavedDecks() {
  const localDecks = parseSavedDecks(readStorageValue(LOCAL_STORAGE_KEY))
  if (localDecks !== null) {
    return localDecks
  }

  const legacyDecks = parseSavedDecks(readStorageValue(LEGACY_STORAGE_KEY))
  if (legacyDecks === null) {
    return []
  }

  if (getSyncedAccountIds().length === 0) {
    return legacyDecks
  }

  return []
}

export function readCloudCachedDecks(continentalId: string) {
  const normalizedId = continentalId.trim()
  if (!normalizedId) {
    return []
  }

  const cloudDecks = parseSavedDecks(readStorageValue(buildCloudStorageKey(normalizedId)))
  if (cloudDecks !== null) {
    return cloudDecks
  }

  const legacyDecks = parseSavedDecks(readStorageValue(LEGACY_STORAGE_KEY))
  const syncedAccountIds = getSyncedAccountIds()

  if (legacyDecks !== null && syncedAccountIds.length === 1 && syncedAccountIds[0] === normalizedId) {
    persistCloudCachedDecks(normalizedId, legacyDecks)
    removeStorageValue(LEGACY_STORAGE_KEY)
    return legacyDecks
  }

  return []
}

export function persistLocalSavedDecks(savedDecks: SavedDeck[], options?: { strict?: boolean }) {
  try {
    writeStorageValue(LOCAL_STORAGE_KEY, JSON.stringify(savedDecks), options?.strict === true)
  } catch {
    throw new Error('Unable to update local storage in this browser.')
  }
}

export function persistCloudCachedDecks(
  continentalId: string,
  savedDecks: SavedDeck[],
  options?: { strict?: boolean },
) {
  const normalizedId = continentalId.trim()
  if (!normalizedId) {
    return
  }

  try {
    writeStorageValue(
      buildCloudStorageKey(normalizedId),
      JSON.stringify(savedDecks),
      options?.strict === true,
    )
  } catch {
    throw new Error('Unable to update local storage in this browser.')
  }
}

export function readPendingDeckImports(continentalId: string) {
  const normalizedId = continentalId.trim()
  if (!normalizedId) {
    return []
  }

  return parseSavedDecks(readStorageValue(buildPendingImportStorageKey(normalizedId))) ?? []
}

export function persistPendingDeckImports(
  continentalId: string,
  savedDecks: SavedDeck[],
  options?: { strict?: boolean },
) {
  const normalizedId = continentalId.trim()
  if (!normalizedId) {
    return
  }

  try {
    writeStorageValue(
      buildPendingImportStorageKey(normalizedId),
      JSON.stringify(savedDecks),
      options?.strict === true,
    )
  } catch {
    throw new Error('Unable to update local storage in this browser.')
  }
}

export function buildSavedDeckFromDraft(draft: DeckDraft, currentDecks: SavedDeck[]) {
  const now = new Date().toISOString()
  const existingDeck = draft.id ? currentDecks.find((deck) => deck.id === draft.id) ?? null : null

  return {
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
  } satisfies SavedDeck
}

export function upsertSavedDeck(savedDeck: SavedDeck, currentDecks: SavedDeck[]) {
  const nextDecks = currentDecks.some((deck) => deck.id === savedDeck.id)
    ? currentDecks.map((deck) => (deck.id === savedDeck.id ? savedDeck : deck))
    : [savedDeck, ...currentDecks]

  return sortSavedDecks(nextDecks)
}

export function removeSavedDeck(deckId: string, currentDecks: SavedDeck[]) {
  return currentDecks.filter((deck) => deck.id !== deckId)
}

function readSyncStatusState(): SyncStatusState {
  const rawValue = readStorageValue(SYNC_STATUS_KEY)

  if (!rawValue) {
    return {}
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown
    return isRecord(parsedValue) ? (parsedValue as SyncStatusState) : {}
  } catch {
    return {}
  }
}

export function readDeckSyncStatus(continentalId: string) {
  const normalizedId = continentalId.trim()
  if (!normalizedId) {
    return {
      lastSyncedAt: null,
    }
  }

  const state = readSyncStatusState()
  const entry = isRecord(state[normalizedId]) ? state[normalizedId] : null

  return {
    lastSyncedAt: typeof entry?.lastSyncedAt === 'string' ? entry.lastSyncedAt : null,
  }
}

export function persistDeckSyncStatus(
  continentalId: string,
  lastSyncedAt: string | null,
  options?: { strict?: boolean },
) {
  const normalizedId = continentalId.trim()
  if (!normalizedId) {
    return
  }

  const state = readSyncStatusState()
  state[normalizedId] = {
    lastSyncedAt,
  }

  writeStorageValue(SYNC_STATUS_KEY, JSON.stringify(state), options?.strict === true)
}
