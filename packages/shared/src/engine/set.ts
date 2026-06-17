/**
 * @module engine/set
 * Set validation for rummy hands.
 *
 * A valid set is:
 * - 3 or 4 cards of the same rank
 * - All from different suits (no two cards of the same suit)
 * - Jokers (printed or wild) can substitute for missing cards
 * - With jokers, max group size is still 4 (rank cards) + jokers
 */

import { type Card, Rank, Suit } from "../types/card.js";
import { isJoker } from "./joker.js";

/**
 * Checks whether a group of cards forms a valid set.
 *
 * Rules:
 * - Minimum 3 cards total
 * - All natural (non-joker) cards must have the same rank
 * - No two natural cards can have the same suit
 * - Maximum 4 natural cards (one per suit)
 * - Jokers can fill remaining slots
 *
 * @param cards - The cards forming the potential set.
 * @param wildRank - The current round's wild joker rank.
 * @returns true if the cards form a valid set.
 */
export function isValidSet(cards: readonly Card[], wildRank: Rank): boolean {
  if (cards.length < 3) return false;

  // Separate natural cards from jokers
  const naturalCards: Card[] = [];
  let jokerCount = 0;

  for (const card of cards) {
    if (isJoker(card, wildRank)) {
      jokerCount++;
    } else {
      naturalCards.push(card);
    }
  }

  // Must have at least 1 natural card to define the set rank
  if (naturalCards.length === 0) return false;

  // All natural cards must have the same rank
  const setRank = naturalCards[0].rank;
  if (!naturalCards.every(c => c.rank === setRank)) return false;

  // No two natural cards can share the same suit
  const suits = new Set(naturalCards.map(c => c.suit));
  if (suits.size !== naturalCards.length) return false;

  // All suits must be valid (not JOKER suit)
  if (naturalCards.some(c => c.suit === Suit.JOKER)) return false;

  // Maximum 4 different suits for natural cards
  if (naturalCards.length > 4) return false;

  // Total cards (natural + jokers) should be reasonable
  // A set can have at most 4 natural cards + extra jokers is debatable,
  // but typically max set size = 4 + jokers filling up to make it valid
  // Standard rule: max 4 natural cards in a set, jokers can substitute
  if (naturalCards.length + jokerCount < 3) return false;

  return true;
}
