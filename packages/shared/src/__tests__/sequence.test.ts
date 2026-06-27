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

  it("should reject wild joker of SAME suit used as gap substitute (the real bug case)", () => {
    // 4♠-9♠-5♠ when wild=9 — 9♠ is wild AND same suit as sequence
    // 9♠ is filling the gap for 6♠ (not in its natural rank+suit position)
    // This MUST be impure, not pure — this is the exact Godamani hand scenario
    expect(isPureSequence([S(Rank.FOUR), S(Rank.NINE), S(Rank.FIVE)], Rank.NINE)).toBe(false);
  });

  it("should reject wild joker of same suit filling a non-consecutive gap", () => {
    // 3♥-7♥-6♥ when wild=7 — 7♥ is in natural suit but the natural order is 5♥-6♥-7♥
    // Here 7♥ would be filling gap between 3 and 6 (gap of 2), not natural position
    expect(isPureSequence([H(Rank.THREE), H(Rank.SEVEN), H(Rank.SIX)], wildRank)).toBe(false);
  });

  it("should reject multiple wild jokers used as substitutes in a pure sequence", () => {
    // 4♠-9♠(deck0)-9♠(deck1) when wild=9 — two 9♠s both acting as substitutes, not consecutive
    expect(isPureSequence([S(Rank.FOUR), S(Rank.NINE, 0), S(Rank.NINE, 1)], Rank.NINE)).toBe(false);
  });

  it("should accept wild joker in natural position at START of sequence", () => {
    // 7♥-8♥-9♥ when wild=7 — 7♥ is wild but naturally the first card
    expect(isPureSequence([H(Rank.SEVEN), H(Rank.EIGHT), H(Rank.NINE)], wildRank)).toBe(true);
  });

  it("should accept wild joker in natural position at END of sequence", () => {
    // 5♥-6♥-7♥ when wild=7 — 7♥ is wild but naturally the last card
    expect(isPureSequence([H(Rank.FIVE), H(Rank.SIX), H(Rank.SEVEN)], wildRank)).toBe(true);
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

  it("should accept Ace-high impure sequence with printed joker (Q-K-Joker=A)", () => {
    expect(isImpureSequence([H(Rank.QUEEN), H(Rank.KING), PJ()], wildRank)).toBe(true);
  });

  it("should accept Ace-low impure sequence with printed joker (Joker=A-2-3)", () => {
    expect(isImpureSequence([PJ(), H(Rank.TWO), H(Rank.THREE)], wildRank)).toBe(true);
  });

  it("should accept 1 natural card + 2 jokers forming a 3-card impure sequence", () => {
    // PJ-5♥-PJ — jokers fill 4♥ and 6♥ around the 5♥
    expect(isImpureSequence([PJ(0), H(Rank.FIVE), PJ(1)], wildRank)).toBe(true);
  });

  it("should reject 3 jokers with no natural card", () => {
    expect(isImpureSequence([PJ(0), PJ(1), PJ(2)], wildRank)).toBe(false);
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
