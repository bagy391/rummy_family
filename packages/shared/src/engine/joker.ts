/**
 * @module engine/joker
 * Joker resolution and classification.
 *
 * Wild joker rules:
 * - A card is turned face-up from the deck; its rank becomes the wild rank.
 * - All cards of that rank (across all suits) become wild jokers.
 * - Special case: if a printed joker is turned up, ACE becomes the wild rank.
 * - Printed jokers are ALWAYS jokers regardless of the wild card selection.
 * - A wild joker in its *natural* position in a sequence is treated as a
 *   natural card, not a joker (e.g., if wild=7, then 6♥-7♥-8♥ is pure).
 */

import { type Card, Rank, Suit } from "../types/card.js";
import type { WildJokerInfo } from "../types/game.js";

/**
 * Resolves which rank becomes the wild joker rank based on the selected card.
 *
 * If the selected card is a printed joker, ACE becomes the wild rank.
 * Otherwise, the wild rank matches the selected card's rank.
 *
 * @param selectedCard - The card turned face-up from the deck.
 * @returns WildJokerInfo containing the card and the resolved wild rank.
 */
export function resolveWildJoker(selectedCard: Card): WildJokerInfo {
  const wildRank =
    selectedCard.rank === Rank.PRINTED_JOKER ? Rank.ACE : selectedCard.rank;

  return {
    card: selectedCard,
    wildRank,
  };
}

/**
 * Checks whether a card is a printed joker.
 */
export function isPrintedJoker(card: Card): boolean {
  return card.rank === Rank.PRINTED_JOKER;
}

/**
 * Checks whether a card is a wild joker (matches the wild rank
 * and is NOT a printed joker).
 *
 * @param card - The card to check.
 * @param wildRank - The rank designated as wild for the current round.
 */
export function isWildJoker(card: Card, wildRank: Rank): boolean {
  return card.rank === wildRank && card.suit !== Suit.JOKER;
}

/**
 * Checks whether a card is ANY type of joker (printed or wild).
 *
 * @param card - The card to check.
 * @param wildRank - The rank designated as wild for the current round.
 */
export function isJoker(card: Card, wildRank: Rank): boolean {
  return isPrintedJoker(card) || isWildJoker(card, wildRank);
}

/**
 * Checks whether a wild joker is used in its natural position within a sequence.
 *
 * A wild joker used in its natural suit and rank position within a
 * sequence counts as a natural card, making the sequence potentially pure.
 *
 * @param card - The card to check.
 * @param wildRank - The wild rank for the current round.
 * @param sequenceSuit - The suit of the sequence being formed.
 * @returns true if the card is a wild joker used in its natural position.
 */
export function isWildJokerInNaturalPosition(
  card: Card,
  wildRank: Rank,
  sequenceSuit: Suit
): boolean {
  return isWildJoker(card, wildRank) && card.suit === sequenceSuit;
}
