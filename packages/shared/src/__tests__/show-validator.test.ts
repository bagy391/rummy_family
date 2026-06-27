import { describe, it, expect } from "vitest";
import { validateShow, classifyGroup } from "../engine/hand-validator.js";
import { createCard } from "../utils/card-utils.js";
import { Suit, Rank } from "../types/card.js";
import { GroupType } from "../types/game.js";

const H = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.HEARTS, rank, deck);
const D = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.DIAMONDS, rank, deck);
const C = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.CLUBS, rank, deck);
const S = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.SPADES, rank, deck);
const PJ = (deck: 0 | 1 | 2 = 0) => createCard(Suit.JOKER, Rank.PRINTED_JOKER, deck);

describe("classifyGroup", () => {
  const wildRank = Rank.SEVEN;

  it("should classify London", () => {
    const group = classifyGroup(
      [H(Rank.KING, 0), H(Rank.KING, 1), H(Rank.KING, 2)],
      wildRank
    );
    expect(group.type).toBe(GroupType.LONDON);
    expect(group.points).toBe(0);
  });

  it("should classify pure sequence", () => {
    const group = classifyGroup(
      [D(Rank.THREE), D(Rank.FOUR), D(Rank.FIVE)],
      wildRank
    );
    expect(group.type).toBe(GroupType.PURE_SEQUENCE);
    expect(group.points).toBe(0);
  });

  it("should classify impure sequence with printed joker", () => {
    const group = classifyGroup(
      [D(Rank.THREE), PJ(), D(Rank.FIVE)],
      wildRank
    );
    expect(group.type).toBe(GroupType.IMPURE_SEQUENCE);
    expect(group.points).toBe(0);
  });

  it("should classify wild joker same-suit as IMPURE (not PURE) when used as substitute", () => {
    // 4♠-9♠-5♠ when wild=9 — 9♠ is wild and same suit but fills the gap, NOT natural position
    const group = classifyGroup(
      [S(Rank.FOUR), S(Rank.NINE), S(Rank.FIVE)],
      Rank.NINE
    );
    expect(group.type).toBe(GroupType.IMPURE_SEQUENCE);
    expect(group.points).toBe(0);
  });

  it("should classify valid set", () => {
    const group = classifyGroup(
      [H(Rank.KING), D(Rank.KING), C(Rank.KING)],
      wildRank
    );
    expect(group.type).toBe(GroupType.SET);
    expect(group.points).toBe(0);
  });

  it("should classify invalid group with point count", () => {
    const group = classifyGroup(
      [H(Rank.ACE), D(Rank.FIVE), C(Rank.KING)],
      wildRank
    );
    expect(group.type).toBe(GroupType.INVALID);
    expect(group.points).toBe(25); // 10+5+10
  });
});

describe("validateShow", () => {
  const wildRank = Rank.TWO; // Wild = 2

  it("should accept valid show with First Rummy + Second Rummy + valid groups", () => {
    const groups = [
      // First Rummy: Pure sequence
      [H(Rank.THREE), H(Rank.FOUR), H(Rank.FIVE)],
      // Second Rummy: Impure sequence
      [D(Rank.EIGHT), D(Rank.NINE), PJ()],
      // Valid set
      [H(Rank.KING), D(Rank.KING), C(Rank.KING)],
      // Valid sequence (pure)
      [S(Rank.TEN), S(Rank.JACK), S(Rank.QUEEN), S(Rank.KING)],
    ];
    const result = validateShow(groups, wildRank);
    expect(result.isValid).toBe(true);
    expect(result.hasFirstRummy).toBe(true);
    expect(result.hasSecondRummy).toBe(true);
    expect(result.unmatchedPoints).toBe(0);
  });

  it("should reject show without First Rummy", () => {
    const groups = [
      // Only impure sequences and sets, no pure sequence or London
      [H(Rank.THREE), PJ(), H(Rank.FIVE)],
      [D(Rank.EIGHT), D(Rank.NINE), PJ(1)],
      [H(Rank.KING), D(Rank.KING), C(Rank.KING)],
      [H(Rank.ACE), D(Rank.ACE), C(Rank.ACE), S(Rank.ACE)],
    ];
    const result = validateShow(groups, wildRank);
    expect(result.hasFirstRummy).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it("should reject show without Second Rummy", () => {
    // wildRank = TWO, so all 2s are jokers — avoid using 2s as natural cards
    const groups = [
      // First Rummy: Pure sequence (only one)
      [H(Rank.THREE), H(Rank.FOUR), H(Rank.FIVE)],
      // All sets, no second sequence
      [H(Rank.KING), D(Rank.KING), C(Rank.KING)],
      [H(Rank.ACE), D(Rank.ACE), C(Rank.ACE)],
      [H(Rank.SIX), D(Rank.SIX), C(Rank.SIX), S(Rank.SIX)],
    ];
    const result = validateShow(groups, wildRank);
    expect(result.hasFirstRummy).toBe(true);
    expect(result.hasSecondRummy).toBe(false);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Missing Second Rummy (second sequence, jokers allowed)");
  });

  it("should accept Godamani's exact hand (real-world bug scenario, wild=9)", () => {
    // Round 4 hand: joker=9, show card=K♥, 13 remaining cards
    // Group 1: Printed Joker + K♥ + Q♥  → impure sequence (J♥-Q♥-K♥ with PJ)
    // Group 2: 4♣-5♣-6♣-7♣             → pure sequence (First Rummy)
    // Group 3: 10♥-10♠-10♣             → set
    // Group 4: 4♠-[9♠=Joker]-5♠        → impure sequence (Second Rummy)
    const groups = [
      [PJ(), H(Rank.KING), H(Rank.QUEEN)],
      [C(Rank.FOUR), C(Rank.FIVE), C(Rank.SIX), C(Rank.SEVEN)],
      [H(Rank.TEN), S(Rank.TEN), C(Rank.TEN)],
      [S(Rank.FOUR), S(Rank.NINE), S(Rank.FIVE)],
    ];
    const result = validateShow(groups, Rank.NINE);
    expect(result.isValid).toBe(true);
    expect(result.hasFirstRummy).toBe(true);
    expect(result.hasSecondRummy).toBe(true);
    expect(result.unmatchedPoints).toBe(0);
  });

  it("should reject wrong card count", () => {
    const groups = [
      [H(Rank.THREE), H(Rank.FOUR), H(Rank.FIVE)],
      [D(Rank.EIGHT), D(Rank.NINE), D(Rank.TEN)],
    ];
    const result = validateShow(groups, wildRank);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("13");
  });

  it("should accept London as First Rummy", () => {
    const groups = [
      // First Rummy: London
      [H(Rank.KING, 0), H(Rank.KING, 1), H(Rank.KING, 2)],
      // Second Rummy: sequence
      [D(Rank.THREE), D(Rank.FOUR), D(Rank.FIVE)],
      // Valid set
      [H(Rank.ACE), D(Rank.ACE), C(Rank.ACE)],
      // Another pure sequence (to make 13)
      [S(Rank.TEN), S(Rank.JACK), S(Rank.QUEEN), S(Rank.KING)],
    ];
    const result = validateShow(groups, wildRank);
    expect(result.hasFirstRummy).toBe(true);
    expect(result.isValid).toBe(true);
  });
});
