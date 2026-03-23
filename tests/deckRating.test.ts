import assert from 'node:assert/strict'
import test from 'node:test'

import type { DeckCardEntry } from '../src/types/deck.ts'
import type { CardColor, MagicCard } from '../src/types/scryfall.ts'
import { getDeckStats } from '../src/utils/deckStats.ts'

let cardCounter = 0

const ALL_LEGAL = {
  standard: 'legal',
  pioneer: 'legal',
  modern: 'legal',
  legacy: 'legal',
  vintage: 'legal',
  pauper: 'legal',
  commander: 'legal',
}

function makeCard(
  name: string,
  overrides: Partial<MagicCard> = {},
): MagicCard {
  cardCounter += 1
  const colors = overrides.colors ?? []
  const colorIdentity = overrides.colorIdentity ?? colors

  return {
    id: `${name.toLowerCase().replace(/\s+/g, '-')}-${cardCounter}`,
    oracleId: `${name.toLowerCase().replace(/\s+/g, '-')}-oracle`,
    name,
    manaCost: overrides.manaCost ?? '',
    manaValue: overrides.manaValue ?? 2,
    releasedAt: '2024-01-01',
    typeLine: overrides.typeLine ?? 'Creature',
    oracleText: overrides.oracleText ?? '',
    colors,
    colorIdentity,
    setCode: 'fdn',
    setName: 'Foundations',
    collectorNumber: String(cardCounter),
    rarity: overrides.rarity ?? 'rare',
    legalities: overrides.legalities ?? ALL_LEGAL,
    imageUrl: `https://cards.example.com/${cardCounter}.jpg`,
    largeImageUrl: `https://cards.example.com/${cardCounter}-large.jpg`,
    prices: {
      usd: overrides.prices?.usd ?? null,
      usdFoil: overrides.prices?.usdFoil ?? null,
      eur: overrides.prices?.eur ?? null,
      eurFoil: overrides.prices?.eurFoil ?? null,
      tix: overrides.prices?.tix ?? null,
    },
  }
}

function makeEntry(
  name: string,
  quantity: number,
  overrides: Partial<MagicCard> = {},
): DeckCardEntry {
  return {
    quantity,
    card: makeCard(name, overrides),
  }
}

function makeBasicLand(name: string, quantity: number, colorIdentity: CardColor): DeckCardEntry {
  return makeEntry(name, quantity, {
    manaValue: 0,
    typeLine: `Basic Land — ${name}`,
    colorIdentity: [colorIdentity],
    oracleText: `({T}: Add {${colorIdentity}}.)`,
  })
}

function makeDualLand(
  name: string,
  quantity: number,
  colors: [CardColor, CardColor],
): DeckCardEntry {
  return makeEntry(name, quantity, {
    manaValue: 0,
    typeLine: 'Land',
    colorIdentity: colors,
    oracleText: `{T}: Add {${colors[0]}} or {${colors[1]}}.`,
  })
}

function buildStrongStandardDeck() {
  const mainboard: DeckCardEntry[] = [
    makeDualLand('Hallowed Strand', 4, ['W', 'U']),
    makeDualLand('Seaside Annex', 4, ['W', 'U']),
    makeBasicLand('Plains', 8, 'W'),
    makeBasicLand('Island', 8, 'U'),
    makeEntry('Skirmish Initiate', 4, {
      manaValue: 1,
      typeLine: 'Creature — Soldier',
      colors: ['W'],
      colorIdentity: ['W'],
    }),
    makeEntry('Tide Channeler', 4, {
      manaValue: 2,
      typeLine: 'Creature — Wizard',
      colors: ['U'],
      colorIdentity: ['U'],
    }),
    makeEntry('Skyblade Mentor', 4, {
      manaValue: 3,
      typeLine: 'Creature — Spirit',
      colors: ['W', 'U'],
      colorIdentity: ['W', 'U'],
    }),
    makeEntry('Celestial Regent', 4, {
      manaValue: 4,
      typeLine: 'Creature — Angel',
      colors: ['W'],
      colorIdentity: ['W'],
    }),
    makeEntry('Aerial Verdict', 4, {
      manaValue: 2,
      typeLine: 'Instant',
      colors: ['W'],
      colorIdentity: ['W'],
      oracleText: 'Exile target creature.',
    }),
    makeEntry('Logic Snare', 4, {
      manaValue: 2,
      typeLine: 'Instant',
      colors: ['U'],
      colorIdentity: ['U'],
      oracleText: 'Counter target spell.',
    }),
    makeEntry('Scout the Archive', 4, {
      manaValue: 2,
      typeLine: 'Sorcery',
      colors: ['U'],
      colorIdentity: ['U'],
      oracleText: 'Draw two cards.',
    }),
    makeEntry('Dawnshield Captain', 4, {
      manaValue: 3,
      typeLine: 'Creature — Knight',
      colors: ['W'],
      colorIdentity: ['W'],
    }),
    makeEntry('Protective Burst', 4, {
      manaValue: 2,
      typeLine: 'Instant',
      colors: ['U'],
      colorIdentity: ['U'],
      oracleText: "Return target nonland permanent to its owner's hand. Draw a card.",
    }),
  ]

  const sideboard: DeckCardEntry[] = [
    makeEntry('Rest in Embers', 3, {
      manaValue: 2,
      typeLine: 'Enchantment',
      colors: ['W'],
      colorIdentity: ['W'],
    }),
    makeEntry('Negate the Plan', 3, {
      manaValue: 2,
      typeLine: 'Instant',
      colors: ['U'],
      colorIdentity: ['U'],
      oracleText: 'Counter target noncreature spell.',
    }),
    makeEntry('Disenchanting Wave', 3, {
      manaValue: 2,
      typeLine: 'Instant',
      colors: ['W'],
      colorIdentity: ['W'],
      oracleText: 'Exile target artifact or enchantment.',
    }),
    makeEntry('Sunseal Purge', 3, {
      manaValue: 3,
      typeLine: 'Instant',
      colors: ['W'],
      colorIdentity: ['W'],
      oracleText: 'Exile target creature.',
    }),
    makeEntry('Tidal Lock', 3, {
      manaValue: 2,
      typeLine: 'Instant',
      colors: ['U'],
      colorIdentity: ['U'],
      oracleText: 'Counter target spell.',
    }),
  ]

  return { mainboard, sideboard }
}

function buildWeakStandardDeck() {
  const colors: CardColor[] = ['W', 'U', 'B', 'R', 'G']
  const mainboard: DeckCardEntry[] = [
    makeBasicLand('Plains', 2, 'W'),
    makeBasicLand('Island', 2, 'U'),
    makeBasicLand('Swamp', 2, 'B'),
    makeBasicLand('Mountain', 2, 'R'),
    makeBasicLand('Forest', 2, 'G'),
    makeEntry('Forsaken Wastes', 2, {
      manaValue: 0,
      typeLine: 'Land',
      colorIdentity: [],
      oracleText: '{T}: Add {C}.',
    }),
  ]

  for (let index = 0; index < 30; index += 1) {
    const color = colors[index % colors.length]

    mainboard.push(
      makeEntry(`Huge Spell ${index + 1}`, 2, {
        manaValue: 6 + (index % 2),
        typeLine: 'Sorcery',
        colors: [color],
        colorIdentity: [color],
      }),
    )
  }

  return { mainboard, sideboard: [] as DeckCardEntry[] }
}

function buildStrongCommanderDeck() {
  const mainboard: DeckCardEntry[] = []

  for (let index = 0; index < 15; index += 1) {
    mainboard.push(
      makeEntry(`Triome Vista ${index + 1}`, 1, {
        manaValue: 0,
        typeLine: 'Land',
        colorIdentity: ['W', 'U', 'B'],
        oracleText: '{T}: Add {W}, {U}, or {B}.',
      }),
    )
  }

  for (let index = 0; index < 10; index += 1) {
    mainboard.push(makeBasicLand(`Plains-${index + 1}`, 1, 'W'))
  }

  for (let index = 0; index < 7; index += 1) {
    mainboard.push(makeBasicLand(`Island-${index + 1}`, 1, 'U'))
  }

  for (let index = 0; index < 5; index += 1) {
    mainboard.push(makeBasicLand(`Swamp-${index + 1}`, 1, 'B'))
  }

  for (let index = 0; index < 10; index += 1) {
    mainboard.push(
      makeEntry(`Arcane Accelerator ${index + 1}`, 1, {
        manaValue: 2,
        typeLine: 'Artifact',
        colorIdentity: ['W', 'U', 'B'],
        oracleText: '{T}: Add {W}, {U}, or {B}.',
      }),
    )
  }

  for (let index = 0; index < 10; index += 1) {
    mainboard.push(
      makeEntry(`Strategic Insight ${index + 1}`, 1, {
        manaValue: 3,
        typeLine: 'Sorcery',
        colors: ['U'],
        colorIdentity: ['U'],
        oracleText: 'Draw two cards.',
      }),
    )
  }

  for (let index = 0; index < 8; index += 1) {
    mainboard.push(
      makeEntry(`Answer the Threat ${index + 1}`, 1, {
        manaValue: 2,
        typeLine: 'Instant',
        colors: ['W'],
        colorIdentity: ['W'],
        oracleText: 'Exile target creature.',
      }),
    )
  }

  for (let index = 0; index < 2; index += 1) {
    mainboard.push(
      makeEntry(`Reset the Board ${index + 1}`, 1, {
        manaValue: 4,
        typeLine: 'Sorcery',
        colors: ['B'],
        colorIdentity: ['B'],
        oracleText: 'Destroy all creatures.',
      }),
    )
  }

  for (let index = 0; index < 33; index += 1) {
    mainboard.push(
      makeEntry(`Commander Threat ${index + 1}`, 1, {
        manaValue: 2 + (index % 4),
        typeLine: 'Creature — Horror',
        colors: index % 2 === 0 ? ['U'] : ['B'],
        colorIdentity: index % 2 === 0 ? ['U'] : ['B'],
      }),
    )
  }

  return { mainboard, sideboard: [] as DeckCardEntry[] }
}

function buildWeakCommanderDeck() {
  const mainboard: DeckCardEntry[] = []

  for (let index = 0; index < 10; index += 1) {
    mainboard.push(
      makeEntry(`Shaky Tri-Land ${index + 1}`, 1, {
        manaValue: 0,
        typeLine: 'Land',
        colorIdentity: ['W', 'U', 'B'],
        oracleText: '{T}: Add {W}, {U}, or {B}.',
      }),
    )
  }

  for (let index = 0; index < 10; index += 1) {
    mainboard.push(makeBasicLand(`Plains Weak-${index + 1}`, 1, 'W'))
  }

  for (let index = 0; index < 5; index += 1) {
    mainboard.push(makeBasicLand(`Island Weak-${index + 1}`, 1, 'U'))
  }

  for (let index = 0; index < 3; index += 1) {
    mainboard.push(makeBasicLand(`Swamp Weak-${index + 1}`, 1, 'B'))
  }

  for (let index = 0; index < 2; index += 1) {
    mainboard.push(
      makeEntry(`Slow Signet ${index + 1}`, 1, {
        manaValue: 3,
        typeLine: 'Artifact',
        colorIdentity: ['W', 'U', 'B'],
        oracleText: '{T}: Add {W}, {U}, or {B}.',
      }),
    )
  }

  for (let index = 0; index < 2; index += 1) {
    mainboard.push(
      makeEntry(`Overpriced Insight ${index + 1}`, 1, {
        manaValue: 5,
        typeLine: 'Sorcery',
        colors: ['U'],
        colorIdentity: ['U'],
        oracleText: 'Draw two cards.',
      }),
    )
  }

  for (let index = 0; index < 3; index += 1) {
    mainboard.push(
      makeEntry(`Clumsy Removal ${index + 1}`, 1, {
        manaValue: 5,
        typeLine: 'Sorcery',
        colors: ['B'],
        colorIdentity: ['B'],
        oracleText: 'Destroy target creature.',
      }),
    )
  }

  for (let index = 0; index < 65; index += 1) {
    mainboard.push(
      makeEntry(`Seven Drop ${index + 1}`, 1, {
        manaValue: 6 + (index % 2),
        typeLine: 'Creature — Giant',
        colors: index % 3 === 0 ? ['W'] : index % 3 === 1 ? ['U'] : ['B'],
        colorIdentity: index % 3 === 0 ? ['W'] : index % 3 === 1 ? ['U'] : ['B'],
      }),
    )
  }

  return { mainboard, sideboard: [] as DeckCardEntry[] }
}

test('deck rater scores a strong 60-card deck highly', () => {
  const { mainboard, sideboard } = buildStrongStandardDeck()
  const stats = getDeckStats(mainboard, sideboard, 'standard', null)

  assert.ok(stats.rating.score >= 82, `expected strong deck score >= 82, got ${stats.rating.score}`)
  assert.equal(stats.rating.label, 'Tuned')
  assert.equal(stats.recommendations[0]?.id, 'fundamentals-strong')
})

test('deck rater flags major issues in a weak 60-card deck', () => {
  const { mainboard, sideboard } = buildWeakStandardDeck()
  const stats = getDeckStats(mainboard, sideboard, 'standard', null)
  const recommendationIds = new Set(stats.recommendations.map((recommendation) => recommendation.id))

  assert.ok(stats.rating.score <= 35, `expected weak deck score <= 35, got ${stats.rating.score}`)
  assert.ok(recommendationIds.has('trim-mainboard'))
  assert.ok(recommendationIds.has('add-lands'))
  assert.ok(recommendationIds.has('improve-fixing'))
})

test('deck rater rewards strong commander fundamentals', () => {
  const { mainboard, sideboard } = buildStrongCommanderDeck()
  const stats = getDeckStats(mainboard, sideboard, 'commander', null)

  assert.ok(stats.rating.score >= 80, `expected strong commander score >= 80, got ${stats.rating.score}`)
  assert.ok(
    !stats.recommendations.some((recommendation) => recommendation.id === 'add-ramp'),
    'expected strong commander shell to avoid ramp warnings',
  )
})

test('deck rater catches weak commander mana, ramp, and card flow', () => {
  const { mainboard, sideboard } = buildWeakCommanderDeck()
  const stats = getDeckStats(mainboard, sideboard, 'commander', null)
  const recommendationIds = new Set(stats.recommendations.map((recommendation) => recommendation.id))

  assert.ok(stats.rating.score <= 50, `expected weak commander score <= 50, got ${stats.rating.score}`)
  assert.ok(recommendationIds.has('add-lands'))
  assert.ok(recommendationIds.has('add-ramp'))
  assert.ok(recommendationIds.has('add-card-flow'))
})
