import { DECK_FORMAT_CONFIG } from '@/constants/mtg'
import type {
  DeckCardEntry,
  DeckFormat,
  DeckRecommendation,
  DeckStats,
} from '@/types/deck'

function getColorCount(mainboard: DeckCardEntry[]): number {
  const colors = new Set(mainboard.flatMap((entry) => entry.card.colorIdentity))
  return colors.size
}

export function getDeckRecommendations(
  mainboard: DeckCardEntry[],
  sideboard: DeckCardEntry[],
  stats: DeckStats,
  format: DeckFormat,
  budgetTargetUsd: number | null,
): DeckRecommendation[] {
  const recommendations: DeckRecommendation[] = []
  const formatConfig = DECK_FORMAT_CONFIG[format]
  const landCount = stats.mainboard.typeCounts.Land
  const averageManaValue = Number(stats.mainboard.averageManaValue)
  const colorCount = getColorCount(mainboard)

  if (stats.cardsToTarget > 0) {
    recommendations.push({
      id: 'finish-mainboard',
      tone: 'warning',
      title: 'Finish the mainboard first',
      description: `${formatConfig.label} wants ${formatConfig.recommendedMainboard} cards. You still have ${stats.cardsToTarget} slots open.`,
    })
  }

  if (mainboard.length > 0 && landCount < 22 && averageManaValue >= 2.7) {
    recommendations.push({
      id: 'land-count-low',
      tone: 'warning',
      title: 'Mana base looks light',
      description: `You only have ${landCount} lands with an average mana value of ${stats.mainboard.averageManaValue}. Consider adding lands or lower-curve cards.`,
    })
  }

  if (landCount >= 24 && averageManaValue <= 2.8 && colorCount <= 2) {
    recommendations.push({
      id: 'mana-base-stable',
      tone: 'success',
      title: 'Mana base looks stable',
      description: `${landCount} lands across ${Math.max(colorCount, 1)} colors is a healthy baseline for a curve around ${stats.mainboard.averageManaValue}.`,
    })
  }

  if (colorCount >= 4 && averageManaValue >= 3.2) {
    recommendations.push({
      id: 'mana-base-stretched',
      tone: 'info',
      title: 'Color requirements may be stretched',
      description: `A ${colorCount}-color deck with a ${stats.mainboard.averageManaValue} average mana value usually wants premium fixing and a disciplined curve.`,
    })
  }

  if (formatConfig.sideboardMax > 0 && sideboard.length > 0 && stats.sideboard.totalCards < 10) {
    recommendations.push({
      id: 'sideboard-space',
      tone: 'info',
      title: 'There is room to specialize the sideboard',
      description: `You are using ${stats.sideboard.totalCards} of ${formatConfig.sideboardMax} sideboard slots. Matchup-specific hate cards could sharpen the list.`,
    })
  }

  if (formatConfig.sideboardMax > 0 && stats.sideboard.totalCards === 0 && mainboard.length > 0) {
    recommendations.push({
      id: 'sideboard-empty',
      tone: 'info',
      title: 'Build a sideboard plan',
      description: 'Add sideboard cards for control, graveyard, aggro, and artifact or enchantment matchups.',
    })
  }

  if (budgetTargetUsd !== null && stats.totalEstimatedValueUsd <= budgetTargetUsd) {
    recommendations.push({
      id: 'budget-on-track',
      tone: 'success',
      title: 'Budget target is intact',
      description: `The list is currently under the ${budgetTargetUsd.toFixed(2)} USD target.`,
    })
  }

  if (recommendations.length === 0 && mainboard.length > 0) {
    recommendations.push({
      id: 'healthy-balance',
      tone: 'success',
      title: 'The shell is in a healthy range',
      description: 'The list has no obvious structural red flags based on curve, size, and budget.',
    })
  }

  return recommendations
}
