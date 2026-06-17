/**
 * @module engine/hand-validator
 * Hand validation for show declarations.
 *
 * Validates a player's submitted grouping when they declare show:
 * 1. Must have exactly 13 cards in groups (+ 1 show card = 14 total)
 * 2. At least one group must be a First Rummy (Pure Sequence OR London)
 * 3. At least one OTHER group must be a Second Rummy (any valid sequence)
 * 4. All remaining groups must be valid (sequences or sets)
 * 5. No unmatched/ungrouped cards
 */

import { type Card, Rank } from "../types/card.js";
import type { ClassifiedGroup, ShowValidationResult } from "../types/game.js";
import { GroupType } from "../types/game.js";
import { isPureSequence, isImpureSequence } from "./sequence.js";
import { isValidSet } from "./set.js";
import { isLondon } from "./london.js";
import { calculateUnmatchedPoints } from "./scoring.js";

/**
 * Classifies a group of cards into its type.
 *
 * Priority: London > Pure Sequence > Impure Sequence > Set > Invalid
 */
export function classifyGroup(cards: readonly Card[], wildRank: Rank): ClassifiedGroup {
  if (isLondon(cards)) {
    return { cards: [...cards], type: GroupType.LONDON, points: 0 };
  }
  if (isPureSequence(cards, wildRank)) {
    return { cards: [...cards], type: GroupType.PURE_SEQUENCE, points: 0 };
  }
  if (isImpureSequence(cards, wildRank)) {
    return { cards: [...cards], type: GroupType.IMPURE_SEQUENCE, points: 0 };
  }
  if (isValidSet(cards, wildRank)) {
    return { cards: [...cards], type: GroupType.SET, points: 0 };
  }

  // Invalid group — calculate points
  const points = calculateUnmatchedPoints(cards, wildRank);
  return { cards: [...cards], type: GroupType.INVALID, points };
}

/**
 * Validates a player's show declaration.
 *
 * The player submits their 13 cards arranged into groups.
 * The show card (14th card) is handled separately.
 *
 * @param groups - Array of card groups submitted by the player.
 * @param wildRank - The current round's wild joker rank.
 * @returns ShowValidationResult with validity and error details.
 */
export function validateShow(
  groups: readonly Card[][],
  wildRank: Rank
): ShowValidationResult {
  const errors: string[] = [];

  // Count total cards across all groups
  const totalCards = groups.reduce((sum, g) => sum + g.length, 0);
  if (totalCards !== 13) {
    errors.push(`Expected 13 cards in groups, got ${totalCards}`);
    return {
      isValid: false,
      errors,
      hasFirstRummy: false,
      hasSecondRummy: false,
      unmatchedPoints: 0,
    };
  }

  // Classify all groups
  const classified = groups.map(g => classifyGroup(g, wildRank));

  // Check for invalid groups
  const invalidGroups = classified.filter(g => g.type === GroupType.INVALID);
  if (invalidGroups.length > 0) {
    errors.push(`${invalidGroups.length} invalid group(s) found`);
  }

  // Check First Rummy: Pure Sequence or London
  const firstRummyGroup = classified.find(
    g => g.type === GroupType.PURE_SEQUENCE || g.type === GroupType.LONDON
  );
  const hasFirstRummy = !!firstRummyGroup;
  if (!hasFirstRummy) {
    errors.push("Missing First Rummy (pure sequence or London)");
  }

  // Check Second Rummy: any valid sequence (can be pure or impure)
  // Must be a DIFFERENT group from the First Rummy
  let hasSecondRummy = false;
  for (const group of classified) {
    if (group === firstRummyGroup) continue; // Skip the first rummy group
    if (
      group.type === GroupType.PURE_SEQUENCE ||
      group.type === GroupType.IMPURE_SEQUENCE
    ) {
      hasSecondRummy = true;
      break;
    }
  }
  if (!hasSecondRummy) {
    errors.push("Missing Second Rummy (second sequence, jokers allowed)");
  }

  // Calculate unmatched points
  const unmatchedPoints = classified
    .filter(g => g.type === GroupType.INVALID)
    .reduce((sum, g) => sum + g.points, 0);

  const isValid = hasFirstRummy && hasSecondRummy && invalidGroups.length === 0;

  return {
    isValid,
    errors,
    hasFirstRummy,
    hasSecondRummy,
    unmatchedPoints,
  };
}

/**
 * Validates a complete show action (14 cards: 13 in groups + 1 show card).
 *
 * @param groups - The card groups submitted by the player.
 * @param showCard - The 14th card being placed as the show card.
 * @param hand - The player's full hand (14 cards after drawing).
 * @param wildRank - The wild joker rank.
 * @returns ShowValidationResult
 */
export function validateShowAction(
  groups: readonly Card[][],
  showCard: Card,
  hand: readonly Card[],
  wildRank: Rank
): ShowValidationResult {
  // Verify all cards belong to the player's hand
  const allGroupCards = groups.flat();
  const allCards = [...allGroupCards, showCard];

  if (allCards.length !== 14) {
    return {
      isValid: false,
      errors: [`Expected 14 cards total (13 in groups + 1 show card), got ${allCards.length}`],
      hasFirstRummy: false,
      hasSecondRummy: false,
      unmatchedPoints: 0,
    };
  }

  // Check that all submitted cards exist in the player's hand
  const handIds = new Set(hand.map(c => c.id));
  const missingCards = allCards.filter(c => !handIds.has(c.id));
  if (missingCards.length > 0) {
    return {
      isValid: false,
      errors: [`${missingCards.length} card(s) not in your hand`],
      hasFirstRummy: false,
      hasSecondRummy: false,
      unmatchedPoints: 0,
    };
  }

  // Check for duplicate card IDs
  const usedIds = new Set<string>();
  for (const card of allCards) {
    if (usedIds.has(card.id)) {
      return {
        isValid: false,
        errors: [`Duplicate card: ${card.id}`],
        hasFirstRummy: false,
        hasSecondRummy: false,
        unmatchedPoints: 0,
      };
    }
    usedIds.add(card.id);
  }

  // Validate the 13 cards in groups
  return validateShow(groups, wildRank);
}
