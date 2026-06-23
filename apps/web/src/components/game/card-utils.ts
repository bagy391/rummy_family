import { Suit, Rank } from "@rummy/shared";

/**
 * Returns the Tailwind color class for a given card suit.
 * Uses high-contrast colors for elder-friendly visibility.
 */
export const cardSuitColor = (suit: Suit): string => {
  switch (suit) {
    case Suit.HEARTS: return "text-red-600";
    case Suit.DIAMONDS: return "text-red-600";
    case Suit.CLUBS: return "text-black";
    case Suit.SPADES: return "text-black";
    case Suit.JOKER: return "text-amber-600";
    default: return "";
  }
};

/**
 * Returns the Unicode symbol for a given card suit.
 * Filled symbols for maximum visibility.
 */
export const cardSuitSymbol = (suit: Suit): string => {
  switch (suit) {
    case Suit.HEARTS: return "♥";
    case Suit.DIAMONDS: return "♦";
    case Suit.CLUBS: return "♣";
    case Suit.SPADES: return "♠";
    case Suit.JOKER: return "🃏";
    default: return "";
  }
};

/**
 * Returns the display string for a card rank.
 */
export const cardRankName = (rank: Rank): string => {
  switch (rank) {
    case Rank.ACE: return "A";
    case Rank.TWO: return "2";
    case Rank.THREE: return "3";
    case Rank.FOUR: return "4";
    case Rank.FIVE: return "5";
    case Rank.SIX: return "6";
    case Rank.SEVEN: return "7";
    case Rank.EIGHT: return "8";
    case Rank.NINE: return "9";
    case Rank.TEN: return "10";
    case Rank.JACK: return "J";
    case Rank.QUEEN: return "Q";
    case Rank.KING: return "K";
    case Rank.PRINTED_JOKER: return "Jkr";
    default: return "";
  }
};
