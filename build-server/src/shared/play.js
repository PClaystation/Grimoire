export const PLAY_MIN_PLAYERS = 2;
export const PLAY_MAX_PLAYERS = 6;
export const PLAY_STARTING_LIFE_TOTAL = 20;
export const PLAY_OPENING_HAND_SIZE = 7;
export const ROOM_CODE_LENGTH = 6;
export const PLAYER_NAME_MAX_LENGTH = 24;
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