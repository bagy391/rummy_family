/**
 * @module types/card
 * Core card type definitions for the Family Rummy game engine.
 *
 * Uses 3 standard decks + 3 printed jokers = 159 cards total.
 * Each card is uniquely identified by its suit, rank, and deckIndex.
 */

/** Suits in the deck. JOKER is a pseudo-suit for printed joker cards. */
export enum Suit {
  HEARTS = "HEARTS",
  DIAMONDS = "DIAMONDS",
  CLUBS = "CLUBS",
  SPADES = "SPADES",
  JOKER = "JOKER",
}

/**
 * Card ranks from ACE through KING, plus PRINTED_JOKER.
 * ACE is dual: can be low (A-2-3) or high (Q-K-A). K-A-2 is invalid.
 */
export enum Rank {
  ACE = "ACE",
  TWO = "TWO",
  THREE = "THREE",
  FOUR = "FOUR",
  FIVE = "FIVE",
  SIX = "SIX",
  SEVEN = "SEVEN",
  EIGHT = "EIGHT",
  NINE = "NINE",
  TEN = "TEN",
  JACK = "JACK",
  QUEEN = "QUEEN",
  KING = "KING",
  PRINTED_JOKER = "PRINTED_JOKER",
}

/**
 * Represents a single card in the game.
 *
 * @property id - Unique identifier in format `{SUIT_CHAR}{RANK_NUM}_D{DECK_INDEX}`,
 *   e.g. `H7_D0` for Hearts 7, Deck 0. Printed jokers use `J0_D{n}`.
 * @property suit - The suit of the card.
 * @property rank - The rank of the card.
 * @property deckIndex - Which of the 3 decks this card belongs to (0, 1, or 2).
 */
export interface Card {
  readonly id: string;
  readonly suit: Suit;
  readonly rank: Rank;
  readonly deckIndex: 0 | 1 | 2;
}

/** Shorthand character codes for each suit, used in card IDs. */
export const SUIT_CHAR: Record<Suit, string> = {
  [Suit.HEARTS]: "H",
  [Suit.DIAMONDS]: "D",
  [Suit.CLUBS]: "C",
  [Suit.SPADES]: "S",
  [Suit.JOKER]: "J",
};

/** Numeric codes for each rank, used in card IDs. */
export const RANK_NUM: Record<Rank, string> = {
  [Rank.ACE]: "1",
  [Rank.TWO]: "2",
  [Rank.THREE]: "3",
  [Rank.FOUR]: "4",
  [Rank.FIVE]: "5",
  [Rank.SIX]: "6",
  [Rank.SEVEN]: "7",
  [Rank.EIGHT]: "8",
  [Rank.NINE]: "9",
  [Rank.TEN]: "10",
  [Rank.JACK]: "11",
  [Rank.QUEEN]: "12",
  [Rank.KING]: "13",
  [Rank.PRINTED_JOKER]: "0",
};

/** The four natural (non-joker) suits. */
export const NATURAL_SUITS: readonly Suit[] = [
  Suit.HEARTS,
  Suit.DIAMONDS,
  Suit.CLUBS,
  Suit.SPADES,
] as const;

/** All standard ranks (ACE through KING, excluding PRINTED_JOKER). */
export const STANDARD_RANKS: readonly Rank[] = [
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
] as const;
