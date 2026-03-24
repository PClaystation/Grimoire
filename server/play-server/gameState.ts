import {
  clampPermanentPosition,
  type DeckSelectionSnapshot,
  type PlayerDesignation,
} from '../../src/shared/play.js'
import { expandDeckEntries, type CardInstance } from '../../src/shared/playDeck.js'

import {
  hasPartnerText,
  isCommanderCandidate,
  isVirtualTokenCard,
} from './helpers.js'
import type {
  BattlefieldPermanentState,
  GamePlayerState,
  GameState,
} from './types.js'

export function removeCardFromZone(cards: CardInstance[], cardId: string) {
  const cardIndex = cards.findIndex((card) => card.instanceId === cardId)

  if (cardIndex < 0) {
    return null
  }

  const [card] = cards.splice(cardIndex, 1)
  return card
}

export function compareStackMembers(left: BattlefieldPermanentState, right: BattlefieldPermanentState) {
  if (left.stackIndex !== right.stackIndex) {
    return left.stackIndex - right.stackIndex
  }

  return left.enteredAt.localeCompare(right.enteredAt)
}

export function takeOwnedCardFromZone(
  game: GameState,
  player: GamePlayerState,
  fromZone: import('./types.js').OwnedZone,
  cardId: string,
) {
  switch (fromZone) {
    case 'library':
      return removeCardFromZone(player.library, cardId)
    case 'hand':
      return removeCardFromZone(player.hand, cardId)
    case 'graveyard':
      return removeCardFromZone(player.graveyard, cardId)
    case 'exile':
      return removeCardFromZone(player.exile, cardId)
    case 'command':
      return removeCardFromZone(player.command, cardId)
    case 'battlefield': {
      const permanentIndex = game.battlefield.findIndex(
        (card) =>
          card.instanceId === cardId &&
          (card.ownerPlayerId === player.id || card.controllerPlayerId === player.id),
      )

      if (permanentIndex < 0) {
        return null
      }

      const [permanent] = game.battlefield.splice(permanentIndex, 1)
      normalizeStack(game, permanent.stackId)
      return {
        instanceId: permanent.instanceId,
        ownerPlayerId: permanent.ownerPlayerId,
        card: permanent.card,
      }
    }
  }
}

export function placeOwnedCardInZone(
  game: GameState,
  player: GamePlayerState,
  toZone: import('./types.js').OwnedZone,
  card: CardInstance,
  position?: import('../../src/shared/play.js').PermanentPosition,
) {
  const owner = game.players.find((candidate) => candidate.id === card.ownerPlayerId) ?? player

  switch (toZone) {
    case 'library':
      owner.library.unshift(card)
      break
    case 'hand':
      owner.hand.push(card)
      break
    case 'graveyard':
      owner.graveyard.push(card)
      break
    case 'exile':
      owner.exile.push(card)
      break
    case 'command':
      owner.command.push(card)
      break
    case 'battlefield':
      game.battlefield.push({
        ...card,
        controllerPlayerId: player.id,
        tapped: false,
        enteredAt: new Date().toISOString(),
        position: position
          ? clampPermanentPosition(position)
          : getAutoBattlefieldPosition(game, player.id, card.card.typeLine),
        stackId: null,
        stackIndex: 0,
        counters: [],
        note: '',
        isToken: isVirtualTokenCard(card.card.id),
        faceDown: false,
      })
      break
  }
}

export function getNextPlayer(game: GameState, activePlayerId: string) {
  const activePlayerIndex = game.players.findIndex((player) => player.id === activePlayerId)

  if (activePlayerIndex < 0 || game.players.length === 0) {
    return game.players[0] ?? null
  }

  return game.players[(activePlayerIndex + 1) % game.players.length] ?? null
}

export function applyPlayerDesignation(
  game: GameState,
  targetPlayerId: string,
  designation: PlayerDesignation,
  value: boolean,
) {
  if (designation === 'monarch' || designation === 'initiative') {
    game.players.forEach((player) => {
      if (designation === 'monarch') {
        player.designations.monarch = false
      } else {
        player.designations.initiative = false
      }
    })
  }

  const targetPlayer = game.players.find((player) => player.id === targetPlayerId)

  if (!targetPlayer) {
    return
  }

  if (designation === 'monarch') {
    targetPlayer.designations.monarch = value
  } else if (designation === 'initiative') {
    targetPlayer.designations.initiative = value
  } else {
    targetPlayer.designations.citysBlessing = value
  }
}

export function getControllablePermanent(game: GameState, actor: GamePlayerState, cardId: string) {
  return game.battlefield.find(
    (card) =>
      card.instanceId === cardId &&
      (card.ownerPlayerId === actor.id || card.controllerPlayerId === actor.id),
  )
}

export function getStackMembers(
  game: GameState,
  permanent: Pick<BattlefieldPermanentState, 'instanceId' | 'stackId'>,
) {
  const stackKey = permanent.stackId ?? permanent.instanceId

  return game.battlefield
    .filter((card) => (card.stackId ?? card.instanceId) === stackKey)
    .sort(compareStackMembers)
}

export function normalizeStack(game: GameState, stackId: string | null) {
  if (!stackId) {
    return
  }

  const members = game.battlefield
    .filter((card) => card.stackId === stackId)
    .sort(compareStackMembers)

  if (members.length <= 1) {
    members.forEach((card) => {
      card.stackId = null
      card.stackIndex = 0
    })
    return
  }

  members.forEach((card, index) => {
    card.stackId = stackId
    card.stackIndex = index
  })
}

export function setStackPosition(
  game: GameState,
  permanent: BattlefieldPermanentState,
  position: import('../../src/shared/play.js').PermanentPosition,
) {
  const normalizedPosition = clampPermanentPosition(position)
  const stackMembers = getStackMembers(game, permanent)

  stackMembers.forEach((card) => {
    card.position = normalizedPosition
  })
}

export function setPermanentStack(
  game: GameState,
  source: BattlefieldPermanentState,
  target: BattlefieldPermanentState,
) {
  if (source.instanceId === target.instanceId) {
    return false
  }

  const sourceStackMembers = getStackMembers(game, source)
  const targetStackMembers = getStackMembers(game, target)
  const previousSourceStackId = source.stackId
  const sourceStackKey = source.stackId ?? source.instanceId
  const targetStackKey = target.stackId ?? target.instanceId

  if (sourceStackKey === targetStackKey) {
    return false
  }

  const nextPosition = clampPermanentPosition(target.position)

  targetStackMembers.forEach((card, index) => {
    card.stackId = targetStackKey
    card.stackIndex = index
    card.position = nextPosition
  })

  sourceStackMembers.forEach((card, index) => {
    card.stackId = targetStackKey
    card.stackIndex = targetStackMembers.length + index
    card.position = nextPosition
  })

  normalizeStack(game, previousSourceStackId)
  normalizeStack(game, targetStackKey)
  return true
}

export function unstackPermanent(game: GameState, permanent: BattlefieldPermanentState) {
  if (!permanent.stackId) {
    return false
  }

  const previousStackId = permanent.stackId
  const detachedPosition = clampPermanentPosition({
    x: permanent.position.x + 7,
    y: permanent.position.y + 6,
  })

  permanent.stackId = null
  permanent.stackIndex = 0
  permanent.position = detachedPosition
  normalizeStack(game, previousStackId)
  return true
}

export function getAutoBattlefieldPosition(
  game: GameState,
  controllerPlayerId: string,
  typeLine: string,
) {
  const isLand = typeLine.includes('Land')
  const preferredY = isLand ? 80 : /Creature|Planeswalker|Battle/i.test(typeLine) ? 42 : 58
  const laneCards = game.battlefield.filter((card) => card.controllerPlayerId === controllerPlayerId)
  const rowCards = laneCards.filter((card) =>
    Math.abs(card.position.y - preferredY) < (isLand ? 9 : 14),
  )
  const slotIndex = rowCards.length

  return clampPermanentPosition({
    x: 12 + (slotIndex % 6) * 14,
    y: preferredY + Math.floor(slotIndex / 6) * (isLand ? 5 : 8),
  })
}

export function buildInitialCommandZone(
  deck: DeckSelectionSnapshot,
  ownerPlayerId: string,
  library: CardInstance[],
) {
  if (deck.format !== 'commander') {
    return []
  }

  const sideboardCards = expandDeckEntries(deck.sideboard, ownerPlayerId)

  if (sideboardCards.length > 0 && sideboardCards.length <= 2) {
    return sideboardCards
  }

  const partnerCandidates = deck.mainboard.filter(
    (entry) => entry.quantity === 1 && isCommanderCandidate(entry.card) && hasPartnerText(entry.card),
  )

  const exactCandidates =
    partnerCandidates.length === 2
      ? partnerCandidates
      : deck.mainboard.filter(
          (entry) => entry.quantity === 1 && isCommanderCandidate(entry.card),
        ).length === 1
        ? deck.mainboard.filter(
            (entry) => entry.quantity === 1 && isCommanderCandidate(entry.card),
          )
        : []

  return exactCandidates
    .map((entry) => {
      const cardIndex = library.findIndex((card) => card.card.id === entry.card.id)

      if (cardIndex < 0) {
        return null
      }

      const [card] = library.splice(cardIndex, 1)
      return card
    })
    .filter((card): card is CardInstance => Boolean(card))
}

export function formatZoneLabel(zone: import('./types.js').OwnedZone) {
  switch (zone) {
    case 'battlefield':
      return 'the battlefield'
    case 'library':
      return 'their library'
    case 'graveyard':
      return 'the graveyard'
    case 'exile':
      return 'exile'
    case 'hand':
      return 'their hand'
    case 'command':
      return 'the command zone'
  }
}
