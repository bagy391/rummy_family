/**
 * @module engine/london
 * London validation for rummy hands.
 *
 * A London is exactly 3 cards with the same rank AND same suit.
 * Since we use 3 decks, each deck has one copy of each card.
 * If 3 cards share the same rank and suit, they inherently
 * come from 3 different decks — no deck-of-origin tracking needed.
 *
 * London qualifies as a First Rummy (alternative to pure sequence).
 */

import { type Card, Suit } from "../types/card.js";

/**
 * Checks whether a group of cards forms a valid London.
 *
 * Rules:
 * - Exactly 3 cards
 * - All same rank
 * - All same suit
 * - No jokers (printed joker suit doesn't count)
 *
 * @param cards - The cards forming the potential London.
 * @returns true if the cards form a valid London.
 */
export function isLondon(cards: readonly Card[]): boolean {
  // Must be exactly 3 cards
  if (cards.length !== 3) return false;

  const [a, b, c] = cards;

  // No joker-suit cards allowed
  if (a.suit === Suit.JOKER || b.suit === Suit.JOKER || c.suit === Suit.JOKER) {
    return false;
  }

  // All same rank
  if (a.rank !== b.rank || b.rank !== c.rank) return false;

  // All same suit
  if (a.suit !== b.suit || b.suit !== c.suit) return false;

  // All cards must come from different decks (guaranteed by 3-deck setup,
  // but we verify for safety)
  const decks = new Set([a.deckIndex, b.deckIndex, c.deckIndex]);
  if (decks.size !== 3) return false;

  return true;
}
