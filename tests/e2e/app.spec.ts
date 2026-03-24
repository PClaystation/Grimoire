import { expect, test, type Page, type Route } from '@playwright/test'

const CARD_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="488" height="680" viewBox="0 0 488 680">
      <rect width="488" height="680" rx="24" fill="#0f172a"/>
      <rect x="24" y="24" width="440" height="632" rx="20" fill="#1d4ed8"/>
      <text x="244" y="340" text-anchor="middle" font-size="52" fill="#eff6ff" font-family="Verdana">Island</text>
    </svg>`,
  )

const islandCard = {
  id: 'card-island',
  oracle_id: 'oracle-island',
  name: 'Island',
  mana_cost: '',
  cmc: 0,
  released_at: '2024-01-01',
  type_line: 'Basic Land - Island',
  oracle_text: '({T}: Add {U}.)',
  colors: [],
  color_identity: ['U'],
  set: 'fdn',
  set_name: 'Foundations',
  collector_number: '257',
  rarity: 'common',
  legalities: {
    standard: 'legal',
  },
  image_uris: {
    small: CARD_IMAGE,
    normal: CARD_IMAGE,
    large: CARD_IMAGE,
  },
  prices: {
    usd: '0.10',
    usd_foil: null,
    eur: null,
    eur_foil: null,
    tix: null,
  },
}

async function installAuthMocks(page: Page) {
  await page.route('**/api/auth/refresh_token', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'No session.' }),
    })
  })
}

async function installDeckbuilderMocks(page: Page) {
  await installAuthMocks(page)

  await page.route('**/api.scryfall.com/**', async (route: Route) => {
    const url = new URL(route.request().url())

    if (url.pathname === '/sets') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              code: 'fdn',
              name: 'Foundations',
              released_at: '2024-01-01',
              set_type: 'core',
              digital: false,
            },
          ],
        }),
      })
      return
    }

    if (url.pathname === '/cards/search') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [islandCard],
          total_cards: 1,
          has_more: false,
        }),
      })
      return
    }

    if (url.pathname === '/cards/collection') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [islandCard],
        }),
      })
      return
    }

    await route.abort()
  })
}

test('deck builder loads search results and adds a card to the mainboard', async ({ page }) => {
  await installDeckbuilderMocks(page)

  await page.goto('/')

  await expect(page.getByText('Card Browser')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Island to deck' })).toBeVisible()

  await page.getByRole('button', { name: 'Add Island to deck' }).click()

  await expect(page.getByRole('status')).toContainText('Added Island to the mainboard.')
  await expect(page.getByRole('heading', { name: 'Mainboard' })).toBeVisible()
  await expect(page.getByText('Island', { exact: true }).first()).toBeVisible()
})

test('deck import modal resolves a pasted list through Scryfall collection lookup', async ({ page }) => {
  await installDeckbuilderMocks(page)

  await page.goto('/')

  await page.getByRole('button', { name: 'Import' }).click()
  await expect(page.getByRole('dialog', { name: 'Paste a decklist or deck URL' })).toBeVisible()

  await page
    .getByPlaceholder('Paste deck text, JSON, or a supported deck URL')
    .fill('# Imported Deck\n# Format: standard\n\nDeck\n4 Island')
  await page.getByRole('button', { name: 'Import deck' }).click()

  await expect(page.getByRole('status')).toContainText('Imported "Imported Deck"')
  await expect(page.getByText('Island', { exact: true }).first()).toBeVisible()
})

test('debug lab unlocks and starts a solo sandbox game', async ({ page }) => {
  await installAuthMocks(page)

  await page.goto('/play/lab')

  await page.getByLabel('Lab password').fill('grimoire-lab')
  await page.getByRole('button', { name: 'Unlock lab' }).click()

  await page.waitForURL(/\/play\/room\//)
  await expect(page.getByRole('button', { name: /Start debug game/i })).toBeVisible()

  await page.getByRole('button', { name: /Start debug game/i }).click()

  await page.waitForURL(/\/play\/game\//)
  await expect(page.getByText('Live Table')).toBeVisible()
  await expect(page.getByTestId('table-hud-pass-turn')).toBeVisible()
})
