import { DECK_FORMAT_CONFIG } from '@/constants/mtg'
import type { DeckFormat, DeckRecommendation, DeckStats } from '@/types/deck'
import type { DeckRatingDetails } from '@/utils/deckRater'

interface RecommendationCandidate {
  priority: number
  item: DeckRecommendation
}

function pushRecommendation(
  candidates: RecommendationCandidate[],
  priority: number,
  item: DeckRecommendation,
) {
  candidates.push({ priority, item })
}

export function getDeckRecommendations(
  stats: Pick<DeckStats, 'totalEstimatedValueUsd'>,
  format: DeckFormat,
  budgetTargetUsd: number | null,
  ratingDetails: DeckRatingDetails,
): DeckRecommendation[] {
  const recommendations: RecommendationCandidate[] = []
  const formatConfig = DECK_FORMAT_CONFIG[format]
  const { profile, rating } = ratingDetails

  if (profile.mainboardCount === 0 && profile.sideboardCount === 0) {
    return [
      {
        id: 'start-building',
        tone: 'info',
        title: 'Add the shell first',
        description: `Start with mana, cheap plays, and a clear format target. ${formatConfig.label} decks become much easier to rate once the mainboard is mostly filled out.`,
      },
    ]
  }

  if (profile.mainboardCount < formatConfig.recommendedMainboard) {
    pushRecommendation(recommendations, 100, {
      id: 'finish-mainboard',
      tone: 'warning',
      title: 'Finish the mainboard before tuning',
      description: `${formatConfig.label} wants ${formatConfig.recommendedMainboard} cards. Fill the remaining ${formatConfig.recommendedMainboard - profile.mainboardCount} slots with mana, early plays, and interaction before judging smaller upgrades.`,
    })
  } else if (profile.mainboardCount > formatConfig.recommendedMainboard) {
    pushRecommendation(recommendations, 100, {
      id: 'trim-mainboard',
      tone: 'warning',
      title: 'Trim back to the minimum size',
      description: `You are at ${profile.mainboardCount} cards. Cut ${profile.mainboardCount - formatConfig.recommendedMainboard} of the weakest or most situational cards so your best draws happen more often.`,
    })
  }

  if (profile.illegalCardCount > 0) {
    pushRecommendation(recommendations, 98, {
      id: 'replace-illegal-cards',
      tone: 'warning',
      title: 'Replace off-format cards',
      description: `${profile.illegalCardNames.slice(0, 4).join(', ')}${profile.illegalCardCount > 4 ? ', and more' : ''} are not legal here. Fix those first so the rest of the rating reflects a real ${formatConfig.label} deck.`,
    })
  }

  if (profile.copyLimitViolationCount > 0) {
    pushRecommendation(recommendations, 96, {
      id: 'fix-copy-limits',
      tone: 'warning',
      title: 'Clean up copy-limit violations',
      description: `${profile.copyLimitViolationNames.slice(0, 4).join(', ')}${profile.copyLimitViolationCount > 4 ? ', and more' : ''} are above the format limit. Move excess copies into legal replacements or the sideboard.`,
    })
  }

  if (profile.landCount < profile.expectedLandRange.min) {
    pushRecommendation(recommendations, 94, {
      id: 'add-lands',
      tone: 'warning',
      title: 'Add more mana sources',
      description: `You only have ${profile.landCount} lands. This curve wants about ${profile.expectedLandRange.min}-${profile.expectedLandRange.max}. Add lands or real ramp and cut some slower spells.`,
    })
  } else if (profile.landCount > profile.expectedLandRange.max) {
    pushRecommendation(recommendations, 82, {
      id: 'trim-lands',
      tone: 'info',
      title: 'You can shave a few lands',
      description: `You are at ${profile.landCount} lands while this shell points closer to ${profile.expectedLandRange.min}-${profile.expectedLandRange.max}. Turn a couple of excess lands into threats, draw, or interaction.`,
    })
  }

  if (profile.expectedFixingMin > 0 && profile.fixingCount < profile.expectedFixingMin) {
    pushRecommendation(recommendations, 90, {
      id: 'improve-fixing',
      tone: 'warning',
      title: 'The colors need more fixing',
      description: `A ${Math.max(profile.colorCount, 1)}-color deck with this mana curve wants around ${profile.expectedFixingMin} fixing sources, but you only have ${profile.fixingCount}. Add dual lands, fetchable lands, land-ramp, or mana rocks that cover multiple colors.`,
    })
  }

  if (profile.earlyPlayCount < profile.expectedEarlyMin && profile.topEndCount > profile.topEndLimit) {
    pushRecommendation(recommendations, 88, {
      id: 'rebalance-curve',
      tone: 'warning',
      title: 'Rebalance the curve',
      description: `You have only ${profile.earlyPlayCount} cheap plays but ${profile.topEndCount} expensive spells. Shift 3-6 slots from the top end into one- and two-mana setup cards, threats, or interaction.`,
    })
  } else if (profile.earlyPlayCount < profile.expectedEarlyMin) {
    pushRecommendation(recommendations, 84, {
      id: 'more-early-plays',
      tone: 'warning',
      title: 'Increase the early game',
      description: `You are at ${profile.earlyPlayCount} cheap plays and this shell wants about ${profile.expectedEarlyMin}. Add more one- and two-mana cards that advance your plan or answer pressure.`,
    })
  } else if (profile.topEndCount > profile.topEndLimit) {
    const expensiveLabel = format === 'commander' ? '6+' : '5+'
    pushRecommendation(recommendations, 80, {
      id: 'trim-top-end',
      tone: 'info',
      title: 'Trim some expensive spells',
      description: `You are running ${profile.topEndCount} ${expensiveLabel} mana spells. Cut a few of the clunkiest ones until you are closer to ${profile.topEndLimit} so the deck stops stumbling in the opening turns.`,
    })
  }

  if (profile.interactionCount < profile.expectedInteractionRange.min) {
    pushRecommendation(recommendations, 78, {
      id: 'add-interaction',
      tone: 'warning',
      title: 'Add more interaction',
      description: `You only have ${profile.interactionCount} answer cards. Most ${formatConfig.label} decks want at least ${profile.expectedInteractionRange.min} so they can stop opposing engines instead of goldfishing.`,
    })
  }

  if (profile.cardFlowCount < profile.expectedCardFlowRange.min) {
    pushRecommendation(recommendations, 74, {
      id: 'add-card-flow',
      tone: 'info',
      title: 'Add more draw or selection',
      description: `You are at ${profile.cardFlowCount} card-flow pieces. Push that closer to ${profile.expectedCardFlowRange.min}-${profile.expectedCardFlowRange.max} so the deck finds lands, threats, and sideboard cards more reliably.`,
    })
  }

  if (
    profile.expectedRampRange &&
    profile.rampCount < profile.expectedRampRange.min
  ) {
    pushRecommendation(recommendations, 76, {
      id: 'add-ramp',
      tone: 'warning',
      title: 'Commander shells want more ramp',
      description: `You only have ${profile.rampCount} ramp pieces. Push toward ${profile.expectedRampRange.min}-${profile.expectedRampRange.max} with two-mana rocks, dorks, or land-ramp so the deck reaches its stronger turns on time.`,
    })
  }

  if (
    format !== 'commander' &&
    ratingDetails.factorRatios.consistency !== undefined &&
    ratingDetails.factorRatios.consistency < 0.75
  ) {
    pushRecommendation(recommendations, 68, {
      id: 'tighten-redundancy',
      tone: 'info',
      title: 'Cut more singletons',
      description: `${profile.oneOfCount} of your ${profile.nonlandUniqueCount} nonland slots are one-ofs. Turn the best cards into three- and four-ofs and cut the lowest-impact bullets so the deck does the same powerful thing every game.`,
    })
  }

  if (
    profile.expectedSideboardRange &&
    profile.sideboardCount < profile.expectedSideboardRange.min
  ) {
    pushRecommendation(recommendations, 60, {
      id: 'finish-sideboard',
      tone: 'info',
      title: 'Finish the sideboard plan',
      description: `You are using ${profile.sideboardCount} sideboard slots. Fill out the rest with matchup-specific cards for aggro, control, graveyards, and artifacts or enchantments.`,
    })
  }

  if (budgetTargetUsd !== null && stats.totalEstimatedValueUsd > budgetTargetUsd) {
    pushRecommendation(recommendations, 48, {
      id: 'budget-target',
      tone: 'info',
      title: 'The deck is above your budget target',
      description: `Estimated value is ${stats.totalEstimatedValueUsd.toFixed(2)} USD against a ${budgetTargetUsd.toFixed(2)} USD target. If budget matters, replace a few expensive staples without weakening the mana base.`,
    })
  }

  if (recommendations.length === 0) {
    pushRecommendation(recommendations, 20, {
      id: 'fundamentals-strong',
      tone: 'success',
      title: 'The fundamentals look strong',
      description:
        rating.score >= 85
          ? 'The shell is well-built on structure, mana, and curve. The next gains are matchup reps and targeted sideboard mapping.'
          : 'The shell is structurally healthy. Improvements from here are more about card quality and matchup tuning than basic deck construction.',
    })
  }

  return recommendations
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 6)
    .map((entry) => entry.item)
}
