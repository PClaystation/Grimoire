import { lookupDeckCards } from '@/api/scryfall'
import type { DeckFormat } from '@/types/deck'
import { buildImportedDeck, getDeckImportIdentifiers, parseDeckImport } from '@/utils/deckImport'

export async function resolveImportedDeckInput(input: string, fallbackFormat: DeckFormat) {
  const parsedImport = parseDeckImport(input)
  const identifiers = getDeckImportIdentifiers(parsedImport)
  const resolvedCards = await lookupDeckCards(identifiers)
  return buildImportedDeck(parsedImport, resolvedCards, fallbackFormat)
}
