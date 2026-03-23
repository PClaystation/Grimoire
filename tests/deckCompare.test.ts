import assert from 'node:assert/strict'
import test from 'node:test'

import { compareDeckSections } from '../src/utils/deckCompare.ts'

const makeEntry = (name: string, quantity: number, oracleId = name.toLowerCase()) => ({
  quantity,
  card: {
    id: `${name}-id`,
    oracleId,
    name,
    manaCost: '',
    manaValue: 0,
    releasedAt: '2024-01-01',
    typeLine: 'Artifact',
    oracleText: '',
    colors: [],
    colorIdentity: [],
    setCode: 'fdn',
    setName: 'Foundations',
    collectorNumber: '1',
    rarity: 'common',
    legalities: {
      standard: 'legal',
    },
    imageUrl: 'https://cards.example.com/normal.jpg',
    largeImageUrl: 'https://cards.example.com/large.jpg',
    prices: {
      usd: null,
      usdFoil: null,
      eur: null,
      eurFoil: null,
      tix: null,
    },
  },
})

test('compareDeckSections separates unique and changed quantities cleanly', () => {
  const comparison = compareDeckSections(
    [makeEntry('Sol Ring', 1), makeEntry('Counterspell', 2)],
    [makeEntry('Counterspell', 4), makeEntry('Ponder', 3)],
  )

  assert.deepEqual(comparison.onlyInLeft.map((entry) => entry.name), ['Sol Ring'])
  assert.deepEqual(comparison.onlyInRight.map((entry) => entry.name), ['Ponder'])
  assert.deepEqual(comparison.quantityChanged.map((entry) => entry.name), ['Counterspell'])
  assert.equal(comparison.quantityChanged[0]?.leftQuantity, 2)
  assert.equal(comparison.quantityChanged[0]?.rightQuantity, 4)
})
