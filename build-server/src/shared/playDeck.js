export function expandDeckEntries(entries, ownerPlayerId) {
    return entries.flatMap((entry) => Array.from({ length: entry.quantity }, () => ({
        instanceId: crypto.randomUUID(),
        ownerPlayerId,
        card: entry.card,
    })));
}
export function shuffleCardInstances(cards, randomSource = Math.random) {
    const shuffled = [...cards];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const targetIndex = Math.floor(randomSource() * (index + 1));
        [shuffled[index], shuffled[targetIndex]] = [shuffled[targetIndex], shuffled[index]];
    }
    return shuffled;
}
//# sourceMappingURL=playDeck.js.map