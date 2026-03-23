import { DECK_FORMAT_CONFIG } from '@/constants/mtg'
import type { DeckCardEntry, DeckFormat, DeckRating, DeckRatingFactor } from '@/types/deck'
import { countDeckEntries } from '@/utils/format'

interface DeckRoleSummary {
  producesMana: boolean
  fixesMana: boolean
  interaction: boolean
  sweeper: boolean
  cardFlow: boolean
}

export interface DeckRaterProfile {
  mainboardCount: number
  sideboardCount: number
  nonlandCount: number
  nonlandUniqueCount: number
  landCount: number
  colorCount: number
  spellAverageManaValue: number
  fixingCount: number
  rampCount: number
  interactionCount: number
  sweeperCount: number
  cardFlowCount: number
  earlyPlayCount: number
  topEndCount: number
  oneOfCount: number
  highCopyCount: number
  illegalCardCount: number
  illegalCardNames: string[]
  copyLimitViolationCount: number
  copyLimitViolationNames: string[]
  expectedLandRange: { min: number; max: number }
  expectedFixingMin: number
  expectedInteractionRange: { min: number; max: number }
  expectedCardFlowRange: { min: number; max: number }
  expectedEarlyMin: number
  topEndLimit: number
  expectedRampRange: { min: number; max: number } | null
  expectedSideboardRange: { min: number; max: number } | null
}

export interface DeckRatingDetails {
  rating: DeckRating
  factorRatios: Record<string, number>
  profile: DeckRaterProfile
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function normalizeRulesText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function getColorCount(mainboard: DeckCardEntry[]): number {
  const colors = new Set(
    mainboard
      .filter((entry) => !entry.card.typeLine.includes('Land'))
      .flatMap((entry) => (entry.card.colorIdentity.length > 0 ? entry.card.colorIdentity : entry.card.colors)),
  )

  return colors.size
}

function isBasicLand(entry: DeckCardEntry): boolean {
  return entry.card.typeLine.includes('Basic Land')
}

function hasUnlimitedCopies(entry: DeckCardEntry): boolean {
  return entry.card.oracleText.includes('A deck can have any number of cards named')
}

function classifyDeckRole(entry: DeckCardEntry): DeckRoleSummary {
  const isLand = entry.card.typeLine.includes('Land')
  const text = normalizeRulesText(entry.card.oracleText)
  const hasAnyColorText =
    text.includes('mana of any color') ||
    text.includes('add one mana of any color') ||
    text.includes('one mana of any color')
  const manaAbility = /add \{[wubrgcx]/.test(text)
  const landSearch = /search your library .* land card/.test(text)
  const typedLandSearch = /search your library .* (plains|island|swamp|mountain|forest)/.test(text)
  const extraLandDrop = text.includes('play an additional land')
  const landPutIntoPlay =
    /put (?:a|an|up to one|up to two|two) land card.*onto the battlefield/.test(text) ||
    /put a land card from your hand onto the battlefield/.test(text)
  const treasureText = /create .* treasure token/.test(text)

  const counterspell = text.includes('counter target spell')
  const sacrificeEffect =
    /target opponent sacrifices/.test(text) || /each opponent sacrifices/.test(text)
  const discardEffect =
    /target player discards/.test(text) || /each opponent discards/.test(text)
  const targetedRemoval =
    /(destroy|exile) target (?!.*you control)/.test(text) ||
    /return target (?:spell|nonland permanent|permanent|creature|artifact|enchantment|planeswalker|battle).* to (?:its owner's )?hand/.test(
      text,
    ) ||
    /target .* gets -\d+\/-\d+/.test(text) ||
    /fight target/.test(text) ||
    /deals? (?:x|\d+) damage to target (?:creature|planeswalker|battle|player|opponent|any target)/.test(
      text,
    )
  const sweeper =
    /(destroy|exile) all (?:artifacts|creatures|enchantments|planeswalkers|permanents)/.test(
      text,
    ) ||
    /return all .* to (?:their owners'|its owner's) hand/.test(text) ||
    /each creature gets -\d+\/-\d+/.test(text) ||
    /deals? (?:x|\d+) damage to each creature/.test(text)

  const cardFlow =
    /draw (?:a|an|one|two|three|four|five|x|\d+) cards?/.test(text) ||
    /scry \d+/.test(text) ||
    /surveil \d+/.test(text) ||
    /look at the top \d+ cards?/.test(text) ||
    text.includes('connive') ||
    text.includes('discover ') ||
    text.includes('investigate') ||
    text.includes('cycling ') ||
    text.includes('learn')

  const producesMana = !isLand && (manaAbility || landSearch || typedLandSearch || extraLandDrop || landPutIntoPlay || treasureText)
  const fixesMana =
    (isLand && (entry.card.colorIdentity.length >= 2 || hasAnyColorText)) ||
    (!isLand &&
      (hasAnyColorText ||
        typedLandSearch ||
        (manaAbility && entry.card.colorIdentity.length >= 2) ||
        landSearch))

  return {
    producesMana,
    fixesMana,
    interaction: counterspell || sacrificeEffect || discardEffect || targetedRemoval || sweeper,
    sweeper,
    cardFlow,
  }
}

function getScoreWithinRange(
  value: number,
  idealMin: number,
  idealMax: number,
  zeroDistance: number,
): number {
  if (value >= idealMin && value <= idealMax) {
    return 1
  }

  const distance = value < idealMin ? idealMin - value : value - idealMax
  return clamp01(1 - distance / Math.max(zeroDistance, 1))
}

function getScoreAtLeast(value: number, target: number, zeroValue = 0): number {
  if (value >= target) {
    return 1
  }

  return clamp01((value - zeroValue) / Math.max(target - zeroValue, 1))
}

function getScoreAtMost(value: number, target: number, zeroValue: number): number {
  if (value <= target) {
    return 1
  }

  return clamp01(1 - (value - target) / Math.max(zeroValue - target, 1))
}

function getExpectedLandRange(
  format: DeckFormat,
  spellAverageManaValue: number,
  colorCount: number,
  rampCount: number,
): { min: number; max: number } {
  if (format === 'commander') {
    let target = 36

    if (spellAverageManaValue >= 3.4) {
      target += 1
    }

    if (spellAverageManaValue >= 3.9) {
      target += 1
    }

    if (colorCount >= 3) {
      target += 1
    }

    if (colorCount >= 4) {
      target += 1
    }

    target -= Math.min(2, Math.floor(Math.max(rampCount - 4, 0) / 4))
    target = clamp(target, 34, 40)

    return {
      min: Math.max(32, target - 2),
      max: Math.min(42, target + 2),
    }
  }

  let target = 23

  if (spellAverageManaValue >= 2.7) {
    target += 1
  }

  if (spellAverageManaValue >= 3.2) {
    target += 1
  }

  if (spellAverageManaValue <= 1.9 && spellAverageManaValue > 0) {
    target -= 1
  }

  if (colorCount >= 3) {
    target += 1
  }

  if (colorCount >= 4) {
    target += 1
  }

  target -= Math.min(2, Math.floor(Math.max(rampCount - 1, 0) / 4))
  target = clamp(target, 20, 28)

  return {
    min: Math.max(18, target - 1),
    max: Math.min(30, target + 2),
  }
}

function getExpectedFixingMin(format: DeckFormat, colorCount: number): number {
  if (colorCount <= 2) {
    return 0
  }

  if (format === 'commander') {
    if (colorCount === 3) {
      return 12
    }

    if (colorCount === 4) {
      return 16
    }

    return 20
  }

  if (colorCount === 3) {
    return 8
  }

  if (colorCount === 4) {
    return 12
  }

  return 14
}

function getExpectedInteractionRange(format: DeckFormat): { min: number; max: number } {
  return format === 'commander' ? { min: 8, max: 18 } : { min: 6, max: 14 }
}

function getExpectedCardFlowRange(format: DeckFormat): { min: number; max: number } {
  return format === 'commander' ? { min: 8, max: 16 } : { min: 4, max: 10 }
}

function getExpectedEarlyMin(format: DeckFormat, spellAverageManaValue: number): number {
  if (format === 'commander') {
    if (spellAverageManaValue >= 3.8) {
      return 12
    }

    if (spellAverageManaValue >= 3.3) {
      return 14
    }

    return 16
  }

  if (spellAverageManaValue >= 3.3) {
    return 10
  }

  if (spellAverageManaValue >= 2.8) {
    return 12
  }

  if (spellAverageManaValue >= 2.2) {
    return 14
  }

  return 16
}

function getTopEndLimit(format: DeckFormat, spellAverageManaValue: number): number {
  if (format === 'commander') {
    if (spellAverageManaValue >= 4) {
      return 22
    }

    if (spellAverageManaValue >= 3.4) {
      return 18
    }

    return 14
  }

  if (spellAverageManaValue >= 3.3) {
    return 12
  }

  if (spellAverageManaValue >= 2.8) {
    return 10
  }

  if (spellAverageManaValue >= 2.2) {
    return 8
  }

  return 6
}

function getCommanderRampRange(): { min: number; max: number } {
  return { min: 8, max: 14 }
}

function getSideboardRange(format: DeckFormat): { min: number; max: number } | null {
  return DECK_FORMAT_CONFIG[format].sideboardMax > 0 ? { min: 12, max: 15 } : null
}

function createProfile(mainboard: DeckCardEntry[], sideboard: DeckCardEntry[], format: DeckFormat): DeckRaterProfile {
  const formatConfig = DECK_FORMAT_CONFIG[format]
  const combinedByOracle = new Map<string, { name: string; quantity: number; exempt: boolean }>()
  const illegalCardNames = new Set<string>()
  const colorCount = getColorCount(mainboard)

  let nonlandCount = 0
  let nonlandUniqueCount = 0
  let spellManaValueTotal = 0
  let landCount = 0
  let fixingCount = 0
  let rampCount = 0
  let interactionCount = 0
  let sweeperCount = 0
  let cardFlowCount = 0
  let earlyPlayCount = 0
  let oneOfCount = 0
  let highCopyCount = 0

  for (const entry of [...mainboard, ...sideboard]) {
    const key = entry.card.oracleId ?? entry.card.name
    const existingEntry = combinedByOracle.get(key)

    if (existingEntry) {
      existingEntry.quantity += entry.quantity
      existingEntry.exempt = existingEntry.exempt || isBasicLand(entry) || hasUnlimitedCopies(entry)
    } else {
      combinedByOracle.set(key, {
        name: entry.card.name,
        quantity: entry.quantity,
        exempt: isBasicLand(entry) || hasUnlimitedCopies(entry),
      })
    }

    if (entry.card.legalities[formatConfig.legalityKey] !== 'legal') {
      illegalCardNames.add(entry.card.name)
    }
  }

  for (const entry of mainboard) {
    const isLand = entry.card.typeLine.includes('Land')
    const roles = classifyDeckRole(entry)

    if (isLand) {
      landCount += entry.quantity

      if (roles.fixesMana) {
        fixingCount += entry.quantity
      }

      continue
    }

    nonlandCount += entry.quantity
    nonlandUniqueCount += 1
    spellManaValueTotal += entry.card.manaValue * entry.quantity

    if (roles.producesMana) {
      rampCount += entry.quantity
    }

    if (roles.fixesMana) {
      fixingCount += entry.quantity
    }

    if (roles.interaction) {
      interactionCount += entry.quantity
    }

    if (roles.sweeper) {
      sweeperCount += entry.quantity
    }

    if (roles.cardFlow) {
      cardFlowCount += entry.quantity
    }

    if (entry.card.manaValue <= 2) {
      earlyPlayCount += entry.quantity
    }

    if (entry.quantity === 1) {
      oneOfCount += 1
    }

    if (entry.quantity >= 3) {
      highCopyCount += 1
    }
  }

  const spellAverageManaValue =
    nonlandCount > 0 ? spellManaValueTotal / nonlandCount : 0
  const topEndThreshold = format === 'commander' ? 6 : 5
  const topEndCount = mainboard.reduce((total, entry) => {
    if (entry.card.typeLine.includes('Land') || entry.card.manaValue < topEndThreshold) {
      return total
    }

    return total + entry.quantity
  }, 0)

  const copyLimitViolations = [...combinedByOracle.values()].filter(
    (entry) => !entry.exempt && entry.quantity > formatConfig.copyLimit,
  )

  return {
    mainboardCount: countDeckEntries(mainboard),
    sideboardCount: countDeckEntries(sideboard),
    nonlandCount,
    nonlandUniqueCount,
    landCount,
    colorCount,
    spellAverageManaValue,
    fixingCount,
    rampCount,
    interactionCount,
    sweeperCount,
    cardFlowCount,
    earlyPlayCount,
    topEndCount,
    oneOfCount,
    highCopyCount,
    illegalCardCount: illegalCardNames.size,
    illegalCardNames: [...illegalCardNames],
    copyLimitViolationCount: copyLimitViolations.length,
    copyLimitViolationNames: copyLimitViolations.map((entry) => entry.name),
    expectedLandRange: getExpectedLandRange(format, spellAverageManaValue, colorCount, rampCount),
    expectedFixingMin: getExpectedFixingMin(format, colorCount),
    expectedInteractionRange: getExpectedInteractionRange(format),
    expectedCardFlowRange: getExpectedCardFlowRange(format),
    expectedEarlyMin: getExpectedEarlyMin(format, spellAverageManaValue),
    topEndLimit: getTopEndLimit(format, spellAverageManaValue),
    expectedRampRange: format === 'commander' ? getCommanderRampRange() : null,
    expectedSideboardRange: getSideboardRange(format),
  }
}

function buildFactor(
  id: string,
  label: string,
  maxScore: number,
  ratio: number,
  summary: string,
): DeckRatingFactor {
  return {
    id,
    label,
    score: Math.round(maxScore * ratio),
    maxScore,
    summary,
  }
}

function getStructureSummary(profile: DeckRaterProfile, format: DeckFormat): string {
  const targetMainboard = DECK_FORMAT_CONFIG[format].recommendedMainboard

  if (profile.mainboardCount === 0 && profile.sideboardCount === 0) {
    return 'Add cards before the rating can say anything meaningful.'
  }

  if (profile.mainboardCount !== targetMainboard) {
    return `Mainboard wants ${targetMainboard} cards; you currently have ${profile.mainboardCount}.`
  }

  if (profile.illegalCardCount > 0) {
    return `${profile.illegalCardCount} off-format cards need to become legal replacements.`
  }

  if (profile.copyLimitViolationCount > 0) {
    return 'Copy limits are being exceeded and need cleanup.'
  }

  return 'Size, legality, and copy rules are in a healthy range.'
}

function getManaSummary(profile: DeckRaterProfile): string {
  if (profile.landCount < profile.expectedLandRange.min) {
    return `You are short on lands for this curve. Aim for about ${profile.expectedLandRange.min}-${profile.expectedLandRange.max}.`
  }

  if (profile.landCount > profile.expectedLandRange.max) {
    return `You can trim lands or raise the spell quality. About ${profile.expectedLandRange.min}-${profile.expectedLandRange.max} is the cleaner range.`
  }

  if (profile.expectedFixingMin > 0 && profile.fixingCount < profile.expectedFixingMin) {
    return `Your color spread wants more fixing. You are at ${profile.fixingCount}; aim for at least ${profile.expectedFixingMin}.`
  }

  return 'Land count and fixing are supporting the deck cleanly.'
}

function getCurveSummary(profile: DeckRaterProfile, format: DeckFormat): string {
  const topEndThreshold = format === 'commander' ? '6+' : '5+'

  if (profile.earlyPlayCount < profile.expectedEarlyMin && profile.topEndCount > profile.topEndLimit) {
    return `The curve is back-heavy: only ${profile.earlyPlayCount} cheap plays and ${profile.topEndCount} ${topEndThreshold} spells.`
  }

  if (profile.earlyPlayCount < profile.expectedEarlyMin) {
    return `Add more one- and two-mana plays. You are at ${profile.earlyPlayCount}; this shell wants about ${profile.expectedEarlyMin}.`
  }

  if (profile.topEndCount > profile.topEndLimit) {
    return `The top end is crowded with ${profile.topEndCount} ${topEndThreshold} spells. Trim toward ${profile.topEndLimit}.`
  }

  return 'The curve gives the deck enough early turns without overloading the top end.'
}

function getInteractionSummary(profile: DeckRaterProfile): string {
  if (profile.interactionCount < profile.expectedInteractionRange.min) {
    return `Interaction is light at ${profile.interactionCount}. Aim for at least ${profile.expectedInteractionRange.min}.`
  }

  return 'The deck has enough interaction to avoid folding to opposing plans.'
}

function getCardFlowSummary(profile: DeckRaterProfile): string {
  if (profile.cardFlowCount < profile.expectedCardFlowRange.min) {
    return `Card draw and selection are thin at ${profile.cardFlowCount}. Aim for about ${profile.expectedCardFlowRange.min}-${profile.expectedCardFlowRange.max}.`
  }

  return 'Card flow looks healthy enough to keep the deck from stalling.'
}

function getConsistencySummary(profile: DeckRaterProfile): string {
  if (profile.nonlandUniqueCount === 0) {
    return 'Add more nonland spells to evaluate consistency.'
  }

  const singletonRatio = profile.oneOfCount / profile.nonlandUniqueCount

  if (singletonRatio > 0.5) {
    return `Too many one-ofs are dragging consistency. ${profile.oneOfCount} of ${profile.nonlandUniqueCount} nonland slots are singletons.`
  }

  if (profile.highCopyCount < 4) {
    return 'Turn more of the best cards into three- and four-ofs to make the deck more reliable.'
  }

  return 'The list has a consistent level of redundancy for a 60-card shell.'
}

function getSideboardSummary(profile: DeckRaterProfile): string {
  if (!profile.expectedSideboardRange) {
    return 'This format does not score sideboard space.'
  }

  if (profile.sideboardCount === 0) {
    return 'There is no sideboard yet, so post-board games are underprepared.'
  }

  if (profile.sideboardCount < profile.expectedSideboardRange.min) {
    return `Finish the sideboard. You have ${profile.sideboardCount} cards and the healthy zone is ${profile.expectedSideboardRange.min}-${profile.expectedSideboardRange.max}.`
  }

  return 'The sideboard has enough space to support real matchup plans.'
}

function getRampSummary(profile: DeckRaterProfile): string {
  if (!profile.expectedRampRange) {
    return 'Ramp is not a dedicated scoring bucket in this format.'
  }

  if (profile.rampCount < profile.expectedRampRange.min) {
    return `Ramp is light at ${profile.rampCount}. Commander shells usually want about ${profile.expectedRampRange.min}-${profile.expectedRampRange.max}.`
  }

  return 'Ramp density is giving the deck enough ways to advance its mana.'
}

function getScoreLabel(score: number): string {
  if (score >= 90) {
    return 'Tuned'
  }

  if (score >= 78) {
    return 'Strong'
  }

  if (score >= 63) {
    return 'Solid'
  }

  if (score >= 45) {
    return 'Playable'
  }

  if (score >= 25) {
    return 'Rough Draft'
  }

  return 'Unbuilt'
}

function getScoreSummary(score: number, weakestFactor: DeckRatingFactor | null): string {
  if (score <= 10) {
    return 'This is still a draft shell. Add enough cards to establish a real mana base and curve.'
  }

  if (score >= 90) {
    return weakestFactor
      ? `Very strong deck fundamentals. The smallest remaining drag is ${weakestFactor.label.toLowerCase()}.`
      : 'Very strong deck fundamentals across the board.'
  }

  if (score >= 78) {
    return weakestFactor
      ? `The shell is strong. The biggest remaining gains are in ${weakestFactor.label.toLowerCase()}.`
      : 'The shell is strong with only minor cleanup left.'
  }

  if (score >= 63) {
    return weakestFactor
      ? `The list is functional, but ${weakestFactor.label.toLowerCase()} is holding it back from feeling tuned.`
      : 'The list is functional with a few clear upgrade paths.'
  }

  if (score >= 45) {
    return weakestFactor
      ? `The deck has a plan, but ${weakestFactor.label.toLowerCase()} is still inconsistent.`
      : 'The deck has a plan, but the fundamentals are not stable yet.'
  }

  return weakestFactor
    ? `Major structural problems are dragging the deck down, starting with ${weakestFactor.label.toLowerCase()}.`
    : 'Major structural problems are dragging the deck down.'
}

export function getDeckRating(
  mainboard: DeckCardEntry[],
  sideboard: DeckCardEntry[],
  format: DeckFormat,
): DeckRatingDetails {
  const profile = createProfile(mainboard, sideboard, format)
  const factorRatios: Record<string, number> = {}
  const factors: DeckRatingFactor[] = []

  const structureSizeScore =
    format === 'commander'
      ? getScoreWithinRange(profile.mainboardCount, 100, 100, 15)
      : getScoreWithinRange(profile.mainboardCount, 60, 60, 10)
  const structureLegalityScore = getScoreAtMost(profile.illegalCardCount, 0, 6)
  const structureCopyScore = getScoreAtMost(
    profile.copyLimitViolationCount,
    0,
    format === 'commander' ? 4 : 3,
  )
  const sideboardOverflow = Math.max(0, profile.sideboardCount - DECK_FORMAT_CONFIG[format].sideboardMax)
  const structureSideboardScore = getScoreAtMost(
    sideboardOverflow,
    0,
    Math.max(DECK_FORMAT_CONFIG[format].sideboardMax, 4),
  )
  const structureRatio =
    format === 'commander'
      ? 0.6 * structureSizeScore + 0.25 * structureLegalityScore + 0.15 * structureCopyScore
      : 0.5 * structureSizeScore +
        0.25 * structureLegalityScore +
        0.1 * structureCopyScore +
        0.15 * structureSideboardScore

  const landScore = getScoreWithinRange(
    profile.landCount,
    profile.expectedLandRange.min,
    profile.expectedLandRange.max,
    format === 'commander' ? 12 : 8,
  )
  const fixingScore =
    profile.expectedFixingMin === 0
      ? 1
      : getScoreAtLeast(
          profile.fixingCount,
          profile.expectedFixingMin,
          Math.max(0, profile.expectedFixingMin - 8),
        )
  const manaRatio =
    profile.expectedFixingMin === 0 ? landScore : 0.75 * landScore + 0.25 * fixingScore

  const earlyScore = getScoreAtLeast(
    profile.earlyPlayCount,
    profile.expectedEarlyMin,
    Math.max(0, profile.expectedEarlyMin - (format === 'commander' ? 10 : 8)),
  )
  const topEndScore = getScoreAtMost(
    profile.topEndCount,
    profile.topEndLimit,
    profile.topEndLimit + (format === 'commander' ? 14 : 8),
  )
  const averageCurveScore = getScoreWithinRange(
    profile.spellAverageManaValue,
    format === 'commander' ? 2.7 : 1.9,
    format === 'commander' ? 4.0 : 3.6,
    format === 'commander' ? 1.6 : 1.4,
  )
  const curveRatio = 0.4 * earlyScore + 0.35 * topEndScore + 0.25 * averageCurveScore

  const interactionRatio = getScoreWithinRange(
    profile.interactionCount,
    profile.expectedInteractionRange.min,
    profile.expectedInteractionRange.max,
    format === 'commander' ? 10 : 8,
  )
  const cardFlowRatio = getScoreWithinRange(
    profile.cardFlowCount,
    profile.expectedCardFlowRange.min,
    profile.expectedCardFlowRange.max,
    format === 'commander' ? 10 : 6,
  )

  if (format === 'commander') {
    const rampRange = profile.expectedRampRange ?? getCommanderRampRange()
    const rampRatio = getScoreWithinRange(profile.rampCount, rampRange.min, rampRange.max, 8)

    factorRatios.structure = structureRatio
    factorRatios.mana = manaRatio
    factorRatios.ramp = rampRatio
    factorRatios.curve = curveRatio
    factorRatios.interaction = interactionRatio
    factorRatios.cardFlow = cardFlowRatio

    factors.push(
      buildFactor('structure', 'Structure', 24, structureRatio, getStructureSummary(profile, format)),
      buildFactor('mana', 'Mana Base', 24, manaRatio, getManaSummary(profile)),
      buildFactor('ramp', 'Ramp', 14, rampRatio, getRampSummary(profile)),
      buildFactor('curve', 'Curve', 14, curveRatio, getCurveSummary(profile, format)),
      buildFactor('interaction', 'Interaction', 12, interactionRatio, getInteractionSummary(profile)),
      buildFactor('cardFlow', 'Card Flow', 12, cardFlowRatio, getCardFlowSummary(profile)),
    )
  } else {
    const singletonRatio =
      profile.nonlandUniqueCount > 0 ? profile.oneOfCount / profile.nonlandUniqueCount : 1
    const singletonScore = getScoreAtMost(singletonRatio, 0.4, 0.85)
    const highCopyScore = getScoreAtLeast(profile.highCopyCount, 4, 0)
    const consistencyRatio =
      profile.nonlandUniqueCount === 0 ? 0 : 0.65 * singletonScore + 0.35 * highCopyScore
    const sideboardRatio =
      profile.expectedSideboardRange === null
        ? 1
        : profile.sideboardCount === 0
          ? 0.35
          : getScoreWithinRange(
              profile.sideboardCount,
              profile.expectedSideboardRange.min,
              profile.expectedSideboardRange.max,
              10,
            )

    factorRatios.structure = structureRatio
    factorRatios.mana = manaRatio
    factorRatios.curve = curveRatio
    factorRatios.interaction = interactionRatio
    factorRatios.cardFlow = cardFlowRatio
    factorRatios.consistency = consistencyRatio
    factorRatios.sideboard = sideboardRatio

    factors.push(
      buildFactor('structure', 'Structure', 26, structureRatio, getStructureSummary(profile, format)),
      buildFactor('mana', 'Mana Base', 22, manaRatio, getManaSummary(profile)),
      buildFactor('curve', 'Curve', 14, curveRatio, getCurveSummary(profile, format)),
      buildFactor('interaction', 'Interaction', 12, interactionRatio, getInteractionSummary(profile)),
      buildFactor('cardFlow', 'Card Flow', 8, cardFlowRatio, getCardFlowSummary(profile)),
      buildFactor('consistency', 'Consistency', 10, consistencyRatio, getConsistencySummary(profile)),
      buildFactor('sideboard', 'Sideboard', 8, sideboardRatio, getSideboardSummary(profile)),
    )
  }

  const score = clamp(
    factors.reduce((total, factor) => total + factor.score, 0),
    1,
    100,
  )
  const weakestFactor =
    factors.length > 0
      ? [...factors].sort(
          (left, right) => left.score / left.maxScore - right.score / right.maxScore,
        )[0]
      : null

  return {
    rating: {
      score,
      label: getScoreLabel(score),
      summary: getScoreSummary(score, weakestFactor),
      factors,
    },
    factorRatios,
    profile,
  }
}
