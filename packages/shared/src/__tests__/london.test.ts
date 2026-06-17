import { describe, it, expect } from "vitest";
import { isLondon } from "../engine/london.js";
import { createCard } from "../utils/card-utils.js";
import { Suit, Rank } from "../types/card.js";

const H = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.HEARTS, rank, deck);
const D = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.DIAMONDS, rank, deck);
const PJ = (deck: 0 | 1 | 2 = 0) => createCard(Suit.JOKER, Rank.PRINTED_JOKER, deck);

describe("isLondon", () => {
  it("should accept 3 cards same rank, same suit, from 3 different decks", () => {
    expect(isLondon([H(Rank.KING, 0), H(Rank.KING, 1), H(Rank.KING, 2)])).toBe(true);
  });

  it("should accept for any suit", () => {
    expect(isLondon([D(Rank.ACE, 0), D(Rank.ACE, 1), D(Rank.ACE, 2)])).toBe(true);
  });

  it("should reject if not exactly 3 cards", () => {
    expect(isLondon([H(Rank.KING, 0), H(Rank.KING, 1)])).toBe(false);
    expect(isLondon([H(Rank.KING, 0), H(Rank.KING, 1), H(Rank.KING, 2), H(Rank.KING, 0)])).toBe(false);
  });

  it("should reject different suits", () => {
    expect(isLondon([H(Rank.KING, 0), D(Rank.KING, 1), H(Rank.KING, 2)])).toBe(false);
  });

  it("should reject different ranks", () => {
    expect(isLondon([H(Rank.KING, 0), H(Rank.QUEEN, 1), H(Rank.KING, 2)])).toBe(false);
  });

  it("should reject joker suit cards", () => {
    expect(isLondon([PJ(0), PJ(1), PJ(2)])).toBe(false);
  });

  it("should reject if not from 3 different decks", () => {
    expect(isLondon([H(Rank.KING, 0), H(Rank.KING, 0), H(Rank.KING, 2)])).toBe(false);
  });
});
