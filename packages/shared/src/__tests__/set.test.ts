import { describe, it, expect } from "vitest";
import { isValidSet } from "../engine/set.js";
import { createCard } from "../utils/card-utils.js";
import { Suit, Rank } from "../types/card.js";

const H = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.HEARTS, rank, deck);
const D = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.DIAMONDS, rank, deck);
const C = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.CLUBS, rank, deck);
const S = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.SPADES, rank, deck);
const PJ = (deck: 0 | 1 | 2 = 0) => createCard(Suit.JOKER, Rank.PRINTED_JOKER, deck);

describe("isValidSet", () => {
  const wildRank = Rank.SEVEN;

  it("should accept 3 cards same rank, different suits", () => {
    expect(isValidSet([H(Rank.KING), D(Rank.KING), C(Rank.KING)], wildRank)).toBe(true);
  });

  it("should accept 4 cards same rank, all different suits", () => {
    expect(isValidSet([H(Rank.FIVE), D(Rank.FIVE), C(Rank.FIVE), S(Rank.FIVE)], wildRank)).toBe(true);
  });

  it("should reject 2 cards of same suit", () => {
    expect(isValidSet([H(Rank.KING), H(Rank.KING, 1), D(Rank.KING)], wildRank)).toBe(false);
  });

  it("should reject different ranks", () => {
    expect(isValidSet([H(Rank.KING), D(Rank.QUEEN), C(Rank.KING)], wildRank)).toBe(false);
  });

  it("should reject less than 3 cards", () => {
    expect(isValidSet([H(Rank.KING), D(Rank.KING)], wildRank)).toBe(false);
  });

  it("should accept set with printed joker substitution", () => {
    expect(isValidSet([H(Rank.KING), D(Rank.KING), PJ()], wildRank)).toBe(true);
  });

  it("should accept set with wild joker substitution", () => {
    // 7♣ is wild — used as substitute in a set of Kings
    expect(isValidSet([H(Rank.KING), D(Rank.KING), C(Rank.SEVEN)], wildRank)).toBe(true);
  });

  it("should reject all jokers (no natural cards)", () => {
    expect(isValidSet([PJ(0), PJ(1), PJ(2)], wildRank)).toBe(false);
  });
});
