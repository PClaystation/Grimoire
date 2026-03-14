import type { DeckCardEntry, DeckValidationIssue } from '@/types/deck'
import { countDeckEntries } from '@/utils/format'

function isBasicLand(entry: DeckCardEntry): boolean {
  return entry.card.typeLine.includes('Basic Land')
}

function hasUnlimitedCopies(entry: DeckCardEntry): boolean {
  return entry.card.oracleText.includes('A deck can have any number of cards named')
}

export function getDeckValidationIssues(
  mainboard: DeckCardEntry[],
  sideboard: DeckCardEntry[],
): DeckValidationIssue[] {
  const issues: DeckValidationIssue[] = []
  const mainboardCount = countDeckEntries(mainboard)
  const sideboardCount = countDeckEntries(sideboard)

  if (mainboardCount === 0 && sideboardCount === 0) {
    return [
      {
        id: 'empty',
        severity: 'info',
        title: 'Start building',
        description: 'Add cards to the mainboard or sideboard to generate validation feedback.',
      },
    ]
  }

  if (mainboardCount < 60) {
    issues.push({
      id: 'mainboard-size',
      severity: 'error',
      title: 'Mainboard below 60 cards',
      description: `Your mainboard has ${mainboardCount} cards. Most constructed decks need at least 60.`,
    })
  }

  if (sideboardCount > 15) {
    issues.push({
      id: 'sideboard-limit',
      severity: 'error',
      title: 'Sideboard above 15 cards',
      description: `Your sideboard has ${sideboardCount} cards. Standard sideboards typically cap at 15.`,
    })
  }

  const combinedByOracle = [...mainboard, ...sideboard].reduce<
    Map<string, { name: string; quantity: number; exempt: boolean }>
  >((lookup, entry) => {
    const key = entry.card.oracleId ?? entry.card.name
    const existingEntry = lookup.get(key)

    if (existingEntry) {
      existingEntry.quantity += entry.quantity
      existingEntry.exempt = existingEntry.exempt || isBasicLand(entry) || hasUnlimitedCopies(entry)
      return lookup
    }

    lookup.set(key, {
      name: entry.card.name,
      quantity: entry.quantity,
      exempt: isBasicLand(entry) || hasUnlimitedCopies(entry),
    })
    return lookup
  }, new Map())

  const copyLimitViolations = [...combinedByOracle.values()].filter(
    (entry) => !entry.exempt && entry.quantity > 4,
  )

  if (copyLimitViolations.length > 0) {
    issues.push({
      id: 'copy-limit',
      severity: 'warning',
      title: 'Copy limit exceeded',
      description: copyLimitViolations
        .slice(0, 4)
        .map((entry) => `${entry.name} (${entry.quantity})`)
        .join(', '),
    })
  }

  const nonStandardCards = [...mainboard, ...sideboard]
    .filter((entry) => entry.card.legalities.standard !== 'legal')
    .map((entry) => entry.card.name)

  if (nonStandardCards.length > 0) {
    const uniqueNames = [...new Set(nonStandardCards)]
    issues.push({
      id: 'standard-legality',
      severity: 'warning',
      title: 'Contains non-Standard cards',
      description: uniqueNames.slice(0, 4).join(', '),
    })
  }

  if (mainboardCount >= 60 && sideboardCount <= 15 && issues.length === 0) {
    issues.push({
      id: 'healthy',
      severity: 'info',
      title: 'Deck structure looks valid',
      description: 'Mainboard size, sideboard size, and copy counts are currently in a healthy range.',
    })
  }

  return issues
}
