import assert from 'node:assert/strict'
import test from 'node:test'

import { parseDeckImport } from '../src/utils/deckImport.ts'
import { encodeDeckSharePayload, decodeDeckSharePayload } from '../src/utils/share.ts'

test('deck share payloads round-trip only when the structure is valid', () => {
  const payload = {
    version: 1 as const,
    name: 'Esper Midrange',
    format: 'standard' as const,
    notes: 'Keep hands with two lands.',
    matchupNotes: 'Bring in Negate against control.',
    budgetTargetUsd: 120,
    mainboard: [{ quantity: 4, name: 'Deep-Cavern Bat', setCode: 'lci' }],
    sideboard: [{ quantity: 2, name: 'Negate' }],
  }

  assert.deepEqual(decodeDeckSharePayload(encodeDeckSharePayload(payload)), payload)

  const invalidPayload = Buffer.from(
    JSON.stringify({
      version: 1,
      name: 'Broken payload',
      format: 'alchemy',
      notes: '',
      matchupNotes: '',
      budgetTargetUsd: null,
      mainboard: [],
      sideboard: [],
    }),
    'utf8',
  ).toString('base64url')

  assert.equal(decodeDeckSharePayload(invalidPayload), null)
})

test('parseDeckImport skips non-positive quantities instead of creating invalid entries', () => {
  const parsedImport = parseDeckImport(`
Deck
0 Island
2 Plains
SB: 1 Negate
`)

  assert.deepEqual(
    parsedImport.entries.map((entry) => ({
      quantity: entry.quantity,
      name: entry.name,
      section: entry.section,
    })),
    [
      {
        quantity: 2,
        name: 'Plains',
        section: 'mainboard',
      },
      {
        quantity: 1,
        name: 'Negate',
        section: 'sideboard',
      },
    ],
  )
  assert.ok(parsedImport.warnings.some((warning) => warning.includes('quantity must be at least 1')))
})
