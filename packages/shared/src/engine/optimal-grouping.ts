/**
 * @module engine/optimal-grouping
 * Optimal grouping algorithm for loser scoring.
 *
 * When a player loses, we need to find the arrangement of their 13 cards
 * that minimizes the total unmatched points. This uses backtracking
 * to search the space of possible groupings.
 *
 * This follows the Rummy rules:
 * 1. First Rummy (Pure Sequence or London) is mandatory to exempt any cards.
 * 2. Second Rummy (any sequence) is mandatory to exempt sets or other groups.
 * 3. All remaining groups must be valid to be exempt (worth 0 points).
 */

import { type Card, Rank } from "../types/card.js";
import type { ClassifiedGroup, OptimalGroupingResult } from "../types/game.js";
import { GroupType } from "../types/game.js";
import { isPureSequence, isImpureSequence } from "./sequence.js";
import { isValidSet } from "./set.js";
import { isLondon } from "./london.js";
import { calculateUnmatchedPoints } from "./scoring.js";
import { isJoker } from "./joker.js";

/**
 * Calculates the score and classification mapping of a specific grouping configuration under the Rummy rules.
 *
 * @returns The total score and the classification mapping for each group.
 */
function scoreGrouping(
  allCards: readonly Card[],
  groups: readonly ClassifiedGroup[],
  wildRank: Rank
): { score: number; classified: ClassifiedGroup[] } {
  const jokers = allCards.filter(c => isJoker(c, wildRank));
  const jokerIds = new Set(jokers.map(c => c.id));

  // Find all First Rummy groups (Pure Sequence or London)
  const firstRummyGroups = groups.filter(
    g => g.type === GroupType.PURE_SEQUENCE || g.type === GroupType.LONDON
  );

  if (firstRummyGroups.length === 0) {
    // Case A: No First Rummy. All non-joker cards in the hand are counted.
    const nonJokerCards = allCards.filter(c => !jokerIds.has(c.id));
    const score = calculateUnmatchedPoints(nonJokerCards, wildRank);
    const classified: ClassifiedGroup[] = groups.map(g => ({
      cards: g.cards,
      type: GroupType.INVALID,
      points: calculateUnmatchedPoints(g.cards, wildRank),
    }));
    return { score, classified };
  }

  // We have at least one First Rummy.
  // If we have multiple First Rummies, or if we have one First Rummy and other groups,
  // we want to choose the best First Rummy 'f' that minimizes the score.
  let bestScore = Infinity;
  let bestClassified: ClassifiedGroup[] = [];

  for (const f of firstRummyGroups) {
    // Check if there is a Second Rummy (any sequence other than f)
    const hasSecondRummy = groups.some(
      g => g !== f && (g.type === GroupType.PURE_SEQUENCE || g.type === GroupType.IMPURE_SEQUENCE)
    );

    let score = 0;
    const classified: ClassifiedGroup[] = [];

    if (hasSecondRummy) {
      // Case C: Has both First and Second Rummy. All groups are valid/exempt.
      // Score is only unmatched cards.
      const groupedCardIds = new Set(groups.flatMap(g => g.cards.map(c => c.id)));
      const unmatchedCards = allCards.filter(c => !groupedCardIds.has(c.id) && !jokerIds.has(c.id));
      score = calculateUnmatchedPoints(unmatchedCards, wildRank);

      for (const g of groups) {
        classified.push({
          cards: g.cards,
          type: g.type,
          points: 0,
        });
      }
    } else {
      // Case B: Has First Rummy 'f' but no Second Rummy. Only group 'f' is exempt.
      // All other groups are treated as invalid and their non-joker cards are counted.
      const fCardIds = new Set(f.cards.map(c => c.id));
      const unmatchedCards = allCards.filter(c => !fCardIds.has(c.id) && !jokerIds.has(c.id));
      score = calculateUnmatchedPoints(unmatchedCards, wildRank);

      for (const g of groups) {
        if (g === f) {
          classified.push({
            cards: g.cards,
            type: g.type,
            points: 0,
          });
        } else {
          classified.push({
            cards: g.cards,
            type: GroupType.INVALID,
            points: calculateUnmatchedPoints(g.cards, wildRank),
          });
        }
      }
    }

    if (score < bestScore) {
      bestScore = score;
      bestClassified = classified;
    }
  }

  return { score: bestScore, classified: bestClassified };
}

/**
 * Finds the optimal grouping of a hand that minimizes unmatched points.
 *
 * Uses a recursive backtracking approach:
 * 1. Try to form valid groups (sequences, sets, londons)
 * 2. Track the minimum points across all arrangements under Rummy rules
 *
 * @param cards - The 13 cards in the player's hand.
 * @param wildRank - The current round's wild joker rank.
 * @returns OptimalGroupingResult with the best arrangement and minimum points.
 */
export function findOptimalGrouping(
  cards: readonly Card[],
  wildRank: Rank
): OptimalGroupingResult {
  // Start with all cards unmatched as the worst case
  const allPoints = calculateUnmatchedPoints(cards, wildRank);
  let bestResult: OptimalGroupingResult = {
    groups: [{ cards: [...cards], type: GroupType.INVALID, points: allPoints }],
    minimumPoints: allPoints,
  };

  // If no points to optimize, return early
  if (allPoints === 0) {
    return bestResult;
  }

  const remainingCards = [...cards];

  // Generate all possible valid groups from the remaining cards
  // Then try combinations via backtracking
  const validGroups: { cards: Card[]; type: GroupType }[] = [];
  findAllValidGroups(remainingCards, wildRank, validGroups);

  // Backtracking search
  const currentGroups: ClassifiedGroup[] = [];
  const usedCardIds = new Set<string>();

  backtrack(
    validGroups,
    0,
    usedCardIds,
    currentGroups,
    cards,
    wildRank,
    bestResult,
    (result) => { bestResult = result; }
  );

  return bestResult;
}

/**
 * Finds all possible valid groups from a set of cards.
 * Generates combinations of 3, 4, 5+ cards and checks validity.
 */
function findAllValidGroups(
  cards: readonly Card[],
  wildRank: Rank,
  result: { cards: Card[]; type: GroupType }[]
): void {
  const n = cards.length;

  // Try all combinations of size 3, 4, 5, ... (max 13)
  for (let size = 3; size <= Math.min(13, n); size++) {
    generateCombinations(cards, size, 0, [], (combo) => {
      // Check if this combination forms a valid group
      if (isLondon(combo)) {
        result.push({ cards: [...combo], type: GroupType.LONDON });
      } else if (isPureSequence(combo, wildRank)) {
        result.push({ cards: [...combo], type: GroupType.PURE_SEQUENCE });
      } else if (isImpureSequence(combo, wildRank)) {
        result.push({ cards: [...combo], type: GroupType.IMPURE_SEQUENCE });
      } else if (isValidSet(combo, wildRank)) {
        result.push({ cards: [...combo], type: GroupType.SET });
      }
    });
  }
}

/** Generates all combinations of given size from cards array. */
function generateCombinations(
  cards: readonly Card[],
  size: number,
  startIdx: number,
  current: Card[],
  callback: (combo: readonly Card[]) => void
): void {
  if (current.length === size) {
    callback(current);
    return;
  }

  const remaining = size - current.length;
  for (let i = startIdx; i <= cards.length - remaining; i++) {
    current.push(cards[i]);
    generateCombinations(cards, size, i + 1, current, callback);
    current.pop();
  }
}

/** Recursive backtracking to find optimal grouping. */
function backtrack(
  validGroups: { cards: Card[]; type: GroupType }[],
  groupIdx: number,
  usedCardIds: Set<string>,
  currentGroups: ClassifiedGroup[],
  allCards: readonly Card[],
  wildRank: Rank,
  bestSoFar: OptimalGroupingResult,
  updateBest: (result: OptimalGroupingResult) => void
): void {
  const unmatchedCards = allCards.filter(c => !usedCardIds.has(c.id));

  // Calculate score for the current configuration
  const { score: currentScore, classified } = scoreGrouping(allCards, currentGroups, wildRank);

  // Update best if current arrangement is better
  if (currentScore < bestSoFar.minimumPoints) {
    const groups: ClassifiedGroup[] = [...classified];
    if (unmatchedCards.length > 0) {
      groups.push({
        cards: unmatchedCards,
        type: GroupType.INVALID,
        points: calculateUnmatchedPoints(unmatchedCards, wildRank),
      });
    }
    updateBest({ groups, minimumPoints: currentScore });
    bestSoFar = { groups, minimumPoints: currentScore };
  }

  // If we found a perfect grouping (0 points), we can stop
  if (bestSoFar.minimumPoints === 0) {
    return;
  }

  // Try each valid group from current index
  for (let i = groupIdx; i < validGroups.length; i++) {
    const group = validGroups[i];

    // Check if all cards in this group are available
    if (group.cards.some(c => usedCardIds.has(c.id))) continue;

    // Add this group
    for (const card of group.cards) {
      usedCardIds.add(card.id);
    }
    currentGroups.push({
      cards: group.cards,
      type: group.type,
      points: 0,
    });

    // Recurse
    backtrack(
      validGroups,
      i + 1,
      usedCardIds,
      currentGroups,
      allCards,
      wildRank,
      bestSoFar,
      (result) => {
        updateBest(result);
        bestSoFar = result;
      }
    );

    // Undo
    currentGroups.pop();
    for (const card of group.cards) {
      usedCardIds.delete(card.id);
    }

    // Early exit if we found 0 points
    if (bestSoFar.minimumPoints === 0) return;
  }
}

