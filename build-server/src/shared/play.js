export const PLAY_MIN_PLAYERS = 2;
export const PLAY_MAX_PLAYERS = 6;
export const PLAY_STARTING_LIFE_TOTAL = 20;
export const PLAY_COMMANDER_STARTING_LIFE_TOTAL = 40;
export const PLAY_OPENING_HAND_SIZE = 7;
export const ROOM_CODE_LENGTH = 6;
export const PLAYER_NAME_MAX_LENGTH = 24;
export const ROOM_NAME_MAX_LENGTH = 48;
export const ROOM_DESCRIPTION_MAX_LENGTH = 180;
export const ROOM_MAX_TAGS = 6;
export const ROOM_TAG_MAX_LENGTH = 18;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function countDeckCards(entries) {
    return entries.reduce((total, entry) => total + entry.quantity, 0);
}
export function createDeckSelectionSnapshot(deck) {
    return {
        id: deck.id,
        name: deck.name,
        format: deck.format,
        mainboard: deck.mainboard,
        sideboard: deck.sideboard,
        mainboardCount: countDeckCards(deck.mainboard),
        sideboardCount: countDeckCards(deck.sideboard),
    };
}
export function buildDeckSelectionSummary(deck) {
    return {
        id: deck.id,
        name: deck.name,
        format: deck.format,
        mainboardCount: deck.mainboardCount,
        sideboardCount: deck.sideboardCount,
    };
}
export function normalizeRoomCode(value) {
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, ROOM_CODE_LENGTH);
}
export function buildRandomRoomCode() {
    let code = '';
    for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
        const alphabetIndex = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
        code += ROOM_CODE_ALPHABET[alphabetIndex];
    }
    return code;
}
export function normalizePlayerName(value) {
    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
        return 'Planeswalker';
    }
    return trimmed.slice(0, PLAYER_NAME_MAX_LENGTH);
}
export function buildDefaultRoomName(hostPlayerName) {
    const normalizedHostName = normalizePlayerName(hostPlayerName);
    return `${normalizedHostName}'s Table`.slice(0, ROOM_NAME_MAX_LENGTH);
}
function sanitizeRoomText(value, maxLength) {
    return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}
function normalizeRoomVisibility(value) {
    return value === 'public' ? 'public' : 'private';
}
function normalizeRoomFormatPreference(value) {
    switch (value) {
        case 'standard':
        case 'pioneer':
        case 'modern':
        case 'legacy':
        case 'vintage':
        case 'pauper':
        case 'commander':
            return value;
        default:
            return 'any';
    }
}
function normalizeRoomPowerLevel(value) {
    switch (value) {
        case 'focused':
        case 'competitive':
            return value;
        default:
            return 'casual';
    }
}
function clampRoomPlayerCount(value, fallback) {
    return Math.max(PLAY_MIN_PLAYERS, Math.min(PLAY_MAX_PLAYERS, Math.round(value ?? fallback)));
}
function normalizeRoomTag(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9+#/ -]/g, '')
        .replace(/\s+/g, ' ')
        .slice(0, ROOM_TAG_MAX_LENGTH);
}
export function normalizeRoomTags(value) {
    const normalizedTags = [];
    const seenTags = new Set();
    for (const tag of value ?? []) {
        const normalizedTag = normalizeRoomTag(tag);
        if (!normalizedTag || seenTags.has(normalizedTag)) {
            continue;
        }
        seenTags.add(normalizedTag);
        normalizedTags.push(normalizedTag);
        if (normalizedTags.length >= ROOM_MAX_TAGS) {
            break;
        }
    }
    return normalizedTags;
}
export function normalizeRoomSettings(value, hostPlayerName = 'Planeswalker') {
    const fallbackMaxPlayers = clampRoomPlayerCount(value?.maxPlayers, PLAY_MAX_PLAYERS);
    const maxPlayers = fallbackMaxPlayers;
    const minPlayers = Math.min(maxPlayers, clampRoomPlayerCount(value?.minPlayers, PLAY_MIN_PLAYERS));
    const name = sanitizeRoomText(value?.name, ROOM_NAME_MAX_LENGTH) || buildDefaultRoomName(hostPlayerName);
    return {
        name,
        visibility: normalizeRoomVisibility(value?.visibility),
        minPlayers,
        maxPlayers,
        format: normalizeRoomFormatPreference(value?.format),
        powerLevel: normalizeRoomPowerLevel(value?.powerLevel),
        description: sanitizeRoomText(value?.description, ROOM_DESCRIPTION_MAX_LENGTH),
        tags: normalizeRoomTags(value?.tags),
    };
}
export function clampPermanentPosition(position) {
    const nextX = typeof position?.x === 'number' ? position.x : 50;
    const nextY = typeof position?.y === 'number' ? position.y : 50;
    return {
        x: Math.max(4, Math.min(96, Number(nextX.toFixed(1)))),
        y: Math.max(8, Math.min(88, Number(nextY.toFixed(1)))),
    };
}
export function normalizeDeckFormat(value) {
    switch (value) {
        case 'standard':
        case 'pioneer':
        case 'modern':
        case 'legacy':
        case 'vintage':
        case 'pauper':
        case 'commander':
            return value;
        default:
            return 'standard';
    }
}
//# sourceMappingURL=play.js.map