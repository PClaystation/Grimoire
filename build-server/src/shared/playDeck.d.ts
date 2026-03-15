import type { DeckCardEntry } from '../types/deck.js';
import type { MagicCard } from '../types/scryfall.js';
export interface CardInstance {
    instanceId: string;
    ownerPlayerId: string;
    card: MagicCard;
}
export declare function expandDeckEntries(entries: DeckCardEntry[], ownerPlayerId: string): CardInstance[];
export declare function shuffleCardInstances<CardType>(cards: CardType[], randomSource?: () => number): CardType[];
