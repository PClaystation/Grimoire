import type { DeckCardEntry } from '../types/deck.js'
import type { MagicCard } from '../types/scryfall.js'

export interface CardInstance {
  instanceId: string
  ownerPlayerId: string
  card: MagicCard
}

export function expandDeckEntries(entries: DeckCardEntry[], ownerPlayerId: string): CardInstance[] {
  return entries.flatMap((entry) =>
    Array.from({ length: entry.quantity }, () => ({
      instanceId: crypto.randomUUID(),
      ownerPlayerId,
      card: entry.card,
    })),
  )
}

export function shuffleCardInstances<CardType>(
  cards: CardType[],
  randomSource: () => number = Math.random,
) {
  const shuffled = [...cards]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(randomSource() * (index + 1))
    ;[shuffled[index], shuffled[targetIndex]] = [shuffled[targetIndex], shuffled[index]]
  }

  return shuffled
}
