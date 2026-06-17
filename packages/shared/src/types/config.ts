/**
 * @module types/config
 * Configuration types for game modes.
 *
 * All game-mode-specific values (point limits, drop penalties, etc.)
 * are driven by these configs — never hardcoded in engine logic.
 */

/** Identifies the type of game mode. */
export enum GameModeType {
  POINTS_ELIMINATION = "POINTS_ELIMINATION",
}

/** Rules governing how points are scored each round. */
export interface ScoringRules {
  /** Maximum points charged to a player in a single round. */
  readonly maxPointsPerRound: number;
  /** Points for first drop (folding before drawing). */
  readonly firstDropPoints: number;
  /** Points for second drop (folding after drawing). */
  readonly secondDropPoints: number;
  /** Points for a wrong show (invalid meld declaration). */
  readonly wrongShowPoints: number;
  /** Point value of Ace. */
  readonly aceValue: number;
  /** Point value of face cards (J, Q, K). */
  readonly faceCardValue: number;
}

/** Rules for player elimination in point-based games. */
export interface EliminationRules {
  /** Maximum cumulative points before elimination. */
  readonly maxPoints: number;
  /** Number of re-buys (rejoin) allowed per player. */
  readonly rebuysAllowed: number;
  /** Points the player re-enters with after a rebuy. */
  readonly rebuyPoints: number;
}

/** Rules governing a single round of play. */
export interface RoundRules {
  /** Number of cards dealt to each player. */
  readonly cardsPerPlayer: number;
  /** Minimum number of players to start a round. */
  readonly minPlayers: number;
  /** Maximum number of players in a game. */
  readonly maxPlayers: number;
  /** Number of standard 52-card decks used. */
  readonly numberOfDecks: number;
  /** Number of printed jokers added to the combined deck. */
  readonly printedJokers: number;
  /** Whether first drop is allowed. */
  readonly allowFirstDrop: boolean;
  /** Whether second drop (after drawing) is allowed. */
  readonly allowSecondDrop: boolean;
}

/** Rules for handling player disconnections. */
export interface DisconnectionRules {
  /** Seconds before an auto-drop is triggered. */
  readonly autoDropTimeoutSeconds: number;
  /** Number of consecutive missed turns before auto-drop. */
  readonly missedTurnsBeforeAutoDrop: number;
  /** Whether the disconnected player's hand is auto-dropped. */
  readonly autoDropOnDisconnect: boolean;
}

/**
 * Complete configuration for a game mode.
 *
 * All engine logic reads from this config rather than using
 * hardcoded values, allowing easy addition of new game modes.
 */
export interface GameModeConfig {
  /** Unique identifier for this game mode. */
  readonly type: GameModeType;
  /** Human-readable display name. */
  readonly displayName: string;
  /** Short description of the game mode. */
  readonly description: string;
  /** Scoring rules for the mode. */
  readonly scoring: ScoringRules;
  /** Elimination rules for the mode. */
  readonly elimination: EliminationRules;
  /** Round rules for the mode. */
  readonly round: RoundRules;
  /** Disconnection handling rules. */
  readonly disconnection: DisconnectionRules;
}
