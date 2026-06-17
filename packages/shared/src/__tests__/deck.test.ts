import { describe, it, expect } from "vitest";
import {
  createDeck,
  createShuffledDeck,
  dealCards,
  selectWildJokerCard,
  TOTAL_CARDS,
} from "../engine/deck.js";
import { Suit, Rank, NATURAL_SUITS, STANDARD_RANKS } from "../types/card.js";

describe("createDeck", () => {
  it("should create exactly 159 cards", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(TOTAL_CARDS);
    expect(deck).toHaveLength(159);
  });

  it("should have 156 standard cards + 3 printed jokers", () => {
    const deck = createDeck();
    const printed = deck.filter((c) => c.rank === Rank.PRINTED_JOKER);
    const standard = deck.filter((c) => c.rank !== Rank.PRINTED_JOKER);
    expect(printed).toHaveLength(3);
    expect(standard).toHaveLength(156);
  });

  it("should have 3 copies of each standard card", () => {
    const deck = createDeck();
    for (const suit of NATURAL_SUITS) {
      for (const rank of STANDARD_RANKS) {
        const matches = deck.filter(
          (c) => c.suit === suit && c.rank === rank
        );
        expect(matches).toHaveLength(3);
        // Each from a different deck
        const decks = new Set(matches.map((c) => c.deckIndex));
        expect(decks.size).toBe(3);
      }
    }
  });

  it("should generate unique IDs for all cards", () => {
    const deck = createDeck();
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(159);
  });
});

describe("createShuffledDeck", () => {
  it("should return 159 cards", () => {
    const deck = createShuffledDeck();
    expect(deck).toHaveLength(159);
  });

  it("should produce a different order than unshuffled (probabilistic)", () => {
    const unshuffled = createDeck();
    const shuffled = createShuffledDeck();
    // It's astronomically unlikely they'd be the same
    const sameOrder = unshuffled.every(
      (card, i) => card.id === shuffled[i].id
    );
    expect(sameOrder).toBe(false);
  });
});

describe("dealCards", () => {
  it("should deal 13 cards to each of 4 players", () => {
    const deck = createShuffledDeck();
    const hands = dealCards(deck, 4, 13);
    expect(hands).toHaveLength(4);
    for (const hand of hands) {
      expect(hand).toHaveLength(13);
    }
    // 159 - 52 = 107 remaining
    expect(deck).toHaveLength(107);
  });

  it("should deal 13 cards to each of 6 players", () => {
    const deck = createShuffledDeck();
    const hands = dealCards(deck, 6, 13);
    expect(hands).toHaveLength(6);
    for (const hand of hands) {
      expect(hand).toHaveLength(13);
    }
    // 159 - 78 = 81 remaining
    expect(deck).toHaveLength(81);
  });

  it("should not have any duplicate cards across hands", () => {
    const deck = createShuffledDeck();
    const hands = dealCards(deck, 4, 13);
    const allIds = hands.flat().map((c) => c.id);
    expect(new Set(allIds).size).toBe(52);
  });

  it("should throw if not enough cards", () => {
    const deck = createShuffledDeck();
    expect(() => dealCards(deck, 20, 13)).toThrow();
  });
});

describe("selectWildJokerCard", () => {
  it("should remove and return the top card", () => {
    const deck = createShuffledDeck();
    const topCard = deck[deck.length - 1];
    const initial = deck.length;
    const selected = selectWildJokerCard(deck);
    expect(selected.id).toBe(topCard.id);
    expect(deck).toHaveLength(initial - 1);
  });

  it("should throw on empty deck", () => {
    expect(() => selectWildJokerCard([])).toThrow();
  });
});
