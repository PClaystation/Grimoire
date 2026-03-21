import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = process.argv[2] ?? 'http://localhost:5173'
const OUTPUT_DIR = path.resolve('artifacts/playwright/revamp')

function buildCardImage(name, accentA, accentB) {
  void name
  void accentA
  void accentB
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
}

function buildCard({
  id,
  name,
  typeLine,
  oracleText = '',
  manaCost = '',
  manaValue = 0,
  colors = [],
  colorIdentity = colors,
  accentA,
  accentB,
}) {
  const imageUrl = buildCardImage(name, accentA, accentB)

  return {
    id,
    oracleId: `${id}-oracle`,
    name,
    manaCost,
    manaValue,
    releasedAt: '2026-03-15',
    typeLine,
    oracleText,
    colors,
    colorIdentity,
    setCode: 'gmr',
    setName: 'Grimoire Validation',
    collectorNumber: '1',
    rarity: 'rare',
    legalities: {},
    imageUrl,
    largeImageUrl: imageUrl,
    prices: {
      usd: null,
      usdFoil: null,
      eur: null,
      eurFoil: null,
      tix: null,
    },
  }
}

function buildDeck({
  id,
  deckName,
  commanderName,
  estateName,
  creatureName,
  artifactName,
  spellName,
  colors,
  accentA,
  accentB,
}) {
  const commander = buildCard({
    id: `${id}-commander`,
    name: commanderName,
    typeLine: 'Legendary Creature — Avatar',
    oracleText: 'Flying',
    manaCost: '{3}{U}{W}',
    manaValue: 5,
    colors,
    accentA,
    accentB,
  })
  const estate = buildCard({
    id: `${id}-estate`,
    name: estateName,
    typeLine: 'Basic Land',
    accentA,
    accentB,
  })
  const creature = buildCard({
    id: `${id}-creature`,
    name: creatureName,
    typeLine: 'Creature — Wizard',
    oracleText: 'Whenever this enters, scry 1.',
    manaCost: '{2}{U}',
    manaValue: 3,
    colors,
    accentA,
    accentB,
  })
  const artifact = buildCard({
    id: `${id}-artifact`,
    name: artifactName,
    typeLine: 'Artifact',
    oracleText: 'Tap: Add one mana of any color.',
    manaCost: '{2}',
    manaValue: 2,
    accentA,
    accentB,
  })
  const spell = buildCard({
    id: `${id}-spell`,
    name: spellName,
    typeLine: 'Sorcery',
    oracleText: 'Draw two cards.',
    manaCost: '{3}{U}',
    manaValue: 4,
    colors,
    accentA,
    accentB,
  })

  const now = new Date().toISOString()

  return {
    id,
    name: deckName,
    format: 'commander',
    mainboard: [
      { card: estate, quantity: 12 },
      { card: creature, quantity: 8 },
      { card: artifact, quantity: 6 },
      { card: spell, quantity: 4 },
    ],
    sideboard: [{ card: commander, quantity: 1 }],
    notes: '',
    matchupNotes: '',
    budgetTargetUsd: null,
    createdAt: now,
    updatedAt: now,
  }
}

async function seedContext(context, decks, playerName) {
  await context.addInitScript(
    ({ seededDecks, seededPlayerName }) => {
      window.localStorage.setItem('grimoire.saved-decks.v1', JSON.stringify(seededDecks))
      window.localStorage.setItem('grimoire.play.player-name.v1', seededPlayerName)
    },
    { seededDecks: decks, seededPlayerName: playerName },
  )
}

async function ensureNoConsoleErrors(page, errors, label) {
  const relevantErrors = errors.filter(
    (entry) => entry !== 'Failed to load resource: the server responded with a status of 403 (Forbidden)',
  )

  if (relevantErrors.length > 0) {
    throw new Error(`${label} produced console errors:\n${relevantErrors.join('\n')}`)
  }

  const pageError = await page.evaluate(() => window.__lastPlayTableError ?? null).catch(() => null)

  if (pageError) {
    throw new Error(`${label} produced a page error: ${pageError}`)
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader'],
  })

  const aliceDeck = buildDeck({
    id: 'deck-alice',
    deckName: 'Azure Tempest',
    commanderName: 'Tidal Regent',
    estateName: 'Azure Estate',
    creatureName: 'Mist Adept',
    artifactName: 'Rune Prism',
    spellName: 'Current Recall',
    colors: ['U', 'W'],
    accentA: '#7ae7f7',
    accentB: '#1b7e91',
  })
  const bobDeck = buildDeck({
    id: 'deck-bob',
    deckName: 'Crimson Surge',
    commanderName: 'Inferno Regent',
    estateName: 'Crimson Estate',
    creatureName: 'Cinder Adept',
    artifactName: 'Battle Prism',
    spellName: 'Scorch Recall',
    colors: ['R', 'B'],
    accentA: '#ffb27d',
    accentB: '#9d331a',
  })

  const aliceContext = await browser.newContext({ viewport: { width: 1600, height: 1500 } })
  const bobContext = await browser.newContext({ viewport: { width: 1600, height: 1500 } })
  await seedContext(aliceContext, [aliceDeck], 'Alice')
  await seedContext(bobContext, [bobDeck], 'Bob')

  const aliceErrors = []
  const bobErrors = []
  const alicePage = await aliceContext.newPage()
  const bobPage = await bobContext.newPage()

  alicePage.on('console', (message) => {
    if (message.type() === 'error') {
      aliceErrors.push(message.text())
    }
  })
  bobPage.on('console', (message) => {
    if (message.type() === 'error') {
      bobErrors.push(message.text())
    }
  })
  alicePage.on('pageerror', (error) => {
    aliceErrors.push(String(error))
  })
  bobPage.on('pageerror', (error) => {
    bobErrors.push(String(error))
  })

  await alicePage.goto(`${BASE_URL}/play/create`, { waitUntil: 'domcontentloaded' })
  await alicePage.getByRole('navigation').getByText('connected').waitFor({ timeout: 10000 })
  await alicePage.getByRole('button', { name: /Create .* room/i }).click()
  await alicePage.waitForURL(/\/play\/room\//, { waitUntil: 'domcontentloaded' })

  const roomCode = alicePage.url().split('/').at(-1)

  if (!roomCode) {
    throw new Error('Unable to determine room code from host page.')
  }

  await bobPage.goto(`${BASE_URL}/play/join`, { waitUntil: 'domcontentloaded' })
  await bobPage.getByRole('navigation').getByText('connected').waitFor({ timeout: 10000 })
  await bobPage.getByLabel('Room code').fill(roomCode)
  await bobPage.getByRole('button', { name: /Join room/i }).click()
  await bobPage.waitForURL(/\/play\/room\//, { waitUntil: 'domcontentloaded' })

  await alicePage.getByRole('button', { name: /Azure Tempest/i }).click()
  await bobPage.getByRole('button', { name: /Crimson Surge/i }).click()
  await alicePage.waitForFunction(() => {
    const startButton = Array.from(document.querySelectorAll('button')).find((button) =>
      /start game/i.test(button.textContent ?? ''),
    )

    return startButton instanceof HTMLButtonElement && !startButton.disabled
  }, { timeout: 15000 })
  await bobPage.getByText('Everyone matches the room settings. Waiting for the host.').waitFor({
    timeout: 15000,
  })
  await alicePage.getByRole('button', { name: /Start game/i }).click()

  await Promise.all([
    alicePage.waitForURL(/\/play\/game\//),
    bobPage.waitForURL(/\/play\/game\//),
  ])

  await alicePage.waitForTimeout(1200)
  await bobPage.waitForTimeout(1200)

  const aliceHandCards = alicePage.getByTestId('hand-tray').locator('button[data-card-name]')
  await aliceHandCards.first().dblclick()
  await aliceHandCards.nth(1).dragTo(alicePage.getByTestId('lane-board-local'), {
    targetPosition: { x: 360, y: 120 },
  })
  const aliceBoardCards = alicePage.getByTestId('lane-board-local').locator('button[data-card-name]')
  await aliceBoardCards.nth(1).waitFor({ timeout: 15000 })
  await aliceBoardCards.nth(1).dragTo(aliceBoardCards.first())

  const aliceZonePanel = alicePage.locator('section').filter({ hasText: 'Zone access' }).last()
  await alicePage.getByTestId('zone-pile-command-local').click()
  await aliceZonePanel.locator('button[data-card-name]').first().dblclick()

  await alicePage.getByTestId('zone-pile-library-local').click()

  await aliceBoardCards.last().click({ force: true })
  const aliceInspector = alicePage.locator('section').filter({ hasText: 'Inspector' })
  await aliceInspector.getByRole('button', { name: /^Add$/i }).click()
  await aliceInspector.getByRole('button', { name: /^Graveyard$/i }).click()
  await alicePage.getByTestId('zone-pile-graveyard-local').click()
  await aliceZonePanel.locator('button[data-card-name]').first().dblclick()
  await aliceBoardCards.last().click({ force: true })
  await aliceInspector.locator('summary').filter({ hasText: 'Table note' }).click()
  await alicePage.getByPlaceholder('Status, mode, trigger...').fill('Marked for alpha swing')
  await alicePage.getByRole('button', { name: /Save note/i }).click()
  await alicePage.getByRole('button', { name: /^Tokens$/i }).click()
  await alicePage.getByRole('button', { name: /^Treasure/i }).click()
  await alicePage.getByRole('button', { name: /Pass turn/i }).click()
  await bobPage.getByText('You can move cards and use the board.').waitFor({ timeout: 15000 })

  const bobHandCards = bobPage.getByTestId('hand-tray').locator('button[data-card-name]')
  await bobHandCards.first().dblclick()
  await bobHandCards.nth(1).dragTo(bobPage.getByTestId('lane-board-local'), {
    targetPosition: { x: 360, y: 120 },
  })

  await alicePage.waitForTimeout(1200)
  await bobPage.waitForTimeout(1200)

  await alicePage.screenshot({
    path: path.join(OUTPUT_DIR, 'alice-table.png'),
    fullPage: true,
  })
  await bobPage.screenshot({
    path: path.join(OUTPUT_DIR, 'bob-table.png'),
    fullPage: true,
  })

  await writeFile(
    path.join(OUTPUT_DIR, 'summary.json'),
    JSON.stringify(
      {
        roomCode,
        aliceUrl: alicePage.url(),
        bobUrl: bobPage.url(),
      },
      null,
      2,
    ),
  )

  await ensureNoConsoleErrors(alicePage, aliceErrors, 'Alice page')
  await ensureNoConsoleErrors(bobPage, bobErrors, 'Bob page')

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
