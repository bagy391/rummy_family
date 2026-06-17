/**
 * @module utils/card-utils
 * Pure utility functions for card manipulation.
 *
 * These helpers deal with rank-to-number conversions, point values,
 * card comparison, sorting, and human-readable formatting.
 */

import { type Card, Rank, RANK_NUM, Suit, SUIT_CHAR } from "../types/card.js";

/** Ordered array for mapping rank enum values to their numeric positions. */
const RANK_ORDER: readonly Rank[] = [
  Rank.ACE,
  Rank.TWO,
  Rank.THREE,
  Rank.FOUR,
  Rank.FIVE,
  Rank.SIX,
  Rank.SEVEN,
  Rank.EIGHT,
  Rank.NINE,
  Rank.TEN,
  Rank.JACK,
  Rank.QUEEN,
  Rank.KING,
];

/**
 * Converts a rank to its numeric value for sequence ordering.
 * ACE = 1, TWO = 2, ... KING = 13.
 * PRINTED_JOKER returns 0.
 */
export function rankToNumber(rank: Rank): number {
  if (rank === Rank.PRINTED_JOKER) return 0;
  const idx = RANK_ORDER.indexOf(rank);
  return idx + 1; // ACE=1, TWO=2, ..., KING=13
}

/**
 * Converts a numeric value back to a rank.
 * 1 = ACE, 2 = TWO, ..., 13 = KING.
 * 0 = PRINTED_JOKER.
 *
 * @throws Error if the number is out of range.
 */
export function numberToRank(num: number): Rank {
  if (num === 0) return Rank.PRINTED_JOKER;
  if (num < 1 || num > 13) {
    throw new Error(`Invalid rank number: ${num}`);
  }
  return RANK_ORDER[num - 1];
}

/**
 * Returns the point value of a card.
 *
 * - ACE, JACK, QUEEN, KING = 10 points
 * - TWO through TEN = face value (2–10)
 * - PRINTED_JOKER = 0 points
 *
 * @param card - The card to evaluate.
 */
export function cardPointValue(card: Card): number {
  if (card.rank === Rank.PRINTED_JOKER || card.suit === Suit.JOKER) return 0;
  const num = rankToNumber(card.rank);
  if (num >= 10 || num === 1) return 10; // A, J, Q, K
  return num;
}

/** Suit ordering for consistent sorting. */
const SUIT_ORDER: Record<Suit, number> = {
  [Suit.HEARTS]: 0,
  [Suit.DIAMONDS]: 1,
  [Suit.CLUBS]: 2,
  [Suit.SPADES]: 3,
  [Suit.JOKER]: 4,
};

/**
 * Compares two cards for sorting: first by suit, then by rank, then by deckIndex.
 *
 * @returns Negative if a < b, positive if a > b, zero if equal.
 */
export function compareCards(a: Card, b: Card): number {
  const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
  if (suitDiff !== 0) return suitDiff;

  const rankDiff = rankToNumber(a.rank) - rankToNumber(b.rank);
  if (rankDiff !== 0) return rankDiff;

  return a.deckIndex - b.deckIndex;
}

/**
 * Returns a new array of cards sorted by suit → rank → deckIndex.
 * Does not mutate the input array.
 */
export function sortHand(cards: readonly Card[]): Card[] {
  return [...cards].sort(compareCards);
}

/** Human-readable rank names. */
const RANK_DISPLAY: Record<Rank, string> = {
  [Rank.ACE]: "A",
  [Rank.TWO]: "2",
  [Rank.THREE]: "3",
  [Rank.FOUR]: "4",
  [Rank.FIVE]: "5",
  [Rank.SIX]: "6",
  [Rank.SEVEN]: "7",
  [Rank.EIGHT]: "8",
  [Rank.NINE]: "9",
  [Rank.TEN]: "10",
  [Rank.JACK]: "J",
  [Rank.QUEEN]: "Q",
  [Rank.KING]: "K",
  [Rank.PRINTED_JOKER]: "PJ",
};

/** Human-readable suit symbols. */
const SUIT_DISPLAY: Record<Suit, string> = {
  [Suit.HEARTS]: "♥",
  [Suit.DIAMONDS]: "♦",
  [Suit.CLUBS]: "♣",
  [Suit.SPADES]: "♠",
  [Suit.JOKER]: "★",
};

/**
 * Formats a card for human-readable display.
 *
 * @example
 * formatCard(card) // "7♥" or "PJ★"
 */
export function formatCard(card: Card): string {
  return `${RANK_DISPLAY[card.rank]}${SUIT_DISPLAY[card.suit]}`;
}

/**
 * Generates the canonical card ID string.
 *
 * Format: `{SUIT_CHAR}{RANK_NUM}_D{DECK_INDEX}`
 * Examples: `H7_D0`, `D1_D2`, `J0_D1`
 */
export function generateCardId(suit: Suit, rank: Rank, deckIndex: 0 | 1 | 2): string {
  return `${SUIT_CHAR[suit]}${RANK_NUM[rank]}_D${deckIndex}`;
}

/**
 * Creates a Card object from its constituent parts.
 */
export function createCard(suit: Suit, rank: Rank, deckIndex: 0 | 1 | 2): Card {
  return {
    id: generateCardId(suit, rank, deckIndex),
    suit,
    rank,
    deckIndex,
  };
}
