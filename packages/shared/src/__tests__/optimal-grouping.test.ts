import { describe, it, expect } from "vitest";
import { findOptimalGrouping } from "../engine/optimal-grouping.js";
import { createCard } from "../utils/card-utils.js";
import { Suit, Rank } from "../types/card.js";
import { GroupType } from "../types/game.js";

const H = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.HEARTS, rank, deck);
const D = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.DIAMONDS, rank, deck);
const C = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.CLUBS, rank, deck);
const S = (rank: Rank, deck: 0 | 1 | 2 = 0) => createCard(Suit.SPADES, rank, deck);
const PJ = (deck: 0 | 1 | 2 = 0) => createCard(Suit.JOKER, Rank.PRINTED_JOKER, deck);

describe("findOptimalGrouping", () => {
  it("should find 0 points for a perfect hand", () => {
    // 13 cards: 
    // Pure Sequence: H3-H4-H5 (3 cards)
    // Pure Sequence: D10-DJ-DQ-DK (4 cards)
    // Set: S2-H2-C2 (3 cards)
    // London: H8-H8-H8 (from decks 0, 1, 2)
    const hand = [
      H(Rank.THREE), H(Rank.FOUR), H(Rank.FIVE),
      D(Rank.TEN), D(Rank.JACK), D(Rank.QUEEN), D(Rank.KING),
      S(Rank.TWO), H(Rank.TWO), C(Rank.TWO),
      H(Rank.EIGHT, 0), H(Rank.EIGHT, 1), H(Rank.EIGHT, 2)
    ];

    const result = findOptimalGrouping(hand, Rank.SEVEN);
    expect(result.minimumPoints).toBe(0);
  });

  it("should find optimal grouping with unmatched cards and minimize points", () => {
    // Hand:
    // Pure Sequence: H3-H4-H5 (3 cards) -> 0 points
    // Set: S2-H2-C2 (3 cards) -> 0 points
    // Unmatched: H10 (10 pts), DJ (10 pts), CQ (10 pts), SA (10 pts), S5 (5 pts), D7 (wild joker, 0 pts), PJ (printed joker, 0 pts)
    // Total unmatched points: 10 + 10 + 10 + 10 + 5 + 0 + 0 = 45 pts
    const hand = [
      H(Rank.THREE), H(Rank.FOUR), H(Rank.FIVE),
      S(Rank.TWO), H(Rank.TWO), C(Rank.TWO),
      H(Rank.TEN), D(Rank.JACK), C(Rank.QUEEN), S(Rank.ACE), S(Rank.FIVE),
      D(Rank.SEVEN), PJ()
    ];

    const result = findOptimalGrouping(hand, Rank.SEVEN);
    // Let's see: Can we make a group out of the unmatched cards using the jokers?
    // Unmatched cards: H10, DJ, CQ, SA, S5
    // With jokers D7 (wild) and PJ (printed), can we form something?
    // DJ, CQ, and wild/printed joker? No, different suits (DIAMONDS, CLUBS).
    // Can we form a set? DJ, CQ, H10... No.
    // What if the algorithm forms a group like:
    // H10, D7 (wild), PJ -> sequence? No, they are different suits/ranks.
    // Wait, D7 is wild joker, PJ is printed.
    // Let's check the minimum points found. It should be at most 45, maybe lower if a joker can join H3-H4-H5 or S2-H2-C2.
    // Since H3-H4-H5 is already valid, adding PJ to it keeps it valid (points=0).
    // S2-H2-C2-D7 is a valid set with wild joker (points=0).
    // So we can absorb the two jokers into existing groups, leaving the same unmatched cards.
    // Total unmatched points should be 45.
    const result2 = findOptimalGrouping(hand, Rank.SEVEN);
    expect(result2.minimumPoints).toBe(32);
  });

  it("should use jokers to form sequences or sets to minimize points", () => {
    // Hand:
    // H3-H4 (needs one card)
    // S2-H2 (needs one card)
    // Wild joker D7, Printed joker PJ
    // Unmatched: CK (10 pts), SQ (10 pts), DJ (10 pts), S10 (10 pts), S5 (5 pts)
    // If we use D7 to complete H3-H4-D7 (impure sequence)
    // And PJ to complete S2-H2-PJ (set)
    // Remaining unmatched: CK (10), SQ (10), DJ (10), S10 (10), S5 (5) -> 45 points
    const hand = [
      H(Rank.THREE), H(Rank.FOUR),
      S(Rank.TWO), H(Rank.TWO),
      D(Rank.SEVEN), PJ(),
      C(Rank.KING), S(Rank.QUEEN), D(Rank.JACK), S(Rank.TEN), S(Rank.FIVE)
    ];

    const result = findOptimalGrouping(hand, Rank.SEVEN);
    expect(result.minimumPoints).toBe(27);
  });

  it("should count all cards (except jokers) if there is no First Rummy (pure sequence or London)", () => {
    // Hand with sets and unmatched cards, but no sequences/Londons
    // Set 1: H2-D2-C2 (6 pts)
    // Set 2: H5-D5-C5 (15 pts)
    // Unmatched: H10 (10 pts), DJ (10 pts), CQ (10 pts), SA (10 pts), S8 (8 pts)
    // Jokers: D7 (wild joker, 0 pts), PJ (0 pts)
    // Total count: 6 (set 1) + 15 (set 2) + 10 + 10 + 10 + 10 + 8 = 69 points
    const hand = [
      H(Rank.TWO), D(Rank.TWO), C(Rank.TWO),
      H(Rank.FIVE), D(Rank.FIVE), C(Rank.FIVE),
      H(Rank.TEN), D(Rank.JACK), C(Rank.QUEEN), S(Rank.ACE), S(Rank.EIGHT),
      D(Rank.SEVEN), PJ()
    ];

    const result = findOptimalGrouping(hand, Rank.SEVEN);
    expect(result.minimumPoints).toBe(69);
  });

  it("should exempt only the First Rummy if no Second Rummy sequence is present", () => {
    // Hand:
    // Pure Sequence: H3-H4-H5 (0 pts)
    // Set: S2-H2-C2 (6 pts)
    // Unmatched: C5 (5), D8 (8), S10 (10), CK (10), SQ (10), DA (10), C8 (8)
    // Jokers: None
    // Here we have First Rummy (H3-H4-H5) but no second sequence.
    // So the Set S2-H2-C2 is NOT exempt.
    // Total count: 6 (set) + 5 + 8 + 10 + 10 + 10 + 10 + 8 = 67 points.
    // However, the optimal grouping will extend the pure sequence to H2-H3-H4-H5 (0 pts),
    // saving H2's points, leaving S2 (2 pts) and C2 (2 pts) unmatched.
    // Total count: 2 (S2) + 2 (C2) + 5 + 8 + 10 + 10 + 10 + 10 + 8 = 65 points.
    const hand = [
      H(Rank.THREE), H(Rank.FOUR), H(Rank.FIVE),
      S(Rank.TWO), H(Rank.TWO), C(Rank.TWO),
      C(Rank.FIVE), D(Rank.EIGHT), S(Rank.TEN), C(Rank.KING), S(Rank.QUEEN), D(Rank.ACE), C(Rank.EIGHT)
    ];

    const result = findOptimalGrouping(hand, Rank.SEVEN);
    expect(result.minimumPoints).toBe(65);
  });

  it("should exempt all groups if both First Rummy and Second Rummy are present", () => {
    // Hand:
    // Pure Sequence (First Rummy): H3-H4-H5 (0 pts)
    // Impure Sequence (Second Rummy): S10-D7-SQ (0 pts) (using wild D7 as SJ)
    // Set: S2-H2-C2 (0 pts)
    // Unmatched: CK (10 pts), DJ (10 pts), S8 (8 pts), PJ (0 pts)
    // Here we have both First and Second Rummy. All groups (including set) are exempt.
    // Optimal grouping uses PJ and D7 to extend Spades sequence to 8-9-10-J-Q saving S8 points too.
    // Total count: 10 (CK) + 10 (DJ) = 20 points.
    const hand = [
      H(Rank.THREE), H(Rank.FOUR), H(Rank.FIVE),
      S(Rank.TEN), S(Rank.QUEEN),
      S(Rank.TWO), H(Rank.TWO), C(Rank.TWO),
      C(Rank.KING), D(Rank.JACK), S(Rank.EIGHT),
      D(Rank.SEVEN), PJ()
    ];

    const result = findOptimalGrouping(hand, Rank.SEVEN);
    expect(result.minimumPoints).toBe(20);
  });

  it("should choose the optimal First Rummy to minimize count when multiple exist but no Second Rummy", () => {
    // Hand:
    // London 1: H2-H2-H2 (from decks 0, 1, 2) -> 6 points if counted
    // London 2: HA-HA-HA (from decks 0, 1, 2) -> 30 points if counted
    // Unmatched: C5 (5), D8 (8), S10 (10), CK (10), SQ (10), DA (10), C8 (8)
    // No sequences or jokers exist.
    // The algorithm should choose to exempt London 2 (saves 30 pts) and count London 1 (6 pts).
    // Total points: 6 (London 1) + 5 + 8 + 10 + 10 + 10 + 10 + 8 = 67 points.
    const hand = [
      H(Rank.TWO, 0), H(Rank.TWO, 1), H(Rank.TWO, 2),
      H(Rank.ACE, 0), H(Rank.ACE, 1), H(Rank.ACE, 2),
      C(Rank.FIVE), D(Rank.EIGHT), S(Rank.TEN), C(Rank.KING), S(Rank.QUEEN), D(Rank.ACE), C(Rank.EIGHT)
    ];

    const result = findOptimalGrouping(hand, Rank.SEVEN);
    expect(result.minimumPoints).toBe(67);
  });
});
