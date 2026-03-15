import { DECK_FORMAT_CONFIG } from '@/constants/mtg'
import type { DeckCardEntry, DeckFormat, DeckValidationIssue } from '@/types/deck'
import { countDeckEntries, formatUsdPrice } from '@/utils/format'

function isBasicLand(entry: DeckCardEntry): boolean {
  return entry.card.typeLine.includes('Basic Land')
}

function hasUnlimitedCopies(entry: DeckCardEntry): boolean {
  return entry.card.oracleText.includes('A deck can have any number of cards named')
}

export function getDeckValidationIssues(
  mainboard: DeckCardEntry[],
  sideboard: DeckCardEntry[],
  format: DeckFormat,
  budgetTargetUsd: number | null,
  totalEstimatedValueUsd: number,
): DeckValidationIssue[] {
  const issues: DeckValidationIssue[] = []
  const mainboardCount = countDeckEntries(mainboard)
  const sideboardCount = countDeckEntries(sideboard)
  const formatConfig = DECK_FORMAT_CONFIG[format]

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

  if (mainboardCount < formatConfig.minMainboard) {
    issues.push({
      id: 'mainboard-size',
      severity: 'error',
      title: `Mainboard below ${formatConfig.minMainboard} cards`,
      description: `${formatConfig.label} decks need at least ${formatConfig.minMainboard} mainboard cards. You currently have ${mainboardCount}.`,
    })
  }

  if (format === 'commander' && mainboardCount > formatConfig.recommendedMainboard) {
    issues.push({
      id: 'commander-size',
      severity: 'warning',
      title: 'Commander deck above 100 cards',
      description: `Commander decks are typically exactly 100 cards including the commander slot. You currently have ${mainboardCount} cards in the mainboard area.`,
    })
  }

  if (sideboardCount > formatConfig.sideboardMax) {
    issues.push({
      id: 'sideboard-limit',
      severity: 'error',
      title:
        formatConfig.sideboardMax === 0
          ? 'This format does not use a sideboard'
          : `Sideboard above ${formatConfig.sideboardMax} cards`,
      description:
        formatConfig.sideboardMax === 0
          ? `${formatConfig.label} decks do not usually use a sideboard. Move those ${sideboardCount} cards into the mainboard or notes.`
          : `Your sideboard has ${sideboardCount} cards. ${formatConfig.label} sideboards typically cap at ${formatConfig.sideboardMax}.`,
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
    (entry) => !entry.exempt && entry.quantity > formatConfig.copyLimit,
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

  const nonFormatCards = [...mainboard, ...sideboard]
    .filter((entry) => entry.card.legalities[formatConfig.legalityKey] !== 'legal')
    .map((entry) => entry.card.name)

  if (nonFormatCards.length > 0) {
    const uniqueNames = [...new Set(nonFormatCards)]
    issues.push({
      id: 'format-legality',
      severity: 'warning',
      title: `Contains non-${formatConfig.label} cards`,
      description: uniqueNames.slice(0, 4).join(', '),
    })
  }

  if (budgetTargetUsd !== null && totalEstimatedValueUsd > budgetTargetUsd) {
    issues.push({
      id: 'budget',
      severity: 'warning',
      title: 'Deck exceeds the budget target',
      description: `Estimated value ${formatUsdPrice(totalEstimatedValueUsd)} against a target of ${formatUsdPrice(
        budgetTargetUsd,
      )}.`,
    })
  }

  if (
    mainboardCount >= formatConfig.minMainboard &&
    sideboardCount <= formatConfig.sideboardMax &&
    issues.length === 0
  ) {
    issues.push({
      id: 'healthy',
      severity: 'info',
      title: 'Deck structure looks valid',
      description: `${formatConfig.label} size, sideboard, legality, and copy limits are currently in a healthy range.`,
    })
  }

  return issues
}
