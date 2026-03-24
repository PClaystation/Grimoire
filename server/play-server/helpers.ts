import type { CardColor, MagicCard } from '../../src/types/scryfall.js'
import type { DeckSelectionSnapshot, PlayerDesignations } from '../../src/shared/play.js'
import type { CardInstance } from '../../src/shared/playDeck.js'

export const DEFAULT_DISCONNECT_GRACE_PERIOD_MS = 5_000
export const DEBUG_ROOM_INITIAL_PLACEHOLDERS = 2

export function sanitizeDebugRoomPassword(value: string | undefined) {
  return (value ?? '').trim()
}

export function sanitizePermanentNote(value: string | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, 120)
}

export function sanitizeCounterKind(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9/+ -]/g, '')
  return normalized.slice(0, 20)
}

export function clampCounterDelta(value: number) {
  return Math.max(-20, Math.min(20, Math.trunc(value)))
}

export function clampDrawAmount(value: number | undefined) {
  return Math.max(1, Math.min(7, Math.trunc(value ?? 1)))
}

export function clampTurnNumber(value: number | undefined, fallback = 1) {
  return Math.max(1, Math.min(999, Math.trunc(value ?? fallback)))
}

export function isCommanderCandidate(card: MagicCard) {
  return (
    card.typeLine.includes('Legendary Creature') || card.typeLine.includes('Legendary Planeswalker')
  )
}

export function hasPartnerText(card: MagicCard) {
  const oracleText = card.oracleText.toLowerCase()
  return (
    oracleText.includes('partner') ||
    oracleText.includes('friends forever') ||
    oracleText.includes('choose a background')
  )
}

export function isVirtualTokenCard(cardId: string) {
  return cardId.startsWith('token:')
}

function buildFaceDownImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="744" height="1039" viewBox="0 0 744 1039">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1d4ed8"/>
        </linearGradient>
      </defs>
      <rect width="744" height="1039" rx="42" fill="#020617"/>
      <rect x="28" y="28" width="688" height="983" rx="34" fill="url(#bg)"/>
      <rect x="76" y="76" width="592" height="887" rx="28" fill="rgba(15,23,42,0.55)" stroke="rgba(255,255,255,0.14)" stroke-width="4"/>
      <text x="372" y="470" text-anchor="middle" fill="#dbeafe" font-size="60" font-family="Verdana, sans-serif" font-weight="700">FACE-DOWN</text>
      <text x="372" y="540" text-anchor="middle" fill="rgba(219,234,254,0.75)" font-size="28" font-family="Verdana, sans-serif">Hidden card information</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const FACE_DOWN_IMAGE_URL = buildFaceDownImage()

function buildDebugPlaceholderImage(label: string) {
  const safeLabel = label.replace(/[<>&"]/g, '')
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="744" height="1039" viewBox="0 0 744 1039">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#0f766e"/>
        </linearGradient>
      </defs>
      <rect width="744" height="1039" rx="42" fill="#020617"/>
      <rect x="28" y="28" width="688" height="983" rx="34" fill="url(#bg)"/>
      <rect x="58" y="58" width="628" height="923" rx="30" fill="rgba(8,15,29,0.56)" stroke="rgba(255,255,255,0.16)" stroke-width="4"/>
      <text x="372" y="156" text-anchor="middle" fill="#e2e8f0" font-size="38" font-family="Verdana, sans-serif" font-weight="700">Debug Seat</text>
      <text x="372" y="482" text-anchor="middle" fill="#f8fafc" font-size="72" font-family="Georgia, serif" font-weight="700">${safeLabel}</text>
      <text x="372" y="560" text-anchor="middle" fill="rgba(226,232,240,0.82)" font-size="28" font-family="Verdana, sans-serif">Placeholder card for table previews</text>
      <rect x="114" y="746" width="516" height="146" rx="26" fill="rgba(15,23,42,0.72)"/>
      <text x="372" y="820" text-anchor="middle" fill="#dbeafe" font-size="32" font-family="Verdana, sans-serif" font-weight="700">${safeLabel}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function sanitizePlayerNote(value: string | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, 160)
}

export function sanitizeLabel(value: string | undefined, fallback: string) {
  const normalized = (value ?? '').trim().replace(/\s+/g, ' ')
  return (normalized || fallback).slice(0, 80)
}

export function sanitizeTargets(value: string[] | undefined) {
  return (value ?? []).map((entry) => entry.trim()).filter(Boolean).slice(0, 6)
}

export function sanitizePlayerCounterKind(value: string) {
  return sanitizeCounterKind(value)
}

export function buildDefaultPlayerDesignations(): PlayerDesignations {
  return {
    monarch: false,
    initiative: false,
    citysBlessing: false,
  }
}

export function buildHiddenCard(card: MagicCard): MagicCard {
  return {
    ...card,
    name: 'Face-down card',
    manaCost: '',
    manaValue: 0,
    typeLine: 'Hidden permanent',
    oracleText: '',
    imageUrl: FACE_DOWN_IMAGE_URL,
    largeImageUrl: FACE_DOWN_IMAGE_URL,
  }
}

function buildTokenImage(name: string, colors: CardColor[], power?: string, toughness?: string) {
  const palette =
    colors.length === 0
      ? ['#f6e2b3', '#b7791f']
      : colors.includes('G')
        ? ['#d7f6df', '#25613f']
        : colors.includes('U')
          ? ['#d7f1ff', '#1d5d86']
          : colors.includes('R')
            ? ['#ffd8c9', '#a53920']
            : colors.includes('B')
              ? ['#e4daf6', '#4c2d78']
              : ['#fff1c9', '#946400']
  const stats = power && toughness ? `${power}/${toughness}` : 'TOKEN'
  const escapedName = name.replace(/[<>&"]/g, '')

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="744" height="1039" viewBox="0 0 744 1039">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="100%" stop-color="${palette[1]}"/>
        </linearGradient>
      </defs>
      <rect width="744" height="1039" rx="42" fill="#111827"/>
      <rect x="26" y="26" width="692" height="987" rx="34" fill="url(#bg)"/>
      <rect x="54" y="54" width="636" height="128" rx="26" fill="rgba(12,18,29,0.78)"/>
      <text x="84" y="132" fill="#f8fafc" font-size="52" font-family="Georgia, serif" font-weight="700">${escapedName}</text>
      <rect x="54" y="214" width="636" height="520" rx="28" fill="rgba(12,18,29,0.18)" stroke="rgba(255,255,255,0.28)" stroke-width="4"/>
      <text x="372" y="510" text-anchor="middle" fill="rgba(12,18,29,0.82)" font-size="82" font-family="Verdana, sans-serif" font-weight="700">${stats}</text>
      <rect x="54" y="772" width="636" height="188" rx="28" fill="rgba(12,18,29,0.78)"/>
      <text x="84" y="838" fill="#dbeafe" font-size="28" font-family="Verdana, sans-serif">Token</text>
      <text x="84" y="902" fill="#f8fafc" font-size="46" font-family="Verdana, sans-serif" font-weight="700">${escapedName}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function buildTokenCard(
  ownerPlayerId: string,
  name: string,
  tokenType: string,
  colors: CardColor[],
  note: string,
  power?: string,
  toughness?: string,
): CardInstance {
  const suffix = power && toughness ? ` ${power}/${toughness}` : ''
  const imageUrl = buildTokenImage(name, colors, power, toughness)

  return {
    instanceId: crypto.randomUUID(),
    ownerPlayerId,
    card: {
      id: `token:${crypto.randomUUID()}`,
      oracleId: null,
      name,
      manaCost: '',
      manaValue: 0,
      releasedAt: new Date().toISOString().slice(0, 10),
      typeLine: tokenType,
      oracleText: note || `Created token${suffix}.`,
      colors,
      colorIdentity: colors,
      setCode: 'tok',
      setName: 'Table Tokens',
      collectorNumber: 'T-1',
      rarity: 'token',
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
    },
  }
}

function buildDebugCard(name: string): MagicCard {
  const imageUrl = buildDebugPlaceholderImage(name)

  return {
    id: `debug:${crypto.randomUUID()}`,
    oracleId: null,
    name,
    manaCost: '{3}',
    manaValue: 3,
    releasedAt: new Date().toISOString().slice(0, 10),
    typeLine: 'Artifact Creature - Construct',
    oracleText: 'Placeholder card for room previews.',
    colors: [],
    colorIdentity: [],
    setCode: 'dbg',
    setName: 'Debug Room',
    collectorNumber: '001',
    rarity: 'special',
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

export function buildDebugDeckSelection(playerName: string): DeckSelectionSnapshot {
  const debugCard = buildDebugCard(`${playerName} Test`)
  const mainboard = [
    {
      quantity: 60,
      card: debugCard,
    },
  ]

  return {
    id: `debug-${crypto.randomUUID()}`,
    name: `${playerName} Debug Deck`,
    format: 'standard',
    mainboard,
    sideboard: [],
    mainboardCount: 60,
    sideboardCount: 0,
  }
}
