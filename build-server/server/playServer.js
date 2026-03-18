import { PLAY_COMMANDER_STARTING_LIFE_TOTAL, PLAY_MAX_PLAYERS, PLAY_MIN_PLAYERS, PLAY_OPENING_HAND_SIZE, PLAY_STARTING_LIFE_TOTAL, buildDeckSelectionSummary, buildRandomRoomCode, clampPermanentPosition, countDeckCards, normalizeDeckFormat, normalizePlayerName, normalizeRoomCode, } from '../src/shared/play.js';
import { expandDeckEntries, shuffleCardInstances, } from '../src/shared/playDeck.js';
const DEFAULT_DISCONNECT_GRACE_PERIOD_MS = 5_000;
function removeCardFromZone(cards, cardId) {
    const cardIndex = cards.findIndex((card) => card.instanceId === cardId);
    if (cardIndex < 0) {
        return null;
    }
    const [card] = cards.splice(cardIndex, 1);
    return card;
}
function compareStackMembers(left, right) {
    if (left.stackIndex !== right.stackIndex) {
        return left.stackIndex - right.stackIndex;
    }
    return left.enteredAt.localeCompare(right.enteredAt);
}
function sanitizePermanentNote(value) {
    return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
}
function sanitizeCounterKind(value) {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9/+ -]/g, '');
    return normalized.slice(0, 20);
}
function clampCounterDelta(value) {
    return Math.max(-20, Math.min(20, Math.trunc(value)));
}
function clampDrawAmount(value) {
    return Math.max(1, Math.min(7, Math.trunc(value ?? 1)));
}
function isCommanderCandidate(card) {
    return (card.typeLine.includes('Legendary Creature') || card.typeLine.includes('Legendary Planeswalker'));
}
function hasPartnerText(card) {
    const oracleText = card.oracleText.toLowerCase();
    return (oracleText.includes('partner') ||
        oracleText.includes('friends forever') ||
        oracleText.includes('choose a background'));
}
function isVirtualTokenCard(cardId) {
    return cardId.startsWith('token:');
}
function buildTokenImage(name, colors, power, toughness) {
    const palette = colors.length === 0
        ? ['#f6e2b3', '#b7791f']
        : colors.includes('G')
            ? ['#d7f6df', '#25613f']
            : colors.includes('U')
                ? ['#d7f1ff', '#1d5d86']
                : colors.includes('R')
                    ? ['#ffd8c9', '#a53920']
                    : colors.includes('B')
                        ? ['#e4daf6', '#4c2d78']
                        : ['#fff1c9', '#946400'];
    const stats = power && toughness ? `${power}/${toughness}` : 'TOKEN';
    const escapedName = name.replace(/[<>&"]/g, '');
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
  `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function buildTokenCard(ownerPlayerId, name, tokenType, colors, note, power, toughness) {
    const suffix = power && toughness ? ` ${power}/${toughness}` : '';
    const imageUrl = buildTokenImage(name, colors, power, toughness);
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
    };
}
export class PlayServer {
    dependencies;
    rooms = new Map();
    gameRoomIds = new Map();
    sessionRoomIds = new Map();
    sessionNames = new Map();
    pendingDisconnectTimers = new Map();
    disconnectGracePeriodMs;
    setTimeoutFn;
    clearTimeoutFn;
    constructor(dependencies) {
        this.dependencies = dependencies;
        this.disconnectGracePeriodMs = Math.max(0, dependencies.disconnectGracePeriodMs ?? DEFAULT_DISCONNECT_GRACE_PERIOD_MS);
        this.setTimeoutFn = dependencies.setTimeout ?? globalThis.setTimeout;
        this.clearTimeoutFn = dependencies.clearTimeout ?? globalThis.clearTimeout;
    }
    handleHello(sessionId, playerName) {
        this.clearPendingDisconnect(sessionId);
        const normalizedName = normalizePlayerName(playerName);
        this.sessionNames.set(sessionId, normalizedName);
        const room = this.getRoomBySession(sessionId);
        this.dependencies.sendToSession(sessionId, {
            type: 'session_ready',
            sessionId,
            playerName: normalizedName,
            roomId: room?.roomId ?? null,
            gameId: room?.gameId ?? null,
        });
        if (!room) {
            return;
        }
        const roomPlayer = room.players.find((player) => player.sessionId === sessionId);
        if (roomPlayer) {
            roomPlayer.name = normalizedName;
            roomPlayer.isConnected = true;
        }
        const gamePlayer = room.game?.players.find((player) => player.sessionId === sessionId);
        if (gamePlayer) {
            gamePlayer.name = normalizedName;
            gamePlayer.isConnected = true;
        }
        this.emitRoomSnapshots(room);
        this.emitGameSnapshots(room);
    }
    handleDisconnect(sessionId) {
        this.clearPendingDisconnect(sessionId);
        if (this.disconnectGracePeriodMs === 0) {
            this.finalizeDisconnect(sessionId);
            return;
        }
        const timeoutId = this.setTimeoutFn(() => {
            this.pendingDisconnectTimers.delete(sessionId);
            this.finalizeDisconnect(sessionId);
        }, this.disconnectGracePeriodMs);
        this.pendingDisconnectTimers.set(sessionId, timeoutId);
    }
    finalizeDisconnect(sessionId) {
        const room = this.getRoomBySession(sessionId);
        if (!room) {
            return;
        }
        const roomPlayer = room.players.find((player) => player.sessionId === sessionId);
        if (roomPlayer) {
            roomPlayer.isConnected = false;
        }
        const gamePlayer = room.game?.players.find((player) => player.sessionId === sessionId);
        if (gamePlayer) {
            gamePlayer.isConnected = false;
        }
        const connectedPlayers = room.players.filter((player) => player.isConnected);
        if (connectedPlayers.length === 0) {
            this.deleteRoom(room.roomId);
            return;
        }
        if (!room.game && !connectedPlayers.some((player) => player.id === room.hostPlayerId)) {
            room.hostPlayerId = connectedPlayers[0].id;
        }
        this.emitRoomSnapshots(room);
        this.emitGameSnapshots(room);
    }
    clearPendingDisconnect(sessionId) {
        const timeoutId = this.pendingDisconnectTimers.get(sessionId);
        if (timeoutId === undefined) {
            return;
        }
        this.clearTimeoutFn(timeoutId);
        this.pendingDisconnectTimers.delete(sessionId);
    }
    handleMessage(sessionId, message) {
        switch (message.type) {
            case 'create_room':
                this.createRoom(sessionId);
                break;
            case 'join_room':
                this.joinRoom(sessionId, message.roomId);
                break;
            case 'leave_room':
                this.leaveRoom(sessionId, message.roomId);
                break;
            case 'select_deck':
                this.selectDeck(sessionId, message.roomId, message.deck);
                break;
            case 'start_game':
                this.startGame(sessionId, message.roomId);
                break;
            case 'game_action':
                this.applyGameAction(sessionId, message.gameId, message.action);
                break;
        }
    }
    createRoom(sessionId) {
        const existingRoom = this.getRoomBySession(sessionId);
        if (existingRoom) {
            this.emitRoomSnapshots(existingRoom);
            return;
        }
        const roomId = this.generateUniqueRoomId();
        const player = this.createRoomPlayer(sessionId);
        const createdAt = new Date().toISOString();
        const room = {
            roomId,
            code: roomId,
            createdAt,
            hostPlayerId: player.id,
            players: [player],
            gameId: null,
            game: null,
        };
        this.rooms.set(roomId, room);
        this.sessionRoomIds.set(sessionId, roomId);
        this.emitRoomSnapshots(room);
    }
    joinRoom(sessionId, requestedRoomId) {
        const roomId = normalizeRoomCode(requestedRoomId);
        const room = this.rooms.get(roomId);
        if (!room) {
            this.emitError(sessionId, 'Room not found.');
            return;
        }
        const existingRoom = this.getRoomBySession(sessionId);
        if (existingRoom && existingRoom.roomId !== room.roomId) {
            this.emitError(sessionId, 'Leave your current room before joining another one.');
            return;
        }
        const existingPlayer = room.players.find((player) => player.sessionId === sessionId);
        if (existingPlayer) {
            existingPlayer.name = this.getPlayerName(sessionId);
            existingPlayer.isConnected = true;
            this.sessionRoomIds.set(sessionId, room.roomId);
            this.emitRoomSnapshots(room);
            this.emitGameSnapshots(room);
            return;
        }
        if (room.game) {
            this.emitError(sessionId, 'This room already started a game.');
            return;
        }
        if (room.players.length >= PLAY_MAX_PLAYERS) {
            this.emitError(sessionId, 'This room is full.');
            return;
        }
        room.players.push(this.createRoomPlayer(sessionId));
        this.sessionRoomIds.set(sessionId, room.roomId);
        this.emitRoomSnapshots(room);
    }
    leaveRoom(sessionId, requestedRoomId) {
        const room = this.getRoomBySession(sessionId);
        if (!room || room.roomId !== normalizeRoomCode(requestedRoomId)) {
            this.emitError(sessionId, 'You are not in that room.');
            return;
        }
        if (room.game) {
            this.emitError(sessionId, 'Leaving an active game is not supported yet. Close the tab to disconnect instead.');
            return;
        }
        room.players = room.players.filter((player) => player.sessionId !== sessionId);
        this.sessionRoomIds.delete(sessionId);
        this.dependencies.sendToSession(sessionId, {
            type: 'room_left',
            roomId: room.roomId,
        });
        if (room.players.length === 0) {
            this.deleteRoom(room.roomId);
            return;
        }
        if (!room.players.some((player) => player.id === room.hostPlayerId)) {
            room.hostPlayerId = room.players[0].id;
        }
        this.emitRoomSnapshots(room);
    }
    selectDeck(sessionId, requestedRoomId, deck) {
        const room = this.getRoomBySession(sessionId);
        if (!room || room.roomId !== normalizeRoomCode(requestedRoomId)) {
            this.emitError(sessionId, 'You are not in that room.');
            return;
        }
        if (room.game) {
            this.emitError(sessionId, 'Decks cannot be changed after the game starts.');
            return;
        }
        const player = room.players.find((entry) => entry.sessionId === sessionId);
        if (!player) {
            this.emitError(sessionId, 'Player not found in room.');
            return;
        }
        const normalizedDeck = this.normalizeDeckSelection(deck);
        if (!normalizedDeck) {
            this.emitError(sessionId, 'Unable to use that deck for play.');
            return;
        }
        player.selectedDeck = normalizedDeck;
        this.emitRoomSnapshots(room);
    }
    startGame(sessionId, requestedRoomId) {
        const room = this.getRoomBySession(sessionId);
        if (!room || room.roomId !== normalizeRoomCode(requestedRoomId)) {
            this.emitError(sessionId, 'You are not in that room.');
            return;
        }
        if (room.game) {
            this.emitRoomSnapshots(room);
            this.emitGameSnapshots(room);
            return;
        }
        const hostPlayer = room.players.find((player) => player.id === room.hostPlayerId);
        if (!hostPlayer || hostPlayer.sessionId !== sessionId) {
            this.emitError(sessionId, 'Only the host can start the game.');
            return;
        }
        if (room.players.length < PLAY_MIN_PLAYERS) {
            this.emitError(sessionId, 'You need at least two players to start.');
            return;
        }
        if (room.players.some((player) => !player.isConnected)) {
            this.emitError(sessionId, 'All lobby players need to be connected before starting.');
            return;
        }
        if (room.players.some((player) => player.selectedDeck === null)) {
            this.emitError(sessionId, 'Every player needs to choose a deck before starting.');
            return;
        }
        const startedAt = new Date().toISOString();
        const gameId = crypto.randomUUID();
        const players = room.players.map((player) => {
            const selectedDeck = player.selectedDeck;
            const library = shuffleCardInstances(expandDeckEntries(selectedDeck.mainboard, player.id));
            const command = this.buildInitialCommandZone(selectedDeck, player.id, library);
            const hand = library.splice(0, PLAY_OPENING_HAND_SIZE);
            return {
                id: player.id,
                sessionId: player.sessionId,
                name: player.name,
                isConnected: player.isConnected,
                joinedAt: player.joinedAt,
                selectedDeck: buildDeckSelectionSummary(selectedDeck),
                lifeTotal: selectedDeck.format === 'commander'
                    ? PLAY_COMMANDER_STARTING_LIFE_TOTAL
                    : PLAY_STARTING_LIFE_TOTAL,
                library,
                hand,
                graveyard: [],
                exile: [],
                command,
            };
        });
        room.gameId = gameId;
        room.game = {
            gameId,
            roomId: room.roomId,
            createdAt: room.createdAt,
            startedAt,
            players,
            battlefield: [],
            actionLog: [],
        };
        this.gameRoomIds.set(gameId, room.roomId);
        this.recordEvent(room.game, hostPlayer.id, 'game_start', `${hostPlayer.name} started the game.`);
        this.emitRoomSnapshots(room);
        this.emitGameSnapshots(room);
    }
    applyGameAction(sessionId, gameId, action) {
        const room = this.getRoomByGameId(gameId);
        const game = room?.game;
        if (!room || !game) {
            this.emitError(sessionId, 'Game not found.');
            return;
        }
        const actor = game.players.find((player) => player.sessionId === sessionId);
        if (!actor) {
            this.emitError(sessionId, 'You are not part of this game.');
            return;
        }
        switch (action.type) {
            case 'shuffle_library': {
                actor.library = shuffleCardInstances(actor.library);
                this.recordEvent(game, actor.id, action.type, `${actor.name} shuffled their library.`);
                break;
            }
            case 'draw_card': {
                const drawAmount = clampDrawAmount(action.amount);
                const drawnCards = [];
                for (let index = 0; index < drawAmount; index += 1) {
                    const nextCard = actor.library.shift();
                    if (!nextCard) {
                        break;
                    }
                    actor.hand.push(nextCard);
                    drawnCards.push(nextCard);
                }
                if (drawnCards.length === 0) {
                    this.emitError(sessionId, 'Your library is empty.');
                    return;
                }
                this.recordEvent(game, actor.id, action.type, drawnCards.length === 1
                    ? `${actor.name} drew a card.`
                    : `${actor.name} drew ${drawnCards.length} cards.`);
                break;
            }
            case 'move_owned_card': {
                if (action.fromZone === action.toZone) {
                    return;
                }
                const movedCard = this.takeOwnedCard(game, actor, action.fromZone, action.cardId);
                if (!movedCard) {
                    this.emitError(sessionId, 'Card not found in that zone.');
                    return;
                }
                this.placeOwnedCard(game, actor, action.toZone, movedCard, action.position);
                this.recordEvent(game, actor.id, action.type, `${actor.name} moved ${movedCard.card.name} from ${this.formatZoneLabel(action.fromZone)} to ${this.formatZoneLabel(action.toZone)}.`);
                break;
            }
            case 'tap_card': {
                const permanent = game.battlefield.find((card) => card.instanceId === action.cardId &&
                    (card.ownerPlayerId === actor.id || card.controllerPlayerId === actor.id));
                if (!permanent) {
                    this.emitError(sessionId, 'Permanent not found on your battlefield.');
                    return;
                }
                permanent.tapped = action.tapped;
                this.recordEvent(game, actor.id, action.type, `${actor.name} ${action.tapped ? 'tapped' : 'untapped'} ${permanent.card.name}.`);
                break;
            }
            case 'untap_all': {
                const tappedPermanents = game.battlefield.filter((card) => card.controllerPlayerId === actor.id && card.tapped);
                if (tappedPermanents.length === 0) {
                    return;
                }
                tappedPermanents.forEach((card) => {
                    card.tapped = false;
                });
                this.recordEvent(game, actor.id, action.type, `${actor.name} untapped all permanents they control.`);
                break;
            }
            case 'adjust_life': {
                const targetPlayer = game.players.find((player) => player.id === action.playerId);
                if (!targetPlayer) {
                    this.emitError(sessionId, 'Target player not found.');
                    return;
                }
                const normalizedDelta = Math.max(-99, Math.min(99, Math.trunc(action.delta)));
                if (normalizedDelta === 0) {
                    return;
                }
                targetPlayer.lifeTotal += normalizedDelta;
                this.recordEvent(game, actor.id, action.type, `${actor.name} changed ${targetPlayer.name}'s life by ${normalizedDelta > 0 ? `+${normalizedDelta}` : normalizedDelta}.`);
                break;
            }
            case 'set_permanent_position': {
                const permanent = this.getControllablePermanent(game, actor, action.cardId);
                if (!permanent) {
                    this.emitError(sessionId, 'Permanent not found on your battlefield.');
                    return;
                }
                this.setStackPosition(game, permanent, action.position);
                break;
            }
            case 'set_permanent_stack': {
                const permanent = this.getControllablePermanent(game, actor, action.cardId);
                if (!permanent) {
                    this.emitError(sessionId, 'Permanent not found on your battlefield.');
                    return;
                }
                if (action.stackWithCardId === null) {
                    if (!this.unstackPermanent(game, permanent)) {
                        return;
                    }
                    this.recordEvent(game, actor.id, action.type, `${actor.name} split ${permanent.card.name} out of its stack.`);
                    break;
                }
                const targetPermanent = this.getControllablePermanent(game, actor, action.stackWithCardId);
                if (!targetPermanent) {
                    this.emitError(sessionId, 'Stack target not found on your battlefield.');
                    return;
                }
                if (targetPermanent.controllerPlayerId !== permanent.controllerPlayerId) {
                    this.emitError(sessionId, 'Cards can only stack within the same lane.');
                    return;
                }
                if (!this.setPermanentStack(game, permanent, targetPermanent)) {
                    return;
                }
                this.recordEvent(game, actor.id, action.type, `${actor.name} stacked ${permanent.card.name} with ${targetPermanent.card.name}.`);
                break;
            }
            case 'adjust_permanent_counter': {
                const permanent = this.getControllablePermanent(game, actor, action.cardId);
                if (!permanent) {
                    this.emitError(sessionId, 'Permanent not found on your battlefield.');
                    return;
                }
                const counterKind = sanitizeCounterKind(action.counterKind);
                const normalizedDelta = clampCounterDelta(action.delta);
                if (!counterKind || normalizedDelta === 0) {
                    return;
                }
                const existingCounter = permanent.counters.find((counter) => counter.kind === counterKind);
                if (existingCounter) {
                    existingCounter.amount = Math.max(0, Math.min(99, existingCounter.amount + normalizedDelta));
                }
                else if (normalizedDelta > 0) {
                    permanent.counters.push({
                        kind: counterKind,
                        amount: Math.min(99, normalizedDelta),
                    });
                }
                permanent.counters = permanent.counters.filter((counter) => counter.amount > 0);
                this.recordEvent(game, actor.id, action.type, `${actor.name} adjusted ${counterKind} counters on ${permanent.card.name} by ${normalizedDelta > 0 ? `+${normalizedDelta}` : normalizedDelta}.`);
                break;
            }
            case 'set_permanent_note': {
                const permanent = this.getControllablePermanent(game, actor, action.cardId);
                if (!permanent) {
                    this.emitError(sessionId, 'Permanent not found on your battlefield.');
                    return;
                }
                const nextNote = sanitizePermanentNote(action.note);
                if (nextNote === permanent.note) {
                    return;
                }
                permanent.note = nextNote;
                this.recordEvent(game, actor.id, action.type, nextNote
                    ? `${actor.name} updated the table note on ${permanent.card.name}.`
                    : `${actor.name} cleared the table note on ${permanent.card.name}.`);
                break;
            }
            case 'change_control': {
                const permanent = this.getControllablePermanent(game, actor, action.cardId);
                const targetPlayer = game.players.find((player) => player.id === action.controllerPlayerId);
                if (!permanent) {
                    this.emitError(sessionId, 'Permanent not found on your battlefield.');
                    return;
                }
                if (!targetPlayer) {
                    this.emitError(sessionId, 'Target controller not found.');
                    return;
                }
                this.unstackPermanent(game, permanent);
                permanent.controllerPlayerId = targetPlayer.id;
                permanent.position = this.getAutoBattlefieldPosition(game, targetPlayer.id, permanent.card.typeLine);
                this.recordEvent(game, actor.id, action.type, `${actor.name} moved control of ${permanent.card.name} to ${targetPlayer.name}.`);
                break;
            }
            case 'create_token': {
                const tokenName = action.name.trim().slice(0, 40) || 'Token';
                const tokenType = action.tokenType?.trim().slice(0, 50) || 'Creature Token';
                const tokenNote = sanitizePermanentNote(action.note);
                const tokenColors = Array.isArray(action.colors)
                    ? action.colors.filter((color) => color === 'W' || color === 'U' || color === 'B' || color === 'R' || color === 'G')
                    : [];
                const power = action.power?.trim().slice(0, 4) || undefined;
                const toughness = action.toughness?.trim().slice(0, 4) || undefined;
                const tokenCard = buildTokenCard(actor.id, tokenName, tokenType, tokenColors, tokenNote, power, toughness);
                game.battlefield.push({
                    ...tokenCard,
                    controllerPlayerId: actor.id,
                    tapped: false,
                    enteredAt: new Date().toISOString(),
                    position: action.position
                        ? clampPermanentPosition(action.position)
                        : this.getAutoBattlefieldPosition(game, actor.id, tokenType),
                    stackId: null,
                    stackIndex: 0,
                    counters: [],
                    note: tokenNote,
                    isToken: true,
                });
                this.recordEvent(game, actor.id, action.type, `${actor.name} created ${power && toughness ? `${power}/${toughness} ` : ''}${tokenName}.`);
                break;
            }
        }
        this.emitGameSnapshots(room);
    }
    takeOwnedCard(game, player, fromZone, cardId) {
        switch (fromZone) {
            case 'library':
                return removeCardFromZone(player.library, cardId);
            case 'hand':
                return removeCardFromZone(player.hand, cardId);
            case 'graveyard':
                return removeCardFromZone(player.graveyard, cardId);
            case 'exile':
                return removeCardFromZone(player.exile, cardId);
            case 'command':
                return removeCardFromZone(player.command, cardId);
            case 'battlefield': {
                const permanentIndex = game.battlefield.findIndex((card) => card.instanceId === cardId &&
                    (card.ownerPlayerId === player.id || card.controllerPlayerId === player.id));
                if (permanentIndex < 0) {
                    return null;
                }
                const [permanent] = game.battlefield.splice(permanentIndex, 1);
                this.normalizeStack(game, permanent.stackId);
                return {
                    instanceId: permanent.instanceId,
                    ownerPlayerId: permanent.ownerPlayerId,
                    card: permanent.card,
                };
            }
        }
    }
    placeOwnedCard(game, player, toZone, card, position) {
        const owner = game.players.find((candidate) => candidate.id === card.ownerPlayerId) ?? player;
        switch (toZone) {
            case 'library':
                owner.library.unshift(card);
                break;
            case 'hand':
                owner.hand.push(card);
                break;
            case 'graveyard':
                owner.graveyard.push(card);
                break;
            case 'exile':
                owner.exile.push(card);
                break;
            case 'command':
                owner.command.push(card);
                break;
            case 'battlefield':
                game.battlefield.push({
                    ...card,
                    controllerPlayerId: player.id,
                    tapped: false,
                    enteredAt: new Date().toISOString(),
                    position: position
                        ? clampPermanentPosition(position)
                        : this.getAutoBattlefieldPosition(game, player.id, card.card.typeLine),
                    stackId: null,
                    stackIndex: 0,
                    counters: [],
                    note: '',
                    isToken: isVirtualTokenCard(card.card.id),
                });
                break;
        }
    }
    getControllablePermanent(game, actor, cardId) {
        return game.battlefield.find((card) => card.instanceId === cardId &&
            (card.ownerPlayerId === actor.id || card.controllerPlayerId === actor.id));
    }
    getStackMembers(game, permanent) {
        const stackKey = permanent.stackId ?? permanent.instanceId;
        return game.battlefield
            .filter((card) => (card.stackId ?? card.instanceId) === stackKey)
            .sort(compareStackMembers);
    }
    normalizeStack(game, stackId) {
        if (!stackId) {
            return;
        }
        const members = game.battlefield
            .filter((card) => card.stackId === stackId)
            .sort(compareStackMembers);
        if (members.length <= 1) {
            members.forEach((card) => {
                card.stackId = null;
                card.stackIndex = 0;
            });
            return;
        }
        members.forEach((card, index) => {
            card.stackId = stackId;
            card.stackIndex = index;
        });
    }
    setStackPosition(game, permanent, position) {
        const normalizedPosition = clampPermanentPosition(position);
        const stackMembers = this.getStackMembers(game, permanent);
        stackMembers.forEach((card) => {
            card.position = normalizedPosition;
        });
    }
    setPermanentStack(game, source, target) {
        if (source.instanceId === target.instanceId) {
            return false;
        }
        const sourceStackMembers = this.getStackMembers(game, source);
        const targetStackMembers = this.getStackMembers(game, target);
        const previousSourceStackId = source.stackId;
        const sourceStackKey = source.stackId ?? source.instanceId;
        const targetStackKey = target.stackId ?? target.instanceId;
        if (sourceStackKey === targetStackKey) {
            return false;
        }
        const nextPosition = clampPermanentPosition(target.position);
        targetStackMembers.forEach((card, index) => {
            card.stackId = targetStackKey;
            card.stackIndex = index;
            card.position = nextPosition;
        });
        sourceStackMembers.forEach((card, index) => {
            card.stackId = targetStackKey;
            card.stackIndex = targetStackMembers.length + index;
            card.position = nextPosition;
        });
        this.normalizeStack(game, previousSourceStackId);
        this.normalizeStack(game, targetStackKey);
        return true;
    }
    unstackPermanent(game, permanent) {
        if (!permanent.stackId) {
            return false;
        }
        const previousStackId = permanent.stackId;
        const detachedPosition = clampPermanentPosition({
            x: permanent.position.x + 7,
            y: permanent.position.y + 6,
        });
        permanent.stackId = null;
        permanent.stackIndex = 0;
        permanent.position = detachedPosition;
        this.normalizeStack(game, previousStackId);
        return true;
    }
    getAutoBattlefieldPosition(game, controllerPlayerId, typeLine) {
        const isLand = typeLine.includes('Land');
        const preferredY = isLand ? 80 : /Creature|Planeswalker|Battle/i.test(typeLine) ? 42 : 58;
        const laneCards = game.battlefield.filter((card) => card.controllerPlayerId === controllerPlayerId);
        const rowCards = laneCards.filter((card) => Math.abs(card.position.y - preferredY) < (isLand ? 9 : 14));
        const slotIndex = rowCards.length;
        return clampPermanentPosition({
            x: 12 + (slotIndex % 6) * 14,
            y: preferredY + Math.floor(slotIndex / 6) * (isLand ? 5 : 8),
        });
    }
    buildInitialCommandZone(deck, ownerPlayerId, library) {
        if (deck.format !== 'commander') {
            return [];
        }
        const sideboardCards = expandDeckEntries(deck.sideboard, ownerPlayerId);
        if (sideboardCards.length > 0 && sideboardCards.length <= 2) {
            return sideboardCards;
        }
        const partnerCandidates = deck.mainboard.filter((entry) => entry.quantity === 1 && isCommanderCandidate(entry.card) && hasPartnerText(entry.card));
        const exactCandidates = partnerCandidates.length === 2
            ? partnerCandidates
            : deck.mainboard.filter((entry) => entry.quantity === 1 && isCommanderCandidate(entry.card)).length === 1
                ? deck.mainboard.filter((entry) => entry.quantity === 1 && isCommanderCandidate(entry.card))
                : [];
        return exactCandidates
            .map((entry) => {
            const cardIndex = library.findIndex((card) => card.card.id === entry.card.id);
            if (cardIndex < 0) {
                return null;
            }
            const [card] = library.splice(cardIndex, 1);
            return card;
        })
            .filter((card) => Boolean(card));
    }
    emitRoomSnapshots(room) {
        room.players.forEach((player) => {
            this.dependencies.sendToSession(player.sessionId, {
                type: 'room_snapshot',
                room: this.buildRoomSnapshot(room, player.id),
            });
        });
    }
    emitGameSnapshots(room) {
        if (!room.game) {
            return;
        }
        room.game.players.forEach((player) => {
            this.dependencies.sendToSession(player.sessionId, {
                type: 'game_snapshot',
                game: this.buildGameSnapshot(room.game, player.id),
            });
        });
    }
    buildRoomSnapshot(room, localPlayerId) {
        return {
            roomId: room.roomId,
            code: room.code,
            phase: room.game ? 'game' : 'lobby',
            createdAt: room.createdAt,
            gameId: room.gameId,
            hostPlayerId: room.hostPlayerId,
            localPlayerId,
            minPlayers: PLAY_MIN_PLAYERS,
            maxPlayers: PLAY_MAX_PLAYERS,
            players: room.players.map((player) => ({
                id: player.id,
                name: player.name,
                isHost: player.id === room.hostPlayerId,
                isConnected: player.isConnected,
                selectedDeck: player.selectedDeck ? buildDeckSelectionSummary(player.selectedDeck) : null,
            })),
        };
    }
    buildGameSnapshot(game, localPlayerId) {
        const publicPlayers = game.players.map((player) => ({
            id: player.id,
            name: player.name,
            isConnected: player.isConnected,
            lifeTotal: player.lifeTotal,
            deck: player.selectedDeck,
            zoneCounts: {
                library: player.library.length,
                hand: player.hand.length,
                battlefield: game.battlefield.filter((card) => card.ownerPlayerId === player.id).length,
                graveyard: player.graveyard.length,
                exile: player.exile.length,
                command: player.command.length,
            },
            graveyard: player.graveyard.map((card) => this.toTableCardSnapshot(card)),
            exile: player.exile.map((card) => this.toTableCardSnapshot(card)),
            command: player.command.map((card) => this.toTableCardSnapshot(card)),
        }));
        const localPlayer = game.players.find((player) => player.id === localPlayerId) ?? null;
        return {
            gameId: game.gameId,
            roomId: game.roomId,
            localPlayerId,
            publicState: {
                gameId: game.gameId,
                roomId: game.roomId,
                createdAt: game.createdAt,
                startedAt: game.startedAt,
                battlefield: game.battlefield.map((card) => ({
                    ...this.toTableCardSnapshot(card),
                    controllerPlayerId: card.controllerPlayerId,
                    tapped: card.tapped,
                    enteredAt: card.enteredAt,
                    position: card.position,
                    stackId: card.stackId,
                    stackIndex: card.stackIndex,
                    counters: card.counters,
                    note: card.note,
                    isToken: card.isToken,
                })),
                players: publicPlayers,
                actionLog: game.actionLog,
            },
            privateState: localPlayer
                ? {
                    playerId: localPlayer.id,
                    library: localPlayer.library.map((card) => this.toTableCardSnapshot(card)),
                    hand: localPlayer.hand.map((card) => this.toTableCardSnapshot(card)),
                }
                : null,
        };
    }
    toTableCardSnapshot(card) {
        return {
            instanceId: card.instanceId,
            ownerPlayerId: card.ownerPlayerId,
            card: card.card,
        };
    }
    recordEvent(game, actorPlayerId, actionType, message) {
        game.actionLog = [
            {
                id: crypto.randomUUID(),
                actorPlayerId,
                actionType,
                message,
                createdAt: new Date().toISOString(),
            },
            ...game.actionLog,
        ].slice(0, 18);
    }
    generateUniqueRoomId() {
        let candidate = buildRandomRoomCode();
        while (this.rooms.has(candidate)) {
            candidate = buildRandomRoomCode();
        }
        return candidate;
    }
    createRoomPlayer(sessionId) {
        return {
            id: crypto.randomUUID(),
            sessionId,
            name: this.getPlayerName(sessionId),
            joinedAt: new Date().toISOString(),
            isConnected: true,
            selectedDeck: null,
        };
    }
    getPlayerName(sessionId) {
        return this.sessionNames.get(sessionId) ?? 'Planeswalker';
    }
    getRoomBySession(sessionId) {
        const roomId = this.sessionRoomIds.get(sessionId);
        return roomId ? this.rooms.get(roomId) ?? null : null;
    }
    getRoomByGameId(gameId) {
        const roomId = this.gameRoomIds.get(gameId);
        return roomId ? this.rooms.get(roomId) ?? null : null;
    }
    deleteRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        room.players.forEach((player) => {
            this.sessionRoomIds.delete(player.sessionId);
        });
        if (room.gameId) {
            this.gameRoomIds.delete(room.gameId);
        }
        this.rooms.delete(roomId);
    }
    emitError(sessionId, message) {
        this.dependencies.sendToSession(sessionId, {
            type: 'error',
            message,
        });
    }
    normalizeDeckSelection(deck) {
        if (!deck || !Array.isArray(deck.mainboard)) {
            return null;
        }
        const mainboard = deck.mainboard.filter((entry) => Boolean(entry &&
            typeof entry.quantity === 'number' &&
            entry.quantity > 0 &&
            entry.card &&
            typeof entry.card.id === 'string' &&
            typeof entry.card.name === 'string'));
        const sideboard = Array.isArray(deck.sideboard)
            ? deck.sideboard.filter((entry) => Boolean(entry &&
                typeof entry.quantity === 'number' &&
                entry.quantity > 0 &&
                entry.card &&
                typeof entry.card.id === 'string' &&
                typeof entry.card.name === 'string'))
            : [];
        if (mainboard.length === 0 || countDeckCards(mainboard) === 0) {
            return null;
        }
        return {
            id: deck.id.trim() || crypto.randomUUID(),
            name: deck.name.trim().slice(0, 60) || 'Untitled Deck',
            format: normalizeDeckFormat(deck.format),
            mainboard,
            sideboard,
            mainboardCount: countDeckCards(mainboard),
            sideboardCount: countDeckCards(sideboard),
        };
    }
    formatZoneLabel(zone) {
        switch (zone) {
            case 'battlefield':
                return 'the battlefield';
            case 'library':
                return 'their library';
            case 'graveyard':
                return 'the graveyard';
            case 'exile':
                return 'exile';
            case 'hand':
                return 'their hand';
            case 'command':
                return 'the command zone';
        }
    }
}
//# sourceMappingURL=playServer.js.map