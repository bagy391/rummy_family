/**
 * @module engine/sequence
 * Sequence validation for rummy hands.
 *
 * A sequence is 3+ cards of the same suit in consecutive rank order.
 * - Pure sequence: no jokers used (wild joker in natural position is OK).
 * - Impure sequence: jokers fill gaps.
 * - Ace is dual: A-2-3 (low) or Q-K-A (high). K-A-2 is INVALID.
 */

import { type Card, Rank, Suit } from "../types/card.js";
import { isPrintedJoker, isWildJoker, isWildJokerInNaturalPosition } from "./joker.js";
import { rankToNumber } from "../utils/card-utils.js";

/**
 * Checks whether a group of cards forms a valid pure sequence.
 *
 * Pure sequences contain NO joker substitutions.
 * A wild joker used in its natural suit+rank position counts as natural.
 *
 * @param cards - The cards forming the potential sequence (3+ cards).
 * @param wildRank - The current round's wild joker rank.
 * @returns true if the cards form a valid pure sequence.
 */
export function isPureSequence(cards: readonly Card[], wildRank: Rank): boolean {
  if (cards.length < 3) return false;

  // Separate natural cards and jokers
  const naturalCards: Card[] = [];

  for (const card of cards) {
    if (isPrintedJoker(card)) {
      // Printed joker can never be in a pure sequence
      return false;
    }
    if (isWildJoker(card, wildRank)) {
      // Check if it's in its natural position — we'll verify after sorting
      naturalCards.push(card);
    } else {
      naturalCards.push(card);
    }
  }

  // All cards must be the same suit (excluding joker suit)
  const suits = new Set(naturalCards.map(c => c.suit));
  if (suits.size !== 1) return false;
  const sequenceSuit = naturalCards[0].suit;
  if (sequenceSuit === Suit.JOKER) return false;

  // Sort by rank number
  const sorted = [...naturalCards].sort((a, b) => rankToNumber(a.rank) - rankToNumber(b.rank));

  // Check consecutive — handle Ace-high case
  if (isConsecutive(sorted)) {
    // Verify no wild joker is used as a substitute (not in natural position)
    for (const card of sorted) {
      if (isWildJoker(card, wildRank) && !isWildJokerInNaturalPosition(card, wildRank, sequenceSuit)) {
        return false;
      }
    }
    return true;
  }

  // Try Ace-high: if ACE is present, try treating it as 14
  if (sorted[0].rank === Rank.ACE) {
    return isAceHighConsecutive(sorted, wildRank, sequenceSuit);
  }

  return false;
}

/**
 * Checks whether a group of cards forms a valid impure sequence.
 *
 * Impure sequences allow joker substitutions for missing cards.
 * Must have at least 2 natural cards of the same suit.
 *
 * @param cards - The cards forming the potential sequence (3+ cards).
 * @param wildRank - The current round's wild joker rank.
 * @returns true if the cards form a valid impure sequence (but NOT pure).
 */
export function isImpureSequence(cards: readonly Card[], wildRank: Rank): boolean {
  if (cards.length < 3) return false;

  // If it's already a pure sequence, it's not "impure"
  if (isPureSequence(cards, wildRank)) return false;

  // Separate natural cards from joker substitutions
  const naturalCards: Card[] = [];
  let jokerCount = 0;

  for (const card of cards) {
    if (isPrintedJoker(card)) {
      jokerCount++;
    } else {
      naturalCards.push(card);
    }
  }

  if (naturalCards.length === 0) return false;

  // Find the sequence suit from non-wild natural cards
  const nonWildCards = naturalCards.filter(c => !isWildJoker(c, wildRank));
  if (nonWildCards.length === 0) return false;

  const suits = new Set(nonWildCards.map(c => c.suit));
  if (suits.size !== 1) return false;

  // Determine which cards are used as natural vs joker substitute
  const actualNatural: Card[] = [];
  let actualJokers = jokerCount;

  for (const card of naturalCards) {
    if (isWildJoker(card, wildRank)) {
      // All wild jokers are treated as joker substitutes in impure sequences
      actualJokers++;
    } else {
      actualNatural.push(card);
    }
  }

  // Must have at least 1 natural card
  if (actualNatural.length < 1) return false;

  // Sort natural cards by rank
  const sorted = [...actualNatural].sort((a, b) => rankToNumber(a.rank) - rankToNumber(b.rank));

  // Check if jokers can fill the gaps
  return canFillGaps(sorted, actualJokers, cards.length) ||
    canFillGapsAceHigh(sorted, actualJokers, cards.length);
}

/**
 * Checks if a sequence is valid (either pure or impure).
 */
export function isValidSequence(cards: readonly Card[], wildRank: Rank): boolean {
  return isPureSequence(cards, wildRank) || isImpureSequence(cards, wildRank);
}

// ---- Internal helpers ----

/** Checks if sorted cards are consecutive (Ace-low: A=1). */
function isConsecutive(sorted: readonly Card[]): boolean {
  for (let i = 1; i < sorted.length; i++) {
    const prev = rankToNumber(sorted[i - 1].rank);
    const curr = rankToNumber(sorted[i].rank);
    if (curr !== prev + 1) return false;
  }
  return true;
}

/** Checks Ace-high consecutive: A treated as 14 (after K). */
function isAceHighConsecutive(sorted: readonly Card[], wildRank: Rank, suit: Suit): boolean {
  // Move ACE to end and treat as 14
  const withoutAce = sorted.filter(c => c.rank !== Rank.ACE);
  const aces = sorted.filter(c => c.rank === Rank.ACE);

  if (withoutAce.length === 0 || aces.length === 0) return false;

  // The remaining cards should end at KING, and be consecutive
  const lastNonAce = withoutAce[withoutAce.length - 1];
  if (lastNonAce.rank !== Rank.KING) return false;

  // Check the non-ace cards are consecutive
  if (!isConsecutive(withoutAce)) return false;

  // Verify wild jokers in natural position
  for (const card of sorted) {
    if (isWildJoker(card, wildRank) && !isWildJokerInNaturalPosition(card, wildRank, suit)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if jokers can fill gaps in a sequence (Ace-low).
 * Total sequence length must equal the desired card count.
 */
function canFillGaps(sorted: readonly Card[], jokerCount: number, totalCards: number): boolean {
  if (sorted.length === 0) return jokerCount >= totalCards && totalCards >= 3;

  let jokersNeeded = 0;

  // Gaps between consecutive natural cards
  for (let i = 1; i < sorted.length; i++) {
    const prev = rankToNumber(sorted[i - 1].rank);
    const curr = rankToNumber(sorted[i].rank);
    const gap = curr - prev - 1;
    if (gap < 0) return false; // Duplicate rank (invalid in sequence)
    jokersNeeded += gap;
  }

  // The total sequence spans from first to last natural card + jokers at ends
  const sequenceSpan = sorted.length + jokersNeeded;
  const remainingJokers = jokerCount - jokersNeeded;

  if (remainingJokers < 0) return false;

  // Remaining jokers extend the sequence at either end
  return sequenceSpan + remainingJokers === totalCards;
}

/** Same as canFillGaps but treating Ace as 14 (high). */
function canFillGapsAceHigh(sorted: readonly Card[], jokerCount: number, totalCards: number): boolean {
  const hasAce = sorted.some(c => c.rank === Rank.ACE);
  if (!hasAce) return false;

  // Replace ACE rank number 1 with 14 for the purpose of gap checking
  const adjusted = sorted.map(c => ({
    card: c,
    num: c.rank === Rank.ACE ? 14 : rankToNumber(c.rank),
  }));

  adjusted.sort((a, b) => a.num - b.num);

  let jokersNeeded = 0;
  for (let i = 1; i < adjusted.length; i++) {
    const gap = adjusted[i].num - adjusted[i - 1].num - 1;
    if (gap < 0) return false;
    jokersNeeded += gap;
  }

  const sequenceSpan = adjusted.length + jokersNeeded;
  const remainingJokers = jokerCount - jokersNeeded;

  if (remainingJokers < 0) return false;

  return sequenceSpan + remainingJokers === totalCards;
}
