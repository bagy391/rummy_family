/**
 * @rummy/shared — Family Rummy Game Engine
 *
 * Shared TypeScript library for the Family Rummy card game.
 * Used by both the client (browser) and server (Edge Functions).
 * Zero runtime dependencies — pure TypeScript.
 */

// ---- Types ----
export { Suit, Rank, SUIT_CHAR, RANK_NUM, NATURAL_SUITS, STANDARD_RANKS } from "./types/card.js";
export type { Card } from "./types/card.js";

export { GameModeType } from "./types/config.js";
export type { GameModeConfig, ScoringRules, EliminationRules, RoundRules, DisconnectionRules } from "./types/config.js";

export { TurnPhase, GameStatus, RoundStatus, DropType, GroupType } from "./types/game.js";
export type {
  WildJokerInfo,
  PlayerRoundState,
  RoundState,
  PlayerGameState,
  GameState,
  ShowValidationResult,
  ClassifiedGroup,
  OptimalGroupingResult,
} from "./types/game.js";

export { GameEventType } from "./types/events.js";
export type {
  BaseGameEvent,
  GameEvent,
  GameCreatedEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  RoundStartedEvent,
  CardsDealtEvent,
  WildJokerSelectedEvent,
  TurnStartedEvent,
  CardDrawnFromPileEvent,
  CardDrawnFromDiscardEvent,
  CardDiscardedEvent,
  ShowDeclaredEvent,
  ShowResultEvent,
  FirstDropEvent,
  SecondDropEvent,
  RoundScoreEntry,
  RoundEndedEvent,
  PlayerEliminatedEvent,
  PlayerRebuyEvent,
  GameEndedEvent,
  PlayerDisconnectedEvent,
  PlayerReconnectedEvent,
} from "./types/events.js";

// ---- Engine ----
export { createDeck, createShuffledDeck, dealCards, selectWildJokerCard, TOTAL_CARDS, NUM_DECKS, NUM_PRINTED_JOKERS } from "./engine/deck.js";
export { resolveWildJoker, isPrintedJoker, isWildJoker, isJoker, isWildJokerInNaturalPosition } from "./engine/joker.js";
export { isPureSequence, isImpureSequence, isValidSequence } from "./engine/sequence.js";
export { isValidSet } from "./engine/set.js";
export { isLondon } from "./engine/london.js";
export { classifyGroup, validateShow, validateShowAction } from "./engine/hand-validator.js";
export { calculateUnmatchedPoints, calculateHandScore, getFirstDropScore, getSecondDropScore, getWrongShowScore, isEliminated } from "./engine/scoring.js";
export { findOptimalGrouping } from "./engine/optimal-grouping.js";

// ---- Utils ----
export { rankToNumber, numberToRank, cardPointValue, compareCards, sortHand, formatCard, generateCardId, createCard } from "./utils/card-utils.js";
export { cryptoShuffle } from "./utils/shuffle.js";

// ---- Configs ----
export { POINTS_250_CONFIG } from "./configs/points-250.js";
