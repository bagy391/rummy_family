import { describe, it, expect } from "vitest";
import { calculateUnmatchedPoints, calculateHandScore, getFirstDropScore, getSecondDropScore, getWrongShowScore, isEliminated } from "../engine/scoring.js";
import { createCard } from "../utils/card-utils.js";
import { Suit, Rank } from "../types/card.js";
import { GroupType } from "../types/game.js";
import type { ClassifiedGroup } from "../types/game.js";
import { POINTS_250_CONFIG } from "../configs/points-250.js";

const H = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.HEARTS, rank, deck);
const D = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.DIAMONDS, rank, deck);
const PJ = (deck: 0 | 1 | 2 = 0) => createCard(Suit.JOKER, Rank.PRINTED_JOKER, deck);

const scoring = POINTS_250_CONFIG.scoring;

describe("calculateUnmatchedPoints", () => {
  const wildRank = Rank.SEVEN;

  it("should sum card point values", () => {
    const cards = [H(Rank.ACE), H(Rank.KING), H(Rank.FIVE)];
    expect(calculateUnmatchedPoints(cards, wildRank)).toBe(25); // 10+10+5
  });

  it("should count jokers as 0", () => {
    const cards = [H(Rank.ACE), PJ()];
    expect(calculateUnmatchedPoints(cards, wildRank)).toBe(10);
  });

  it("should count wild jokers as 0", () => {
    const cards = [H(Rank.ACE), H(Rank.SEVEN)]; // 7 is wild
    expect(calculateUnmatchedPoints(cards, wildRank)).toBe(10);
  });

  it("should return 0 for empty cards", () => {
    expect(calculateUnmatchedPoints([], wildRank)).toBe(0);
  });

  it("should count face cards as 10", () => {
    const cards = [H(Rank.JACK), H(Rank.QUEEN), H(Rank.KING)];
    expect(calculateUnmatchedPoints(cards, wildRank)).toBe(30);
  });

  it("should count number cards at face value", () => {
    const cards = [H(Rank.TWO), H(Rank.THREE), H(Rank.NINE)];
    expect(calculateUnmatchedPoints(cards, wildRank)).toBe(14); // 2+3+9
  });
});

describe("calculateHandScore", () => {
  const wildRank = Rank.SEVEN;

  it("should return 0 for all valid groups", () => {
    const groups: ClassifiedGroup[] = [
      { cards: [], type: GroupType.PURE_SEQUENCE, points: 0 },
      { cards: [], type: GroupType.IMPURE_SEQUENCE, points: 0 },
      { cards: [], type: GroupType.SET, points: 0 },
    ];
    expect(calculateHandScore(groups, wildRank, scoring)).toBe(0);
  });

  it("should sum points from invalid groups", () => {
    const groups: ClassifiedGroup[] = [
      { cards: [], type: GroupType.PURE_SEQUENCE, points: 0 },
      { cards: [H(Rank.KING), H(Rank.QUEEN)], type: GroupType.INVALID, points: 20 },
    ];
    expect(calculateHandScore(groups, wildRank, scoring)).toBe(20);
  });

  it("should cap at 80 points", () => {
    const groups: ClassifiedGroup[] = [
      {
        cards: [H(Rank.KING), H(Rank.QUEEN), H(Rank.JACK), H(Rank.ACE),
                D(Rank.KING), D(Rank.QUEEN), D(Rank.JACK), D(Rank.ACE),
                H(Rank.TEN)],
        type: GroupType.INVALID,
        points: 90
      },
    ];
    // calculateHandScore recalculates unmatched points from cards
    expect(calculateHandScore(groups, wildRank, scoring)).toBe(80);
  });
});

describe("drop and show scores", () => {
  it("should return 20 for first drop", () => {
    expect(getFirstDropScore(scoring)).toBe(20);
  });

  it("should return 40 for second drop", () => {
    expect(getSecondDropScore(scoring)).toBe(40);
  });

  it("should return 80 for wrong show", () => {
    expect(getWrongShowScore(scoring)).toBe(80);
  });
});

describe("isEliminated", () => {
  it("should eliminate at 250", () => {
    expect(isEliminated(250, 250)).toBe(true);
    expect(isEliminated(251, 250)).toBe(true);
  });

  it("should not eliminate below 250", () => {
    expect(isEliminated(249, 250)).toBe(false);
    expect(isEliminated(0, 250)).toBe(false);
  });
});
