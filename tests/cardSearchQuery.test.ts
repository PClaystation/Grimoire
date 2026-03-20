import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULT_FILTERS, normalizeCardSearchFilters } from '../src/constants/mtg.ts'
import type { TableCardSnapshot } from '../src/shared/play.ts'
import { buildSearchQuery, buildSearchRequestConfig } from '../src/utils/cardSearchQuery.ts'
import { filterLibraryCards } from '../src/utils/playCardLibrarySearch.ts'

test('buildSearchQuery includes the expanded filter set in Scryfall syntax', () => {
  const query = buildSearchQuery({
    ...DEFAULT_FILTERS,
    query: 'legendary dragon',
    exactName: 'Atraxa, Grand Unifier',
    subtype: 'Wizard, Equipment',
    oracleText: 'draw a card',
    flavorText: 'fire and fury',
    keyword: 'flying, flash',
    artist: 'Seb McKinnon',
    collectorNumber: '123',
    format: 'commander',
    color: 'G',
    colorIdentity: 'MULTI',
    colorCount: '2',
    type: 'Creature',
    manaValue: '7+',
    manaValueMin: '2',
    manaValueMax: '6',
    rarity: 'mythic',
    setCode: 'bro',
    setType: 'masters',
    layout: 'TRANSFORM',
    manaProduced: 'C',
    releaseYearStart: '2020',
    releaseYearEnd: '2024',
    priceUsdMin: '1.5',
    priceUsdMax: '9.99',
    powerMin: '3',
    powerMax: '6',
    toughnessMin: '2',
    toughnessMax: '7',
    loyaltyMin: '4',
    loyaltyMax: '8',
    legendaryOnly: true,
    basicOnly: true,
    fullArtOnly: true,
    borderlessOnly: true,
    showcaseOnly: true,
    retroFrameOnly: true,
  })

  assert.equal(
    query,
    [
      'game:paper',
      '-is:token',
      'legal:commander',
      'c:g',
      'id:m',
      'colors=2',
      't:creature',
      'mv>=7',
      'mv>=2',
      'mv<=6',
      'r:mythic',
      'set:bro',
      'st:masters',
      'layout:transform',
      'produces:c',
      't:Wizard',
      't:Equipment',
      '!"Atraxa, Grand Unifier"',
      'o:"draw a card"',
      'ft:"fire and fury"',
      'keyword:flying',
      'keyword:flash',
      'a:"Seb McKinnon"',
      'cn:123',
      'year>=2020',
      'year<=2024',
      'usd>=1.5',
      'usd<=9.99',
      'pow>=3',
      'pow<=6',
      'tou>=2',
      'tou<=7',
      'loy>=4',
      'loy<=8',
      't:legendary',
      't:basic',
      'is:fullart',
      'is:borderless',
      'is:showcase',
      'frame:1997',
      'legendary dragon',
    ].join(' '),
  )
})

test('buildSearchRequestConfig switches to print searches for print-specific filters and remote sorting', () => {
  const config = buildSearchRequestConfig(
    {
      ...DEFAULT_FILTERS,
      setType: 'commander',
      releaseYearStart: '2022',
    },
    'PRICE_HIGH',
  )

  assert.deepEqual(config, {
    order: 'usd',
    dir: 'desc',
    unique: 'prints',
  })
})

test('normalizeCardSearchFilters restores missing advanced filter keys for treatment searches', () => {
  const filters = normalizeCardSearchFilters({
    format: 'standard',
    legalityOnly: true,
    fullArtOnly: true,
    borderlessOnly: true,
  })

  assert.equal(filters.setType, 'ANY')
  assert.equal(filters.layout, 'ANY')
  assert.match(buildSearchQuery(filters), /is:fullart/)
  assert.match(buildSearchQuery(filters), /is:borderless/)
})

test('filterLibraryCards supports fielded search tokens and preserves deck order by default', () => {
  const cards: TableCardSnapshot[] = [
    {
      instanceId: 'card-1',
      ownerPlayerId: 'player-1',
      card: {
        id: 'card-a',
        oracleId: null,
        name: 'Forest',
        manaCost: '',
        manaValue: 0,
        releasedAt: '2024-11-15',
        typeLine: 'Basic Land — Forest',
        oracleText: '({T}: Add {G}.)',
        colors: [],
        colorIdentity: ['G'],
        setCode: 'fdn',
        setName: 'Foundations',
        collectorNumber: '301',
        rarity: 'common',
        legalities: {},
        imageUrl: 'https://example.com/forest.jpg',
        largeImageUrl: 'https://example.com/forest-large.jpg',
        prices: {
          usd: 0.15,
          usdFoil: null,
          eur: null,
          eurFoil: null,
          tix: null,
        },
      },
    },
    {
      instanceId: 'card-2',
      ownerPlayerId: 'player-1',
      card: {
        id: 'card-b',
        oracleId: null,
        name: 'Llanowar Visionary',
        manaCost: '{2}{G}',
        manaValue: 3,
        releasedAt: '2021-07-23',
        typeLine: 'Creature — Elf Druid',
        oracleText: 'When this creature enters, draw a card. {T}: Add {G}.',
        colors: ['G'],
        colorIdentity: ['G'],
        setCode: 'afr',
        setName: 'Adventures in the Forgotten Realms',
        collectorNumber: '187',
        rarity: 'common',
        legalities: {},
        imageUrl: 'https://example.com/visionary.jpg',
        largeImageUrl: 'https://example.com/visionary-large.jpg',
        prices: {
          usd: 0.12,
          usdFoil: null,
          eur: null,
          eurFoil: null,
          tix: null,
        },
      },
    },
    {
      instanceId: 'card-3',
      ownerPlayerId: 'player-1',
      card: {
        id: 'card-c',
        oracleId: null,
        name: 'Counterspell',
        manaCost: '{U}{U}',
        manaValue: 2,
        releasedAt: '2023-06-09',
        typeLine: 'Instant',
        oracleText: 'Counter target spell.',
        colors: ['U'],
        colorIdentity: ['U'],
        setCode: 'cmm',
        setName: 'Commander Masters',
        collectorNumber: '81',
        rarity: 'uncommon',
        legalities: {},
        imageUrl: 'https://example.com/counterspell.jpg',
        largeImageUrl: 'https://example.com/counterspell-large.jpg',
        prices: {
          usd: 1.5,
          usdFoil: null,
          eur: null,
          eurFoil: null,
          tix: null,
        },
      },
    },
  ]

  assert.deepEqual(
    filterLibraryCards(cards, 'type:creature text:"draw a card" color:g mv>=3', 'DECK_ORDER').map(
      (card) => card.card.name,
    ),
    ['Llanowar Visionary'],
  )

  assert.deepEqual(
    filterLibraryCards(cards, 'rarity:common', 'DECK_ORDER').map((card) => card.card.name),
    ['Forest', 'Llanowar Visionary'],
  )

  assert.deepEqual(
    filterLibraryCards(cards, '', 'NAME').map((card) => card.card.name),
    ['Counterspell', 'Forest', 'Llanowar Visionary'],
  )
})
