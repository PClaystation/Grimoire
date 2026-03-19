const savedDeckDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const eurFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
})

interface CardPricingLike {
  prices: {
    usd: number | null
    usdFoil: number | null
    eur: number | null
    eurFoil: number | null
  }
}

export function formatSavedDeckDate(timestamp: string): string {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown save'
  }

  return savedDeckDateFormatter.format(date)
}

export function formatDateTimeLabel(timestamp: string | null): string {
  if (!timestamp) {
    return 'Not synced yet'
  }

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return 'Unavailable'
  }

  return savedDeckDateFormatter.format(date)
}

export function formatManaCost(manaCost: string): string {
  const formatted = manaCost.replace(/[{}]/g, ' ').trim().replace(/\s+/g, ' ')
  return formatted || 'No mana cost'
}

export function formatTypeLine(typeLine: string): string {
  return typeLine.replace(/ — /g, ' / ')
}

export function getCardMarketPriceUsd(card: CardPricingLike): number | null {
  return card.prices.usd ?? card.prices.usdFoil
}

export function formatUsdPrice(value: number | null): string {
  if (value === null) {
    return 'N/A'
  }

  return usdFormatter.format(value)
}

export function formatMarketPriceLabel(card: CardPricingLike): string {
  if (card.prices.usd !== null) {
    return formatUsdPrice(card.prices.usd)
  }

  if (card.prices.usdFoil !== null) {
    return `Foil ${formatUsdPrice(card.prices.usdFoil)}`
  }

  if (card.prices.eur !== null) {
    return eurFormatter.format(card.prices.eur)
  }

  if (card.prices.eurFoil !== null) {
    return `Foil ${eurFormatter.format(card.prices.eurFoil)}`
  }

  return 'No market price'
}

export function countDeckEntries(entries: Array<{ quantity: number }>): number {
  return entries.reduce((total, entry) => total + entry.quantity, 0)
}
