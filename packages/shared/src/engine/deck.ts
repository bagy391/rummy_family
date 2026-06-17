/**
 * @module engine/deck
 * Deck creation, shuffling, and dealing.
 *
 * A Family Rummy deck consists of 3 standard 52-card decks
 * plus 3 printed jokers = 159 cards total.
 */

import { type Card, NATURAL_SUITS, Rank, STANDARD_RANKS, Suit } from "../types/card.js";
import { createCard } from "../utils/card-utils.js";
import { cryptoShuffle } from "../utils/shuffle.js";

/** Total number of cards in a Family Rummy deck. */
export const TOTAL_CARDS = 159;

/** Number of standard decks combined. */
export const NUM_DECKS = 3;

/** Number of printed jokers. */
export const NUM_PRINTED_JOKERS = 3;

/**
 * Creates an unshuffled Family Rummy deck.
 *
 * The deck contains:
 * - 3 copies of each of the 52 standard cards (156 cards)
 * - 3 printed jokers (one per deck)
 *
 * @returns An array of 159 Card objects.
 */
export function createDeck(): Card[] {
  const cards: Card[] = [];

  for (let deckIndex = 0; deckIndex < NUM_DECKS; deckIndex++) {
    const di = deckIndex as 0 | 1 | 2;

    // Standard cards
    for (const suit of NATURAL_SUITS) {
      for (const rank of STANDARD_RANKS) {
        cards.push(createCard(suit, rank, di));
      }
    }

    // One printed joker per deck
    cards.push(createCard(Suit.JOKER, Rank.PRINTED_JOKER, di));
  }

  return cards;
}

/**
 * Creates a shuffled Family Rummy deck.
 *
 * @returns A shuffled array of 159 Card objects.
 */
export function createShuffledDeck(): Card[] {
  return cryptoShuffle(createDeck());
}

/**
 * Deals cards from the deck to players.
 *
 * Cards are dealt one at a time in round-robin fashion, as in a
 * real card game. The first card goes to the first player, the
 * second to the second player, etc.
 *
 * @param deck - The deck to deal from (will be mutated — cards are removed).
 * @param playerCount - Number of players to deal to.
 * @param cardsPerPlayer - Number of cards each player receives.
 * @returns An array of hands, one per player.
 * @throws Error if the deck doesn't have enough cards.
 */
export function dealCards(
  deck: Card[],
  playerCount: number,
  cardsPerPlayer: number
): Card[][] {
  const totalNeeded = playerCount * cardsPerPlayer;
  if (deck.length < totalNeeded) {
    throw new Error(
      `Not enough cards in deck: need ${totalNeeded}, have ${deck.length}`
    );
  }

  const hands: Card[][] = Array.from({ length: playerCount }, () => []);

  // Deal round-robin
  for (let round = 0; round < cardsPerPlayer; round++) {
    for (let p = 0; p < playerCount; p++) {
      const card = deck.pop()!;
      hands[p].push(card);
    }
  }

  return hands;
}

/**
 * Selects the wild joker card from the top of the remaining deck.
 *
 * After dealing, the top card of the draw pile is turned face-up
 * to determine the wild joker rank for the round.
 *
 * @param deck - The remaining deck after dealing (mutated — one card is removed).
 * @returns The card selected as the wild joker indicator.
 * @throws Error if the deck is empty.
 */
export function selectWildJokerCard(deck: Card[]): Card {
  const card = deck.pop();
  if (!card) {
    throw new Error("Cannot select wild joker from an empty deck");
  }
  return card;
}
