/**
 * @module engine/scoring
 * Point calculation and scoring engine.
 *
 * Points are calculated for unmatched cards only.
 * Values: A=10, J/Q/K=10, 2-10=face value, Jokers=0.
 * Score is capped at maxPointsPerRound (default 80).
 */

import { type Card, Rank } from "../types/card.js";
import type { ScoringRules } from "../types/config.js";
import type { ClassifiedGroup } from "../types/game.js";
import { GroupType } from "../types/game.js";
import { cardPointValue } from "../utils/card-utils.js";
import { isJoker } from "./joker.js";

/**
 * Calculates points for unmatched (ungrouped) cards.
 *
 * @param cards - The unmatched cards.
 * @param wildRank - The wild joker rank (wild jokers = 0 points).
 * @returns Total point value of unmatched cards.
 */
export function calculateUnmatchedPoints(cards: readonly Card[], wildRank: Rank): number {
  let total = 0;
  for (const card of cards) {
    if (isJoker(card, wildRank)) {
      continue; // Jokers are worth 0
    }
    total += cardPointValue(card);
  }
  return total;
}

/**
 * Calculates the score for a player's hand based on classified groups.
 *
 * Valid groups (PURE_SEQUENCE, IMPURE_SEQUENCE, SET, LONDON) score 0.
 * INVALID groups score the sum of their card point values.
 *
 * @param groups - The classified groups from the player's hand.
 * @param wildRank - The wild joker rank.
 * @param scoringRules - The game mode's scoring rules.
 * @returns The capped score for this round.
 */
export function calculateHandScore(
  groups: readonly ClassifiedGroup[],
  wildRank: Rank,
  scoringRules: ScoringRules
): number {
  let totalPoints = 0;

  for (const group of groups) {
    if (group.type === GroupType.INVALID) {
      totalPoints += calculateUnmatchedPoints(group.cards, wildRank);
    }
  }

  // Cap at maximum per round
  return Math.min(totalPoints, scoringRules.maxPointsPerRound);
}

/**
 * Calculates the first-drop score.
 */
export function getFirstDropScore(scoringRules: ScoringRules): number {
  return scoringRules.firstDropPoints;
}

/**
 * Calculates the second-drop score.
 */
export function getSecondDropScore(scoringRules: ScoringRules): number {
  return scoringRules.secondDropPoints;
}

/**
 * Calculates the wrong-show penalty score.
 */
export function getWrongShowScore(scoringRules: ScoringRules): number {
  return scoringRules.wrongShowPoints;
}

/**
 * Checks if a player is eliminated based on cumulative score.
 *
 * @param totalScore - The player's total cumulative score.
 * @param maxPoints - The elimination threshold.
 * @returns true if the player should be eliminated.
 */
export function isEliminated(totalScore: number, maxPoints: number): boolean {
  return totalScore >= maxPoints;
}
