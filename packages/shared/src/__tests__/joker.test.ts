import { describe, it, expect } from "vitest";
import { resolveWildJoker, isPrintedJoker, isWildJoker, isJoker, isWildJokerInNaturalPosition } from "../engine/joker.js";
import { createCard } from "../utils/card-utils.js";
import { Suit, Rank } from "../types/card.js";

const H = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.HEARTS, rank, deck);
const D = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.DIAMONDS, rank, deck);
const PJ = (deck: 0 | 1 | 2 = 0) => createCard(Suit.JOKER, Rank.PRINTED_JOKER, deck);

describe("resolveWildJoker", () => {
  it("should use the card's rank when standard card selected", () => {
    const card = H(Rank.SEVEN);
    const result = resolveWildJoker(card);
    expect(result.card).toBe(card);
    expect(result.wildRank).toBe(Rank.SEVEN);
  });

  it("should use ACE when printed joker is selected", () => {
    const card = PJ();
    const result = resolveWildJoker(card);
    expect(result.card).toBe(card);
    expect(result.wildRank).toBe(Rank.ACE);
  });
});

describe("isPrintedJoker", () => {
  it("should identify printed jokers", () => {
    expect(isPrintedJoker(PJ())).toBe(true);
  });

  it("should not flag standard cards", () => {
    expect(isPrintedJoker(H(Rank.ACE))).toBe(false);
  });
});

describe("isWildJoker", () => {
  it("should identify cards matching wild rank", () => {
    expect(isWildJoker(H(Rank.SEVEN), Rank.SEVEN)).toBe(true);
    expect(isWildJoker(D(Rank.SEVEN), Rank.SEVEN)).toBe(true);
  });

  it("should not flag printed jokers as wild jokers", () => {
    expect(isWildJoker(PJ(), Rank.SEVEN)).toBe(false);
  });

  it("should not flag non-matching ranks", () => {
    expect(isWildJoker(H(Rank.EIGHT), Rank.SEVEN)).toBe(false);
  });
});

describe("isJoker", () => {
  it("should identify printed jokers", () => {
    expect(isJoker(PJ(), Rank.SEVEN)).toBe(true);
  });

  it("should identify wild jokers", () => {
    expect(isJoker(H(Rank.SEVEN), Rank.SEVEN)).toBe(true);
  });

  it("should not flag regular cards", () => {
    expect(isJoker(H(Rank.EIGHT), Rank.SEVEN)).toBe(false);
  });
});

describe("isWildJokerInNaturalPosition", () => {
  it("should return true when wild joker is in matching suit", () => {
    expect(isWildJokerInNaturalPosition(H(Rank.SEVEN), Rank.SEVEN, Suit.HEARTS)).toBe(true);
  });

  it("should return false when wild joker is in different suit", () => {
    expect(isWildJokerInNaturalPosition(D(Rank.SEVEN), Rank.SEVEN, Suit.HEARTS)).toBe(false);
  });

  it("should return false for non-wild cards", () => {
    expect(isWildJokerInNaturalPosition(H(Rank.EIGHT), Rank.SEVEN, Suit.HEARTS)).toBe(false);
  });
});
