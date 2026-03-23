import type { DeckCardEntry, DeckDraft, SavedDeck } from '@/types/deck'

export interface DeckDiffEntry {
  name: string
  leftQuantity: number
  rightQuantity: number
  delta: number
}

export interface DeckComparisonSummary {
  onlyInLeft: DeckDiffEntry[]
  onlyInRight: DeckDiffEntry[]
  quantityChanged: DeckDiffEntry[]
}

function sortDiffEntries(entries: DeckDiffEntry[]) {
  return [...entries].sort((left, right) => {
    const deltaDifference = Math.abs(right.delta) - Math.abs(left.delta)

    if (deltaDifference !== 0) {
      return deltaDifference
    }

    return left.name.localeCompare(right.name)
  })
}

function toEntryMap(entries: DeckCardEntry[]) {
  const entryMap = new Map<string, DeckDiffEntry>()

  for (const entry of entries) {
    const key = entry.card.oracleId ?? entry.card.name.toLowerCase()
    const existingEntry = entryMap.get(key)

    if (existingEntry) {
      existingEntry.leftQuantity += entry.quantity
      continue
    }

    entryMap.set(key, {
      name: entry.card.name,
      leftQuantity: entry.quantity,
      rightQuantity: 0,
      delta: 0,
    })
  }

  return entryMap
}

export function compareDeckSections(left: DeckCardEntry[], right: DeckCardEntry[]) {
  const diffMap = toEntryMap(left)

  for (const entry of right) {
    const key = entry.card.oracleId ?? entry.card.name.toLowerCase()
    const existingEntry = diffMap.get(key)

    if (existingEntry) {
      existingEntry.rightQuantity += entry.quantity
      continue
    }

    diffMap.set(key, {
      name: entry.card.name,
      leftQuantity: 0,
      rightQuantity: entry.quantity,
      delta: 0,
    })
  }

  const onlyInLeft: DeckDiffEntry[] = []
  const onlyInRight: DeckDiffEntry[] = []
  const quantityChanged: DeckDiffEntry[] = []

  for (const entry of diffMap.values()) {
    entry.delta = entry.rightQuantity - entry.leftQuantity

    if (entry.leftQuantity === 0 && entry.rightQuantity > 0) {
      onlyInRight.push(entry)
      continue
    }

    if (entry.rightQuantity === 0 && entry.leftQuantity > 0) {
      onlyInLeft.push(entry)
      continue
    }

    if (entry.leftQuantity !== entry.rightQuantity) {
      quantityChanged.push(entry)
    }
  }

  return {
    onlyInLeft: sortDiffEntries(onlyInLeft),
    onlyInRight: sortDiffEntries(onlyInRight),
    quantityChanged: sortDiffEntries(quantityChanged),
  } satisfies DeckComparisonSummary
}

export function buildDeckComparisonSummary(
  left: DeckDraft | SavedDeck,
  right: DeckDraft | SavedDeck,
) {
  return {
    mainboard: compareDeckSections(left.mainboard, right.mainboard),
    sideboard: compareDeckSections(left.sideboard, right.sideboard),
  }
}
