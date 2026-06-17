/**
 * @module types/events
 * All game event types used for client-server communication.
 *
 * Events are the canonical way state transitions are communicated.
 * Each event carries exactly the data needed to apply the transition.
 */

import type { Card } from "./card.js";
import type { ClassifiedGroup, DropType, WildJokerInfo } from "./game.js";

// ─── Base Event ──────────────────────────────────────────────

/** Base shape for all game events. */
export interface BaseGameEvent {
  /** Discriminator for the event type. */
  readonly type: GameEventType;
  /** ID of the game this event belongs to. */
  readonly gameId: string;
  /** ISO-8601 timestamp of when the event occurred. */
  readonly timestamp: string;
}

// ─── Event Type Enum ─────────────────────────────────────────

/** All possible game event types. */
export enum GameEventType {
  GAME_CREATED = "GAME_CREATED",
  PLAYER_JOINED = "PLAYER_JOINED",
  PLAYER_LEFT = "PLAYER_LEFT",
  ROUND_STARTED = "ROUND_STARTED",
  CARDS_DEALT = "CARDS_DEALT",
  WILD_JOKER_SELECTED = "WILD_JOKER_SELECTED",
  TURN_STARTED = "TURN_STARTED",
  CARD_DRAWN_FROM_PILE = "CARD_DRAWN_FROM_PILE",
  CARD_DRAWN_FROM_DISCARD = "CARD_DRAWN_FROM_DISCARD",
  CARD_DISCARDED = "CARD_DISCARDED",
  SHOW_DECLARED = "SHOW_DECLARED",
  SHOW_RESULT = "SHOW_RESULT",
  FIRST_DROP = "FIRST_DROP",
  SECOND_DROP = "SECOND_DROP",
  ROUND_ENDED = "ROUND_ENDED",
  PLAYER_ELIMINATED = "PLAYER_ELIMINATED",
  PLAYER_REBUY = "PLAYER_REBUY",
  GAME_ENDED = "GAME_ENDED",
  PLAYER_DISCONNECTED = "PLAYER_DISCONNECTED",
  PLAYER_RECONNECTED = "PLAYER_RECONNECTED",
}

// ─── Specific Event Interfaces ───────────────────────────────

export interface GameCreatedEvent extends BaseGameEvent {
  readonly type: GameEventType.GAME_CREATED;
  readonly hostPlayerId: string;
  readonly gameMode: string;
}

export interface PlayerJoinedEvent extends BaseGameEvent {
  readonly type: GameEventType.PLAYER_JOINED;
  readonly playerId: string;
  readonly displayName: string;
}

export interface PlayerLeftEvent extends BaseGameEvent {
  readonly type: GameEventType.PLAYER_LEFT;
  readonly playerId: string;
}

export interface RoundStartedEvent extends BaseGameEvent {
  readonly type: GameEventType.ROUND_STARTED;
  readonly roundNumber: number;
}

export interface CardsDealtEvent extends BaseGameEvent {
  readonly type: GameEventType.CARDS_DEALT;
  /** Map of playerId → dealt cards (only visible to each respective player). */
  readonly hands: Record<string, Card[]>;
}

export interface WildJokerSelectedEvent extends BaseGameEvent {
  readonly type: GameEventType.WILD_JOKER_SELECTED;
  readonly wildJoker: WildJokerInfo;
}

export interface TurnStartedEvent extends BaseGameEvent {
  readonly type: GameEventType.TURN_STARTED;
  readonly playerId: string;
}

export interface CardDrawnFromPileEvent extends BaseGameEvent {
  readonly type: GameEventType.CARD_DRAWN_FROM_PILE;
  readonly playerId: string;
  /** The drawn card (only visible to the drawing player). */
  readonly card: Card;
}

export interface CardDrawnFromDiscardEvent extends BaseGameEvent {
  readonly type: GameEventType.CARD_DRAWN_FROM_DISCARD;
  readonly playerId: string;
  readonly card: Card;
}

export interface CardDiscardedEvent extends BaseGameEvent {
  readonly type: GameEventType.CARD_DISCARDED;
  readonly playerId: string;
  readonly card: Card;
}

export interface ShowDeclaredEvent extends BaseGameEvent {
  readonly type: GameEventType.SHOW_DECLARED;
  readonly playerId: string;
  readonly groups: Card[][];
}

export interface ShowResultEvent extends BaseGameEvent {
  readonly type: GameEventType.SHOW_RESULT;
  readonly playerId: string;
  readonly isValid: boolean;
  readonly classifiedGroups: ClassifiedGroup[];
  readonly errors: string[];
}

export interface FirstDropEvent extends BaseGameEvent {
  readonly type: GameEventType.FIRST_DROP;
  readonly playerId: string;
  readonly points: number;
}

export interface SecondDropEvent extends BaseGameEvent {
  readonly type: GameEventType.SECOND_DROP;
  readonly playerId: string;
  readonly points: number;
}

export interface RoundScoreEntry {
  readonly playerId: string;
  readonly roundScore: number;
  readonly totalScore: number;
  readonly dropType?: DropType;
  readonly isWrongShow: boolean;
}

export interface RoundEndedEvent extends BaseGameEvent {
  readonly type: GameEventType.ROUND_ENDED;
  readonly roundNumber: number;
  readonly winnerId: string;
  readonly scores: RoundScoreEntry[];
}

export interface PlayerEliminatedEvent extends BaseGameEvent {
  readonly type: GameEventType.PLAYER_ELIMINATED;
  readonly playerId: string;
  readonly totalScore: number;
}

export interface PlayerRebuyEvent extends BaseGameEvent {
  readonly type: GameEventType.PLAYER_REBUY;
  readonly playerId: string;
  readonly rebuyNumber: number;
  readonly newScore: number;
}

export interface GameEndedEvent extends BaseGameEvent {
  readonly type: GameEventType.GAME_ENDED;
  readonly winnerId: string;
  readonly finalScores: Array<{ playerId: string; totalScore: number }>;
}

export interface PlayerDisconnectedEvent extends BaseGameEvent {
  readonly type: GameEventType.PLAYER_DISCONNECTED;
  readonly playerId: string;
}

export interface PlayerReconnectedEvent extends BaseGameEvent {
  readonly type: GameEventType.PLAYER_RECONNECTED;
  readonly playerId: string;
}

/** Union of all game event types. */
export type GameEvent =
  | GameCreatedEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | RoundStartedEvent
  | CardsDealtEvent
  | WildJokerSelectedEvent
  | TurnStartedEvent
  | CardDrawnFromPileEvent
  | CardDrawnFromDiscardEvent
  | CardDiscardedEvent
  | ShowDeclaredEvent
  | ShowResultEvent
  | FirstDropEvent
  | SecondDropEvent
  | RoundEndedEvent
  | PlayerEliminatedEvent
  | PlayerRebuyEvent
  | GameEndedEvent
  | PlayerDisconnectedEvent
  | PlayerReconnectedEvent;
