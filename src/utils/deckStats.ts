import { DECK_TYPE_BUCKETS, MANA_CURVE_LABELS } from '@/constants/mtg'
import type {
  DeckCardEntry,
  DeckColorStatKey,
  DeckSectionStats,
  DeckStats,
  DeckTypeStatKey,
} from '@/types/deck'
import { getDeckValidationIssues } from '@/utils/deckValidation'
import { countDeckEntries, getCardMarketPriceUsd } from '@/utils/format'

function createColorCounts(): Record<DeckColorStatKey, number> {
  return {
    W: 0,
    U: 0,
    B: 0,
    R: 0,
    G: 0,
    C: 0,
  }
}

function createTypeCounts(): Record<DeckTypeStatKey, number> {
  return DECK_TYPE_BUCKETS.reduce<Record<DeckTypeStatKey, number>>(
    (counts, type) => {
      counts[type] = 0
      return counts
    },
    {
      Creature: 0,
      Instant: 0,
      Sorcery: 0,
      Artifact: 0,
      Enchantment: 0,
      Planeswalker: 0,
      Land: 0,
      Battle: 0,
      Other: 0,
    },
  )
}

function resolveTypeBucket(typeLine: string): DeckTypeStatKey {
  const matchedType = DECK_TYPE_BUCKETS.find(
    (type) => type !== 'Other' && typeLine.includes(type),
  )

  return matchedType ?? 'Other'
}

function getSectionStats(entries: DeckCardEntry[]): DeckSectionStats {
  const colorCounts = createColorCounts()
  const typeCounts = createTypeCounts()
  const manaCurveMap = MANA_CURVE_LABELS.reduce<Record<string, number>>((curve, label) => {
    curve[label] = 0
    return curve
  }, {})

  let totalCards = 0
  let manaValueSum = 0
  let estimatedValueUsd = 0
  let pricedCards = 0

  for (const entry of entries) {
    const { card, quantity } = entry
    totalCards += quantity
    manaValueSum += card.manaValue * quantity

    const marketPriceUsd = getCardMarketPriceUsd(card)
    if (marketPriceUsd !== null) {
      estimatedValueUsd += marketPriceUsd * quantity
      pricedCards += quantity
    }

    const bucket = resolveTypeBucket(card.typeLine)
    typeCounts[bucket] += quantity

    const curveLabel = card.manaValue >= 7 ? '7+' : String(Math.max(0, Math.floor(card.manaValue)))
    manaCurveMap[curveLabel] += quantity

    if (card.colors.length === 0) {
      colorCounts.C += quantity
      continue
    }

    for (const color of card.colors) {
      colorCounts[color] += quantity
    }
  }

  return {
    totalCards,
    uniqueCards: entries.length,
    averageManaValue: totalCards > 0 ? (manaValueSum / totalCards).toFixed(2) : '0.00',
    estimatedValueUsd,
    pricedCards,
    colorCounts,
    typeCounts,
    manaCurve: MANA_CURVE_LABELS.map((label) => ({
      label,
      count: manaCurveMap[label],
    })),
  }
}

export function getDeckStats(mainboard: DeckCardEntry[], sideboard: DeckCardEntry[]): DeckStats {
  const mainboardStats = getSectionStats(mainboard)
  const sideboardStats = getSectionStats(sideboard)

  return {
    mainboard: mainboardStats,
    sideboard: sideboardStats,
    cardsToSixty: Math.max(0, 60 - countDeckEntries(mainboard)),
    sideboardSlotsLeft: Math.max(0, 15 - countDeckEntries(sideboard)),
    totalEstimatedValueUsd:
      mainboardStats.estimatedValueUsd + sideboardStats.estimatedValueUsd,
    validation: getDeckValidationIssues(mainboard, sideboard),
  }
}
