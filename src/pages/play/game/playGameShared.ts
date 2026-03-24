import type {
  BattlefieldPermanentSnapshot,
  GamePlayerPublicSnapshot,
  GamePrivatePlayerState,
  OwnedZone,
  PermanentPosition,
  TableCardSnapshot,
} from '@/shared/play'
import type { CardColor } from '@/types/scryfall'

export type PublicZone = 'graveyard' | 'exile' | 'command'
export type PrivateZone = 'hand' | 'library'
export type BrowseableZone = PublicZone | 'library'

export type TableSelection =
  | { zone: 'battlefield'; cardId: string }
  | { zone: PrivateZone; cardId: string }
  | { zone: PublicZone; playerId: string; cardId: string }

export interface SelectedCardData {
  zone: OwnedZone
  card: TableCardSnapshot | BattlefieldPermanentSnapshot
  player: GamePlayerPublicSnapshot | null
  permanent: BattlefieldPermanentSnapshot | null
}

export interface DragPayload {
  cardId: string
  fromZone: OwnedZone
  controllerPlayerId?: string
}

export interface TokenPreset {
  name: string
  tokenType: string
  note: string
  colors: CardColor[]
  power?: string
  toughness?: string
}

export interface BattlefieldStackGroup {
  id: string
  position: PermanentPosition
  cards: BattlefieldPermanentSnapshot[]
}

export const COUNTER_PRESETS = ['+1/+1', 'loyalty', 'shield', 'stun']
export const PLAYER_COUNTER_PRESETS = ['poison', 'energy', 'experience', 'rad']
export const MTG_CARD_BACK_URL = '/Magic_card_back-removebg.png'
export const TOKEN_PRESETS: TokenPreset[] = [
  {
    name: 'Treasure',
    tokenType: 'Artifact Token',
    note: 'Tap, Sacrifice this artifact: Add one mana of any color.',
    colors: [],
  },
  {
    name: 'Clue',
    tokenType: 'Artifact Token',
    note: '2, Sacrifice this artifact: Draw a card.',
    colors: [],
  },
  {
    name: 'Food',
    tokenType: 'Artifact Token',
    note: '2, Tap, Sacrifice this artifact: You gain 3 life.',
    colors: [],
  },
  {
    name: 'Spirit',
    tokenType: 'Creature Token',
    note: 'Flying',
    colors: ['W'],
    power: '1',
    toughness: '1',
  },
  {
    name: 'Beast',
    tokenType: 'Creature Token',
    note: '',
    colors: ['G'],
    power: '3',
    toughness: '3',
  },
]

export function zoneLabel(zone: PublicZone | OwnedZone) {
  switch (zone) {
    case 'library':
      return 'Library'
    case 'command':
      return 'Command'
    case 'graveyard':
      return 'Graveyard'
    case 'exile':
      return 'Exile'
    case 'battlefield':
      return 'Battlefield'
    case 'hand':
      return 'Hand'
  }
}

export function compareBattlefieldPermanents(
  left: BattlefieldPermanentSnapshot,
  right: BattlefieldPermanentSnapshot,
) {
  if (left.position.y !== right.position.y) {
    return left.position.y - right.position.y
  }

  if (left.position.x !== right.position.x) {
    return left.position.x - right.position.x
  }

  if (left.stackIndex !== right.stackIndex) {
    return left.stackIndex - right.stackIndex
  }

  return left.enteredAt.localeCompare(right.enteredAt)
}

export function buildBattlefieldStackGroups(
  permanents: BattlefieldPermanentSnapshot[],
): BattlefieldStackGroup[] {
  const groups = new Map<string, BattlefieldPermanentSnapshot[]>()

  permanents.forEach((permanent) => {
    const groupId = permanent.stackId ?? permanent.instanceId
    const currentGroup = groups.get(groupId) ?? []
    currentGroup.push(permanent)
    groups.set(groupId, currentGroup)
  })

  return Array.from(groups.entries())
    .map(([id, cards]) => {
      const sortedCards = [...cards].sort(compareBattlefieldPermanents)
      return {
        id,
        cards: sortedCards,
        position: sortedCards[0]?.position ?? { x: 50, y: 50 },
      }
    })
    .sort((left, right) => {
      if (left.position.y !== right.position.y) {
        return left.position.y - right.position.y
      }

      return left.position.x - right.position.x
    })
}

export function getPermanentStackCards(
  permanents: BattlefieldPermanentSnapshot[],
  permanentId: string,
) {
  const permanent = permanents.find((card) => card.instanceId === permanentId)

  if (!permanent) {
    return []
  }

  const stackKey = permanent.stackId ?? permanent.instanceId
  return permanents
    .filter((card) => (card.stackId ?? card.instanceId) === stackKey)
    .sort(compareBattlefieldPermanents)
}

export function parseDragPayload(rawValue: string) {
  try {
    const parsed = JSON.parse(rawValue) as unknown

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as DragPayload).cardId === 'string' &&
      typeof (parsed as DragPayload).fromZone === 'string'
    ) {
      return parsed as DragPayload
    }

    return null
  } catch {
    return null
  }
}

export function findSelectedCardData(
  selection: TableSelection | null,
  battlefield: BattlefieldPermanentSnapshot[],
  players: GamePlayerPublicSnapshot[],
  privateState: GamePrivatePlayerState | null,
): SelectedCardData | null {
  if (!selection) {
    return null
  }

  if (selection.zone === 'battlefield') {
    const permanent = battlefield.find((card) => card.instanceId === selection.cardId)

    if (!permanent) {
      return null
    }

    return {
      zone: 'battlefield',
      card: permanent,
      player: players.find((player) => player.id === permanent.ownerPlayerId) ?? null,
      permanent,
    }
  }

  if (selection.zone === 'hand') {
    const card = privateState?.hand.find((entry) => entry.instanceId === selection.cardId)

    if (!card) {
      return null
    }

    return {
      zone: 'hand',
      card,
      player: players.find((player) => player.id === card.ownerPlayerId) ?? null,
      permanent: null,
    }
  }

  if (selection.zone === 'library') {
    const card = privateState?.library.find((entry) => entry.instanceId === selection.cardId)

    if (!card) {
      return null
    }

    return {
      zone: 'library',
      card,
      player: players.find((player) => player.id === card.ownerPlayerId) ?? null,
      permanent: null,
    }
  }

  if (!('playerId' in selection)) {
    return null
  }

  const zoneOwner = players.find((player) => player.id === selection.playerId) ?? null
  const zoneCards = zoneOwner?.[selection.zone] ?? []
  const card = zoneCards.find((entry) => entry.instanceId === selection.cardId) ?? null

  if (!card) {
    return null
  }

  return {
    zone: selection.zone,
    card,
    player: zoneOwner,
    permanent: null,
  }
}
