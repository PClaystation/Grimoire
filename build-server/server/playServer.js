import { PLAY_COMMANDER_STARTING_LIFE_TOTAL, PLAY_OPENING_HAND_SIZE, PLAY_STARTING_LIFE_TOTAL, buildDefaultRoomName, buildDeckSelectionSummary, buildRandomRoomCode, countDeckCards, normalizeDeckFormat, normalizePlayerName, normalizeRoomCode, normalizeRoomSettings, clampPermanentPosition, } from '../src/shared/play.js';
import { expandDeckEntries, shuffleCardInstances } from '../src/shared/playDeck.js';
import { applyPlayerDesignation, buildInitialCommandZone, formatZoneLabel, getAutoBattlefieldPosition, getControllablePermanent, getNextPlayer, placeOwnedCardInZone, setPermanentStack, setStackPosition, takeOwnedCardFromZone, unstackPermanent, } from './play-server/gameState.js';
import { buildDebugDeckSelection, buildDefaultPlayerDesignations, buildTokenCard, clampCounterDelta, clampDrawAmount, clampTurnNumber, DEBUG_ROOM_INITIAL_PLACEHOLDERS, DEFAULT_DISCONNECT_GRACE_PERIOD_MS, sanitizeCounterKind, sanitizeDebugRoomPassword, sanitizeLabel, sanitizePermanentNote, sanitizePlayerCounterKind, sanitizePlayerNote, sanitizeTargets, } from './play-server/helpers.js';
import { buildGameSnapshot, buildRoomDirectoryEntry, buildRoomSnapshot, } from './play-server/snapshots.js';
export class PlayServer {
    dependencies;
    rooms = new Map();
    gameRoomIds = new Map();
    sessionRoomIds = new Map();
    sessionNames = new Map();
    knownSessionIds = new Set();
    debugUnlockedSessions = new Set();
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
        this.knownSessionIds.add(sessionId);
        const room = this.getRoomBySession(sessionId);
        this.dependencies.sendToSession(sessionId, {
            type: 'session_ready',
            sessionId,
            playerName: normalizedName,
            roomId: room?.roomId ?? null,
            gameId: room?.gameId ?? null,
            debugUnlocked: this.debugUnlockedSessions.has(sessionId),
        });
        this.emitRoomDirectorySnapshots([sessionId]);
        if (!room) {
            return;
        }
        const roomPlayer = room.players.find((player) => player.sessionId === sessionId);
        const roomSpectator = room.spectators.find((spectator) => spectator.sessionId === sessionId);
        if (roomPlayer) {
            roomPlayer.name = normalizedName;
            roomPlayer.isConnected = true;
            roomPlayer.connectionState = 'connected';
        }
        if (roomSpectator) {
            roomSpectator.name = normalizedName;
        }
        const gamePlayer = room.game?.players.find((player) => player.sessionId === sessionId);
        if (gamePlayer) {
            gamePlayer.name = normalizedName;
            gamePlayer.isConnected = true;
            gamePlayer.connectionState = 'connected';
        }
        if (roomSpectator) {
            roomSpectator.connectionState = 'connected';
        }
        this.emitRoomSnapshots(room);
        this.emitGameSnapshots(room);
    }
    handleDisconnect(sessionId) {
        this.clearPendingDisconnect(sessionId);
        const room = this.getRoomBySession(sessionId);
        if (room) {
            const roomPlayer = room.players.find((player) => player.sessionId === sessionId);
            const roomSpectator = room.spectators.find((spectator) => spectator.sessionId === sessionId);
            const gamePlayer = room.game?.players.find((player) => player.sessionId === sessionId);
            if (roomPlayer && roomPlayer.connectionState === 'connected') {
                roomPlayer.connectionState = 'reconnecting';
            }
            if (roomSpectator && roomSpectator.connectionState === 'connected') {
                roomSpectator.connectionState = 'reconnecting';
            }
            if (gamePlayer && gamePlayer.connectionState === 'connected') {
                gamePlayer.connectionState = 'reconnecting';
            }
            this.emitRoomSnapshots(room);
            this.emitGameSnapshots(room);
        }
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
            roomPlayer.connectionState = 'disconnected';
        }
        const roomSpectator = room.spectators.find((spectator) => spectator.sessionId === sessionId);
        if (roomSpectator) {
            roomSpectator.connectionState = 'disconnected';
        }
        const gamePlayer = room.game?.players.find((player) => player.sessionId === sessionId);
        if (gamePlayer) {
            gamePlayer.isConnected = false;
            gamePlayer.connectionState = 'disconnected';
        }
        const activePlayers = room.players.filter((player) => player.connectionState !== 'disconnected');
        const activeSpectators = room.spectators.filter((spectator) => spectator.connectionState !== 'disconnected');
        if (activePlayers.length === 0 && activeSpectators.length === 0) {
            this.deleteRoom(room.roomId);
            return;
        }
        if (!room.game && !activePlayers.some((player) => player.id === room.hostPlayerId)) {
            if (activePlayers[0]) {
                room.hostPlayerId = activePlayers[0].id;
            }
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
            case 'unlock_debug_mode':
                this.unlockDebugMode(sessionId, message.password);
                break;
            case 'create_debug_room':
                this.createDebugRoom(sessionId, message.settings);
                break;
            case 'create_room':
                this.createRoom(sessionId, message.settings);
                break;
            case 'join_room':
                this.joinRoom(sessionId, message.roomId, message.role);
                break;
            case 'leave_room':
                this.leaveRoom(sessionId, message.roomId);
                break;
            case 'update_room_settings':
                this.updateRoomSettings(sessionId, message.roomId, message.settings);
                break;
            case 'add_debug_player':
                this.addDebugPlayer(sessionId, message.roomId, message.name);
                break;
            case 'remove_debug_player':
                this.removeDebugPlayer(sessionId, message.roomId, message.playerId);
                break;
            case 'select_deck':
                this.selectDeck(sessionId, message.roomId, message.deck);
                break;
            case 'start_game':
                this.startGame(sessionId, message.roomId);
                break;
            case 'send_chat':
                this.sendChatMessage(sessionId, message.roomId, message.message);
                break;
            case 'game_action':
                this.applyGameAction(sessionId, message.gameId, message.action);
                break;
        }
    }
    createRoom(sessionId, settings) {
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
            debugMode: false,
            settings: normalizeRoomSettings(settings, player.name),
            players: [player],
            spectators: [],
            chat: [],
            gameId: null,
            game: null,
        };
        this.rooms.set(roomId, room);
        this.sessionRoomIds.set(sessionId, roomId);
        this.emitRoomSnapshots(room);
    }
    unlockDebugMode(sessionId, password) {
        const expectedPassword = sanitizeDebugRoomPassword(process.env.PLAY_DEBUG_ROOM_SECRET ?? 'grimoire-lab');
        const providedPassword = sanitizeDebugRoomPassword(password);
        if (!providedPassword || providedPassword !== expectedPassword) {
            this.emitError(sessionId, 'Incorrect debug room password.');
            return;
        }
        this.debugUnlockedSessions.add(sessionId);
        this.handleHello(sessionId, this.getPlayerName(sessionId));
    }
    createDebugRoom(sessionId, settings) {
        if (!this.debugUnlockedSessions.has(sessionId)) {
            this.emitError(sessionId, 'Unlock the debug room first.');
            return;
        }
        const existingRoom = this.getRoomBySession(sessionId);
        if (existingRoom) {
            this.emitRoomSnapshots(existingRoom);
            return;
        }
        const roomId = this.generateUniqueRoomId();
        const player = this.createRoomPlayer(sessionId);
        const createdAt = new Date().toISOString();
        const normalizedSettings = normalizeRoomSettings({
            ...settings,
            visibility: 'private',
            minPlayers: 1,
            name: settings?.name ?? `${buildDefaultRoomName(player.name)} Debug`,
        }, player.name);
        normalizedSettings.minPlayers = 1;
        const room = {
            roomId,
            code: roomId,
            createdAt,
            hostPlayerId: player.id,
            debugMode: true,
            settings: normalizedSettings,
            players: [player],
            spectators: [],
            chat: [],
            gameId: null,
            game: null,
        };
        for (let index = 0; index < DEBUG_ROOM_INITIAL_PLACEHOLDERS; index += 1) {
            room.players.push(this.createDebugPlaceholderPlayer(index + 2));
        }
        this.rooms.set(roomId, room);
        this.sessionRoomIds.set(sessionId, roomId);
        this.emitRoomSnapshots(room);
    }
    joinRoom(sessionId, requestedRoomId, requestedRole) {
        const roomId = normalizeRoomCode(requestedRoomId);
        const room = this.rooms.get(roomId);
        const role = requestedRole === 'spectator' ? 'spectator' : 'player';
        if (!room) {
            this.emitError(sessionId, 'Room not found.');
            return;
        }
        if (room.debugMode && !this.debugUnlockedSessions.has(sessionId)) {
            this.emitError(sessionId, 'This room requires debug access.');
            return;
        }
        const existingRoom = this.getRoomBySession(sessionId);
        if (existingRoom && existingRoom.roomId !== room.roomId) {
            this.emitError(sessionId, 'Leave your current room before joining another one.');
            return;
        }
        const existingPlayer = room.players.find((player) => player.sessionId === sessionId);
        const existingSpectator = room.spectators.find((spectator) => spectator.sessionId === sessionId);
        if (existingPlayer) {
            existingPlayer.name = this.getPlayerName(sessionId);
            existingPlayer.isConnected = true;
            existingPlayer.connectionState = 'connected';
            this.sessionRoomIds.set(sessionId, room.roomId);
            this.emitRoomSnapshots(room);
            this.emitGameSnapshots(room);
            return;
        }
        if (existingSpectator) {
            existingSpectator.name = this.getPlayerName(sessionId);
            existingSpectator.connectionState = 'connected';
            this.sessionRoomIds.set(sessionId, room.roomId);
            this.emitRoomSnapshots(room);
            this.emitGameSnapshots(room);
            return;
        }
        if (role === 'spectator') {
            room.spectators.push(this.createSpectator(sessionId));
            this.sessionRoomIds.set(sessionId, room.roomId);
            this.emitRoomSnapshots(room);
            this.emitGameSnapshots(room);
            return;
        }
        if (room.game) {
            this.emitError(sessionId, 'This room already started a game. Join as a spectator instead.');
            return;
        }
        if (room.players.length >= room.settings.maxPlayers) {
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
        const isPlayer = room.players.some((player) => player.sessionId === sessionId);
        const isSpectator = room.spectators.some((spectator) => spectator.sessionId === sessionId);
        if (room.game && isPlayer) {
            this.emitError(sessionId, 'Leaving an active game is not supported yet. Close the tab to disconnect instead.');
            return;
        }
        room.players = room.players.filter((player) => player.sessionId !== sessionId);
        room.spectators = room.spectators.filter((spectator) => spectator.sessionId !== sessionId);
        this.sessionRoomIds.delete(sessionId);
        this.dependencies.sendToSession(sessionId, {
            type: 'room_left',
            roomId: room.roomId,
        });
        if (room.players.length === 0 && room.spectators.length === 0) {
            this.deleteRoom(room.roomId);
            return;
        }
        if (!room.players.some((player) => player.id === room.hostPlayerId)) {
            if (room.players[0]) {
                room.hostPlayerId = room.players[0].id;
            }
        }
        this.emitRoomSnapshots(room);
        if (room.game && isSpectator) {
            this.emitGameSnapshots(room);
        }
    }
    updateRoomSettings(sessionId, requestedRoomId, settings) {
        const room = this.getRoomBySession(sessionId);
        if (!room || room.roomId !== normalizeRoomCode(requestedRoomId)) {
            this.emitError(sessionId, 'You are not in that room.');
            return;
        }
        if (room.game) {
            this.emitError(sessionId, 'Room settings cannot be changed after the game starts.');
            return;
        }
        const hostPlayer = room.players.find((player) => player.id === room.hostPlayerId);
        if (!hostPlayer || hostPlayer.sessionId !== sessionId) {
            this.emitError(sessionId, 'Only the host can change room settings.');
            return;
        }
        const normalizedSettings = normalizeRoomSettings(settings, hostPlayer.name);
        if (room.debugMode) {
            normalizedSettings.visibility = 'private';
            normalizedSettings.minPlayers = 1;
        }
        if (normalizedSettings.maxPlayers < room.players.length) {
            this.emitError(sessionId, 'Increase the player limit or remove players before shrinking the room.');
            return;
        }
        room.settings = normalizedSettings;
        this.emitRoomSnapshots(room);
    }
    addDebugPlayer(sessionId, requestedRoomId, name) {
        const room = this.getRoomBySession(sessionId);
        if (!room || room.roomId !== normalizeRoomCode(requestedRoomId)) {
            this.emitError(sessionId, 'You are not in that room.');
            return;
        }
        if (!room.debugMode) {
            this.emitError(sessionId, 'Debug players can only be added in a debug room.');
            return;
        }
        const hostPlayer = room.players.find((player) => player.id === room.hostPlayerId);
        if (!hostPlayer || hostPlayer.sessionId !== sessionId) {
            this.emitError(sessionId, 'Only the host can add debug players.');
            return;
        }
        if (room.game) {
            this.emitError(sessionId, 'Debug players can only be added before the game starts.');
            return;
        }
        if (room.players.length >= room.settings.maxPlayers) {
            this.emitError(sessionId, 'This room is full.');
            return;
        }
        room.players.push(this.createDebugPlaceholderPlayer(room.players.length + 1, name));
        this.emitRoomSnapshots(room);
    }
    removeDebugPlayer(sessionId, requestedRoomId, playerId) {
        const room = this.getRoomBySession(sessionId);
        if (!room || room.roomId !== normalizeRoomCode(requestedRoomId)) {
            this.emitError(sessionId, 'You are not in that room.');
            return;
        }
        if (!room.debugMode) {
            this.emitError(sessionId, 'Debug players can only be removed in a debug room.');
            return;
        }
        const hostPlayer = room.players.find((player) => player.id === room.hostPlayerId);
        if (!hostPlayer || hostPlayer.sessionId !== sessionId) {
            this.emitError(sessionId, 'Only the host can remove debug players.');
            return;
        }
        if (room.game) {
            this.emitError(sessionId, 'Debug players can only be removed before the game starts.');
            return;
        }
        const debugPlayerIndex = room.players.findIndex((player) => player.id === playerId && player.sessionId === null);
        if (debugPlayerIndex < 0) {
            this.emitError(sessionId, 'Debug player not found.');
            return;
        }
        if (room.players[debugPlayerIndex]?.id === room.hostPlayerId) {
            this.emitError(sessionId, 'You cannot remove the host player.');
            return;
        }
        room.players.splice(debugPlayerIndex, 1);
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
    sendChatMessage(sessionId, requestedRoomId, message) {
        const room = this.getRoomBySession(sessionId);
        if (!room || room.roomId !== normalizeRoomCode(requestedRoomId)) {
            this.emitError(sessionId, 'You are not in that room.');
            return;
        }
        const nextMessage = this.sanitizeChatMessage(message);
        if (!nextMessage) {
            this.emitError(sessionId, 'Chat messages cannot be empty.');
            return;
        }
        const roomPlayer = room.players.find((player) => player.sessionId === sessionId);
        const roomSpectator = room.spectators.find((spectator) => spectator.sessionId === sessionId);
        if (!roomPlayer && !roomSpectator) {
            this.emitError(sessionId, 'Participant not found in room.');
            return;
        }
        const senderRole = roomPlayer ? 'player' : 'spectator';
        room.chat = [
            ...room.chat,
            {
                id: crypto.randomUUID(),
                senderId: roomPlayer?.id ?? roomSpectator.id,
                senderName: roomPlayer?.name ?? roomSpectator.name,
                senderRole,
                message: nextMessage,
                createdAt: new Date().toISOString(),
            },
        ].slice(-80);
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
        if (room.players.length < room.settings.minPlayers) {
            if (!room.debugMode) {
                this.emitError(sessionId, `You need at least ${room.settings.minPlayers} players to start this room.`);
                return;
            }
        }
        if (!room.debugMode &&
            room.players.some((player) => player.connectionState !== 'connected')) {
            this.emitError(sessionId, 'All lobby players need to be connected before starting.');
            return;
        }
        if (!room.debugMode && room.players.some((player) => player.selectedDeck === null)) {
            this.emitError(sessionId, 'Every player needs to choose a deck before starting.');
            return;
        }
        const startedAt = new Date().toISOString();
        const gameId = crypto.randomUUID();
        const fallbackDeck = room.players.find((player) => player.selectedDeck)?.selectedDeck ?? null;
        const players = [];
        for (const player of room.players) {
            const selectedDeck = player.selectedDeck ??
                (room.debugMode
                    ? fallbackDeck ?? buildDebugDeckSelection(player.name)
                    : null);
            if (!selectedDeck) {
                this.emitError(sessionId, 'Every player needs to choose a deck before starting.');
                return;
            }
            const library = shuffleCardInstances(expandDeckEntries(selectedDeck.mainboard, player.id));
            const command = this.buildInitialCommandZone(selectedDeck, player.id, library);
            const hand = library.splice(0, PLAY_OPENING_HAND_SIZE);
            players.push({
                id: player.id,
                sessionId: player.sessionId,
                name: player.name,
                isConnected: player.isConnected,
                connectionState: player.connectionState,
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
                counters: [],
                note: '',
                designations: buildDefaultPlayerDesignations(),
                commanderTax: 0,
                commanderDamage: [],
            });
        }
        room.gameId = gameId;
        room.game = {
            gameId,
            roomId: room.roomId,
            createdAt: room.createdAt,
            startedAt,
            turn: {
                turnNumber: 1,
                activePlayerId: players[0]?.id ?? hostPlayer.id,
            },
            stack: [],
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
            if (room.spectators.some((spectator) => spectator.sessionId === sessionId)) {
                this.emitError(sessionId, 'Spectators cannot take game actions.');
                return;
            }
            this.emitError(sessionId, 'You are not part of this game.');
            return;
        }
        if (game.turn.activePlayerId !== actor.id) {
            const activePlayer = game.players.find((player) => player.id === game.turn.activePlayerId);
            this.emitError(sessionId, `It is currently ${activePlayer?.name ?? 'another player'}'s turn.`);
            return;
        }
        switch (action.type) {
            case 'shuffle_library': {
                actor.library = shuffleCardInstances(actor.library);
                this.recordEvent(game, actor.id, action.type, `${actor.name} shuffled their library.`);
                break;
            }
            case 'advance_turn': {
                const nextPlayer = (action.nextPlayerId
                    ? game.players.find((player) => player.id === action.nextPlayerId)
                    : null) ?? this.getNextPlayer(game, game.turn.activePlayerId);
                if (!nextPlayer) {
                    this.emitError(sessionId, 'Next player not found.');
                    return;
                }
                game.turn.activePlayerId = nextPlayer.id;
                game.turn.turnNumber = clampTurnNumber(game.turn.turnNumber + 1, game.turn.turnNumber + 1);
                this.recordEvent(game, actor.id, action.type, `${actor.name} passed the turn to ${nextPlayer.name}.`);
                break;
            }
            case 'set_active_player': {
                const targetPlayer = game.players.find((player) => player.id === action.playerId);
                if (!targetPlayer) {
                    this.emitError(sessionId, 'Target player not found.');
                    return;
                }
                game.turn.activePlayerId = targetPlayer.id;
                game.turn.turnNumber = clampTurnNumber(action.turnNumber, game.turn.turnNumber);
                this.recordEvent(game, actor.id, action.type, `${actor.name} set ${targetPlayer.name} as the active player.`);
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
            case 'adjust_player_counter': {
                const targetPlayer = game.players.find((player) => player.id === action.playerId);
                if (!targetPlayer) {
                    this.emitError(sessionId, 'Target player not found.');
                    return;
                }
                const counterKind = sanitizePlayerCounterKind(action.counterKind);
                const normalizedDelta = clampCounterDelta(action.delta);
                if (!counterKind || normalizedDelta === 0) {
                    return;
                }
                const existingCounter = targetPlayer.counters.find((counter) => counter.kind === counterKind);
                if (existingCounter) {
                    existingCounter.amount = Math.max(0, Math.min(999, existingCounter.amount + normalizedDelta));
                }
                else if (normalizedDelta > 0) {
                    targetPlayer.counters.push({
                        kind: counterKind,
                        amount: normalizedDelta,
                    });
                }
                targetPlayer.counters = targetPlayer.counters.filter((counter) => counter.amount > 0);
                this.recordEvent(game, actor.id, action.type, `${actor.name} adjusted ${targetPlayer.name}'s ${counterKind} counter by ${normalizedDelta > 0 ? `+${normalizedDelta}` : normalizedDelta}.`);
                break;
            }
            case 'set_player_note': {
                const targetPlayer = game.players.find((player) => player.id === action.playerId);
                if (!targetPlayer) {
                    this.emitError(sessionId, 'Target player not found.');
                    return;
                }
                const nextNote = sanitizePlayerNote(action.note);
                if (nextNote === targetPlayer.note) {
                    return;
                }
                targetPlayer.note = nextNote;
                this.recordEvent(game, actor.id, action.type, nextNote
                    ? `${actor.name} updated ${targetPlayer.name}'s player note.`
                    : `${actor.name} cleared ${targetPlayer.name}'s player note.`);
                break;
            }
            case 'set_player_designation': {
                const targetPlayer = game.players.find((player) => player.id === action.playerId);
                if (!targetPlayer) {
                    this.emitError(sessionId, 'Target player not found.');
                    return;
                }
                this.applyPlayerDesignation(game, targetPlayer.id, action.designation, action.value);
                this.recordEvent(game, actor.id, action.type, `${actor.name} ${action.value ? 'gave' : 'cleared'} ${action.designation === 'citys_blessing'
                    ? "city's blessing"
                    : `the ${action.designation}`} ${action.value ? 'to ' : 'from '}${targetPlayer.name}.`);
                break;
            }
            case 'adjust_commander_tax': {
                const targetPlayer = game.players.find((player) => player.id === action.playerId);
                if (!targetPlayer) {
                    this.emitError(sessionId, 'Target player not found.');
                    return;
                }
                const normalizedDelta = clampCounterDelta(action.delta);
                if (normalizedDelta === 0) {
                    return;
                }
                targetPlayer.commanderTax = Math.max(0, Math.min(99, targetPlayer.commanderTax + normalizedDelta));
                this.recordEvent(game, actor.id, action.type, `${actor.name} adjusted ${targetPlayer.name}'s commander tax by ${normalizedDelta > 0 ? `+${normalizedDelta}` : normalizedDelta}.`);
                break;
            }
            case 'adjust_commander_damage': {
                const targetPlayer = game.players.find((player) => player.id === action.playerId);
                const sourcePlayer = game.players.find((player) => player.id === action.sourcePlayerId);
                if (!targetPlayer || !sourcePlayer) {
                    this.emitError(sessionId, 'Commander damage player not found.');
                    return;
                }
                const normalizedDelta = clampCounterDelta(action.delta);
                if (normalizedDelta === 0) {
                    return;
                }
                const existingEntry = targetPlayer.commanderDamage.find((entry) => entry.sourcePlayerId === sourcePlayer.id);
                if (existingEntry) {
                    existingEntry.amount = Math.max(0, Math.min(99, existingEntry.amount + normalizedDelta));
                }
                else if (normalizedDelta > 0) {
                    targetPlayer.commanderDamage.push({
                        sourcePlayerId: sourcePlayer.id,
                        amount: normalizedDelta,
                    });
                }
                targetPlayer.commanderDamage = targetPlayer.commanderDamage.filter((entry) => entry.amount > 0);
                this.recordEvent(game, actor.id, action.type, `${actor.name} adjusted commander damage from ${sourcePlayer.name} to ${targetPlayer.name} by ${normalizedDelta > 0 ? `+${normalizedDelta}` : normalizedDelta}.`);
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
            case 'set_permanent_face_down': {
                const permanent = this.getControllablePermanent(game, actor, action.cardId);
                if (!permanent) {
                    this.emitError(sessionId, 'Permanent not found on your battlefield.');
                    return;
                }
                permanent.faceDown = action.faceDown;
                this.recordEvent(game, actor.id, action.type, `${actor.name} turned ${action.faceDown ? permanent.card.name : 'a face-down card'} ${action.faceDown ? 'face down' : 'face up'}.`);
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
            case 'create_stack_item': {
                let sourceCard = null;
                let sourceZone = null;
                if (action.cardId && action.fromZone) {
                    sourceCard = this.takeOwnedCard(game, actor, action.fromZone, action.cardId);
                    if (!sourceCard) {
                        this.emitError(sessionId, 'Card not found in that zone.');
                        return;
                    }
                    sourceZone = action.fromZone;
                }
                const fallbackLabel = sourceCard?.card.name ??
                    (action.itemType === 'ability'
                        ? 'Ability'
                        : action.itemType === 'trigger'
                            ? 'Triggered ability'
                            : 'Spell');
                game.stack.unshift({
                    id: crypto.randomUUID(),
                    controllerPlayerId: actor.id,
                    itemType: action.itemType,
                    label: sanitizeLabel(action.label, fallbackLabel),
                    sourceZone,
                    sourceCard,
                    note: sanitizePermanentNote(action.note),
                    targets: sanitizeTargets(action.targets),
                    createdAt: new Date().toISOString(),
                    faceDown: Boolean(action.faceDown),
                });
                this.recordEvent(game, actor.id, action.type, `${actor.name} added ${sanitizeLabel(action.label, fallbackLabel)} to the stack.`);
                break;
            }
            case 'resolve_stack_item':
            case 'remove_stack_item': {
                const stackIndex = game.stack.findIndex((entry) => entry.id === action.stackItemId);
                if (stackIndex < 0) {
                    this.emitError(sessionId, 'Stack item not found.');
                    return;
                }
                const [stackItem] = game.stack.splice(stackIndex, 1);
                if (stackItem.sourceCard) {
                    const fallbackZone = stackItem.itemType === 'spell' &&
                        /Artifact|Creature|Enchantment|Land|Planeswalker|Battle/i.test(stackItem.sourceCard.card.typeLine)
                        ? 'battlefield'
                        : 'graveyard';
                    this.placeOwnedCard(game, actor, action.toZone ?? fallbackZone, stackItem.sourceCard, action.position);
                }
                this.recordEvent(game, actor.id, action.type, `${actor.name} ${action.type === 'resolve_stack_item' ? 'resolved' : 'removed'} ${stackItem.label} from the stack.`);
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
                    faceDown: false,
                });
                this.recordEvent(game, actor.id, action.type, `${actor.name} created ${power && toughness ? `${power}/${toughness} ` : ''}${tokenName}.`);
                break;
            }
        }
        this.emitGameSnapshots(room);
    }
    takeOwnedCard(game, player, fromZone, cardId) {
        return takeOwnedCardFromZone(game, player, fromZone, cardId);
    }
    placeOwnedCard(game, player, toZone, card, position) {
        placeOwnedCardInZone(game, player, toZone, card, position);
    }
    getNextPlayer(game, activePlayerId) {
        return getNextPlayer(game, activePlayerId);
    }
    applyPlayerDesignation(game, targetPlayerId, designation, value) {
        applyPlayerDesignation(game, targetPlayerId, designation, value);
    }
    getControllablePermanent(game, actor, cardId) {
        return getControllablePermanent(game, actor, cardId);
    }
    setStackPosition(game, permanent, position) {
        setStackPosition(game, permanent, position);
    }
    setPermanentStack(game, source, target) {
        return setPermanentStack(game, source, target);
    }
    unstackPermanent(game, permanent) {
        return unstackPermanent(game, permanent);
    }
    getAutoBattlefieldPosition(game, controllerPlayerId, typeLine) {
        return getAutoBattlefieldPosition(game, controllerPlayerId, typeLine);
    }
    buildInitialCommandZone(deck, ownerPlayerId, library) {
        return buildInitialCommandZone(deck, ownerPlayerId, library);
    }
    emitRoomSnapshots(room) {
        room.players.forEach((player) => {
            if (!player.sessionId) {
                return;
            }
            this.dependencies.sendToSession(player.sessionId, {
                type: 'room_snapshot',
                room: this.buildRoomSnapshot(room, { role: 'player', id: player.id }),
            });
        });
        room.spectators.forEach((spectator) => {
            this.dependencies.sendToSession(spectator.sessionId, {
                type: 'room_snapshot',
                room: this.buildRoomSnapshot(room, { role: 'spectator', id: spectator.id }),
            });
        });
        this.emitRoomDirectorySnapshots();
    }
    emitGameSnapshots(room) {
        if (!room.game) {
            return;
        }
        room.game.players.forEach((player) => {
            if (!player.sessionId) {
                return;
            }
            this.dependencies.sendToSession(player.sessionId, {
                type: 'game_snapshot',
                game: this.buildGameSnapshot(room.game, player.id, 'player', room.debugMode),
            });
        });
        room.spectators.forEach((spectator) => {
            this.dependencies.sendToSession(spectator.sessionId, {
                type: 'game_snapshot',
                game: this.buildGameSnapshot(room.game, null, 'spectator', room.debugMode),
            });
        });
    }
    buildRoomSnapshot(room, viewer) {
        return buildRoomSnapshot(room, viewer);
    }
    emitRoomDirectorySnapshots(targetSessionIds) {
        const directory = Array.from(this.rooms.values())
            .map((room) => this.buildRoomDirectoryEntry(room))
            .filter((room) => Boolean(room))
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        const sessions = targetSessionIds ? Array.from(targetSessionIds) : Array.from(this.knownSessionIds);
        sessions.forEach((sessionId) => {
            this.dependencies.sendToSession(sessionId, {
                type: 'room_directory',
                rooms: directory,
            });
        });
    }
    buildRoomDirectoryEntry(room) {
        return buildRoomDirectoryEntry(room);
    }
    buildGameSnapshot(game, localPlayerId, viewerRole, debugMode) {
        return buildGameSnapshot(game, localPlayerId, viewerRole, debugMode);
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
            connectionState: 'connected',
            selectedDeck: null,
            isDebugPlaceholder: false,
        };
    }
    createSpectator(sessionId) {
        return {
            id: crypto.randomUUID(),
            sessionId,
            name: this.getPlayerName(sessionId),
            joinedAt: new Date().toISOString(),
            connectionState: 'connected',
        };
    }
    createDebugPlaceholderPlayer(seatNumber, name) {
        const playerName = normalizePlayerName(name ?? `Seat ${seatNumber}`);
        return {
            id: crypto.randomUUID(),
            sessionId: null,
            name: playerName,
            joinedAt: new Date().toISOString(),
            isConnected: false,
            connectionState: 'disconnected',
            selectedDeck: buildDebugDeckSelection(playerName),
            isDebugPlaceholder: true,
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
            if (!player.sessionId) {
                return;
            }
            this.sessionRoomIds.delete(player.sessionId);
        });
        room.spectators.forEach((spectator) => {
            this.sessionRoomIds.delete(spectator.sessionId);
        });
        if (room.gameId) {
            this.gameRoomIds.delete(room.gameId);
        }
        this.rooms.delete(roomId);
        this.emitRoomDirectorySnapshots();
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
    sanitizeChatMessage(message) {
        return message.trim().replace(/\s+/g, ' ').slice(0, 280);
    }
    formatZoneLabel(zone) {
        return formatZoneLabel(zone);
    }
}
//# sourceMappingURL=playServer.js.map