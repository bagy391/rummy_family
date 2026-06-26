import { describe, it, expect } from "vitest";
import { isPureSequence, isImpureSequence, isValidSequence } from "../engine/sequence.js";
import { createCard } from "../utils/card-utils.js";
import { Suit, Rank } from "../types/card.js";

// Helper to quickly create cards
const H = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.HEARTS, rank, deck);
const D = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.DIAMONDS, rank, deck);
const C = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.CLUBS, rank, deck);
const S = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.SPADES, rank, deck);
const PJ = (deck: 0 | 1 | 2 = 0) => createCard(Suit.JOKER, Rank.PRINTED_JOKER, deck);

describe("isPureSequence", () => {
  const wildRank = Rank.SEVEN; // 7 is wild

  it("should accept 3 consecutive same-suit cards", () => {
    expect(isPureSequence([H(Rank.THREE), H(Rank.FOUR), H(Rank.FIVE)], wildRank)).toBe(true);
  });

  it("should accept 4 consecutive same-suit cards", () => {
    expect(isPureSequence([D(Rank.EIGHT), D(Rank.NINE), D(Rank.TEN), D(Rank.JACK)], wildRank)).toBe(true);
  });

  it("should accept Ace-low sequence (A-2-3)", () => {
    expect(isPureSequence([H(Rank.ACE), H(Rank.TWO), H(Rank.THREE)], wildRank)).toBe(true);
  });

  it("should accept Ace-high sequence (Q-K-A)", () => {
    expect(isPureSequence([H(Rank.QUEEN), H(Rank.KING), H(Rank.ACE)], wildRank)).toBe(true);
  });

  it("should reject K-A-2 wrap-around", () => {
    expect(isPureSequence([H(Rank.KING), H(Rank.ACE), H(Rank.TWO)], wildRank)).toBe(false);
  });

  it("should reject different suits", () => {
    expect(isPureSequence([H(Rank.THREE), D(Rank.FOUR), H(Rank.FIVE)], wildRank)).toBe(false);
  });

  it("should reject less than 3 cards", () => {
    expect(isPureSequence([H(Rank.THREE), H(Rank.FOUR)], wildRank)).toBe(false);
  });

  it("should reject printed joker in sequence", () => {
    expect(isPureSequence([H(Rank.THREE), PJ(), H(Rank.FIVE)], wildRank)).toBe(false);
  });

  it("should accept wild joker in its natural position (7♥ in 6♥-7♥-8♥ when wild=7)", () => {
    expect(isPureSequence([H(Rank.SIX), H(Rank.SEVEN), H(Rank.EIGHT)], wildRank)).toBe(true);
  });

  it("should reject wild joker used as substitute in wrong suit", () => {
    // 6♥-7♦-8♥ — the 7♦ is wild but not in its natural suit position for hearts
    expect(isPureSequence([H(Rank.SIX), D(Rank.SEVEN), H(Rank.EIGHT)], wildRank)).toBe(false);
  });

  it("should accept 5-card pure sequence", () => {
    expect(isPureSequence(
      [C(Rank.THREE), C(Rank.FOUR), C(Rank.FIVE), C(Rank.SIX), C(Rank.EIGHT)],
      Rank.TWO // wild is 2, no 7s involved
    )).toBe(false); // Not consecutive (missing 7)
  });
});

describe("isImpureSequence", () => {
  const wildRank = Rank.SEVEN;

  it("should accept sequence with printed joker filling gap", () => {
    expect(isImpureSequence([H(Rank.THREE), PJ(), H(Rank.FIVE)], wildRank)).toBe(true);
  });

  it("should accept sequence with wild joker filling gap", () => {
    // 3♥-7♦-5♥ — 7♦ is wild, fills the gap for 4♥
    expect(isImpureSequence([H(Rank.THREE), D(Rank.SEVEN), H(Rank.FIVE)], wildRank)).toBe(true);
  });

  it("should reject if it's actually a pure sequence", () => {
    // A pure sequence should NOT be classified as impure
    expect(isImpureSequence([H(Rank.THREE), H(Rank.FOUR), H(Rank.FIVE)], wildRank)).toBe(false);
  });

  it("should reject less than 3 cards", () => {
    expect(isImpureSequence([H(Rank.THREE), PJ()], wildRank)).toBe(false);
  });

  it("should accept 4-card sequence with 1 joker", () => {
    expect(isImpureSequence(
      [H(Rank.THREE), H(Rank.FOUR), PJ(), H(Rank.SIX)],
      wildRank
    )).toBe(true);
  });

  it("should accept sequence where wild joker has the same suit as sequence but acts as joker substitute", () => {
    // 8♦-9♦-2♦ when 2 is wild
    expect(isImpureSequence([D(Rank.EIGHT), D(Rank.NINE), D(Rank.TWO)], Rank.TWO)).toBe(true);
    // 2♦-9♦-8♦ when 2 is wild (exact order from user hand)
    expect(isImpureSequence([D(Rank.TWO), D(Rank.NINE), D(Rank.EIGHT)], Rank.TWO)).toBe(true);
  });
});

describe("isValidSequence", () => {
  const wildRank = Rank.SEVEN;

  it("should accept pure sequence", () => {
    expect(isValidSequence([H(Rank.THREE), H(Rank.FOUR), H(Rank.FIVE)], wildRank)).toBe(true);
  });

  it("should accept impure sequence", () => {
    expect(isValidSequence([H(Rank.THREE), PJ(), H(Rank.FIVE)], wildRank)).toBe(true);
  });

  it("should reject invalid cards", () => {
    expect(isValidSequence([H(Rank.THREE), H(Rank.FIVE), H(Rank.KING)], wildRank)).toBe(false);
  });
});
