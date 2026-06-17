/**
 * @module types/game
 * Game, round, and player state types.
 */

import type { Card, Rank } from "./card.js";
import type { GameModeType } from "./config.js";

/** Current phase of a player's turn. */
export enum TurnPhase {
  /** Waiting for the player to draw a card. */
  DRAW = "DRAW",
  /** Player has drawn; must now discard or declare. */
  DISCARD = "DISCARD",
}

/** Overall game status. */
export enum GameStatus {
  WAITING = "WAITING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

/** Status of an individual round. */
export enum RoundStatus {
  DEALING = "DEALING",
  IN_PROGRESS = "IN_PROGRESS",
  SHOW_DECLARED = "SHOW_DECLARED",
  COMPLETED = "COMPLETED",
}

/** How a player exited the round. */
export enum DropType {
  FIRST_DROP = "FIRST_DROP",
  SECOND_DROP = "SECOND_DROP",
}

/**
 * The wild joker for the current round.
 *
 * @property card - The actual card turned face-up to determine the wild.
 * @property wildRank - The rank that all cards become wild jokers
 *   (same as card.rank, unless the card is a printed joker, in which case ACE).
 */
export interface WildJokerInfo {
  readonly card: Card;
  readonly wildRank: Rank;
}

/**
 * A player's state within a round.
 */
export interface PlayerRoundState {
  readonly playerId: string;
  /** Cards currently in hand (13 normally, 14 after draw). */
  readonly hand: Card[];
  /** Whether this player has dropped. */
  readonly hasDropped: boolean;
  /** Type of drop if the player dropped. */
  readonly dropType?: DropType;
  /** Groups submitted during a show declaration, if any. */
  readonly showGroups?: Card[][];
  /** Whether this player declared show this round. */
  readonly hasDeclaredShow: boolean;
  /** Points scored this round (set after round ends). */
  readonly roundScore?: number;
}

/**
 * Complete state of a single round.
 */
export interface RoundState {
  readonly roundNumber: number;
  readonly status: RoundStatus;
  /** The draw pile (face-down). */
  readonly drawPile: Card[];
  /** The discard pile (face-up, last element = top). */
  readonly discardPile: Card[];
  /** Wild joker info for this round. */
  readonly wildJoker: WildJokerInfo;
  /** Player states indexed by position (turn order). */
  readonly players: PlayerRoundState[];
  /** Index into `players` for whose turn it is. */
  readonly currentPlayerIndex: number;
  /** Current turn phase. */
  readonly turnPhase: TurnPhase;
  /** ID of the player who declared show (if any). */
  readonly declaredBy?: string;
}

/**
 * A player's cumulative game state across rounds.
 */
export interface PlayerGameState {
  readonly playerId: string;
  readonly displayName: string;
  /** Total cumulative score across all rounds. */
  readonly totalScore: number;
  /** Score history per round. */
  readonly roundScores: number[];
  /** Whether the player has been eliminated. */
  readonly isEliminated: boolean;
  /** Number of re-buys used. */
  readonly rebuysUsed: number;
  /** Whether the player is currently connected. */
  readonly isConnected: boolean;
}

/**
 * Top-level game state.
 */
export interface GameState {
  readonly gameId: string;
  readonly gameMode: GameModeType;
  readonly status: GameStatus;
  readonly players: PlayerGameState[];
  readonly currentRound?: RoundState;
  readonly roundNumber: number;
  /** ID of the host/creator. */
  readonly hostPlayerId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Result of validating a player's show declaration.
 */
export interface ShowValidationResult {
  readonly isValid: boolean;
  /** Human-readable reasons why the show is invalid. */
  readonly errors: string[];
  /** Whether a valid First Rummy (pure sequence) was found. */
  readonly hasFirstRummy: boolean;
  /** Whether a valid Second Rummy (second sequence) was found. */
  readonly hasSecondRummy: boolean;
  /** Points of unmatched cards (0 if valid show). */
  readonly unmatchedPoints: number;
}

/**
 * Describes one group of cards in a validated show.
 */
export enum GroupType {
  PURE_SEQUENCE = "PURE_SEQUENCE",
  IMPURE_SEQUENCE = "IMPURE_SEQUENCE",
  SET = "SET",
  LONDON = "LONDON",
  INVALID = "INVALID",
}

/**
 * A classified group of cards from a show.
 */
export interface ClassifiedGroup {
  readonly cards: Card[];
  readonly type: GroupType;
  /** Points of this group (0 for valid melds, sum of card values for invalid). */
  readonly points: number;
}

/**
 * Result of finding the optimal grouping for a hand (loser scoring).
 */
export interface OptimalGroupingResult {
  /** The arrangement of groups that minimizes unmatched points. */
  readonly groups: ClassifiedGroup[];
  /** Minimum unmatched points achievable. */
  readonly minimumPoints: number;
}
