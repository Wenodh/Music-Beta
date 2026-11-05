export interface MemoryCard {
    id: number;
    symbol: string;
    pairId: number;
    isFlipped: boolean;
    isMatched: boolean;
}

const SYMBOLS = ['🎸', '🎹', '🎷', '🎺', '🥁', '🎧', '📻', '🎙️'];

export class MemoryFlipEngine {
    static createDeck(): MemoryCard[] {
        const deck: MemoryCard[] = [];
        let id = 1;

        SYMBOLS.forEach((sym, pairId) => {
            // Push two cards for each symbol
            deck.push({
                id: id++,
                symbol: sym,
                pairId,
                isFlipped: false,
                isMatched: false,
            });
            deck.push({
                id: id++,
                symbol: sym,
                pairId,
                isFlipped: false,
                isMatched: false,
            });
        });

        // Fisher-Yates shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    }

    static checkMatch(card1: MemoryCard, card2: MemoryCard): boolean {
        return card1.pairId === card2.pairId;
    }
}
