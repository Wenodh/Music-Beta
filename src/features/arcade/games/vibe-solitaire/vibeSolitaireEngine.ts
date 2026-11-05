export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface Card {
    id: number;
    suit: Suit;
    value: number; // 1 (Ace) to 13 (King)
    faceUp: boolean;
}

export interface SolitaireState {
    stock: Card[];
    waste: Card[];
    foundations: Card[][]; // 4 foundation piles
    tableau: Card[][]; // 7 tableau columns
}

export class VibeSolitaireEngine {
    static createDeck(): Card[] {
        const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
        const deck: Card[] = [];
        let id = 1;

        for (const suit of suits) {
            for (let v = 1; v <= 13; v++) {
                deck.push({
                    id: id++,
                    suit,
                    value: v,
                    faceUp: false,
                });
            }
        }

        // Shuffle deck
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    }

    static dealGame(): SolitaireState {
        const deck = this.createDeck();
        const tableau: Card[][] = [[], [], [], [], [], [], []];

        // Deal into 7 columns (col 0 gets 1, col 1 gets 2, ..., col 6 gets 7)
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                const card = deck.pop()!;
                card.faceUp = j === i; // Top card is face up
                tableau[i].push(card);
            }
        }

        return {
            stock: deck,
            waste: [],
            foundations: [[], [], [], []],
            tableau,
        };
    }

    static isRed(suit: Suit): boolean {
        return suit === 'hearts' || suit === 'diamonds';
    }

    static canMoveToTableau(card: Card, targetColumn: Card[]): boolean {
        if (targetColumn.length === 0) {
            return card.value === 13; // Only Kings on empty columns
        }
        const top = targetColumn[targetColumn.length - 1];
        if (!top.faceUp) return false;
        // Alternate colors and descending by 1
        return this.isRed(card.suit) !== this.isRed(top.suit) && card.value === top.value - 1;
    }

    static canMoveToFoundation(card: Card, foundation: Card[]): boolean {
        if (foundation.length === 0) {
            return card.value === 1; // Only Ace first
        }
        const top = foundation[foundation.length - 1];
        return card.suit === top.suit && card.value === top.value + 1;
    }

    static isGameWon(foundations: Card[][]): boolean {
        return foundations.every((pile) => pile.length === 13);
    }
}
