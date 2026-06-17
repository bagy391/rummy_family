/**
 * @module configs/points-250
 * 250-point elimination game mode configuration.
 *
 * This is the default Family Rummy game mode:
 * - 3 decks + 3 printed jokers = 159 cards
 * - 2-6 players, 13 cards each
 * - Elimination at 250 points
 * - Score cap at 80 per round
 * - First drop: 20, Second drop: 40, Wrong show: 80
 */

import type { GameModeConfig } from "../types/config.js";
import { GameModeType } from "../types/config.js";

export const POINTS_250_CONFIG: GameModeConfig = {
  type: GameModeType.POINTS_ELIMINATION,
  displayName: "Points Rummy (250)",
  description: "Classic elimination rummy. Reach 250 points and you're out!",

  scoring: {
    maxPointsPerRound: 80,
    firstDropPoints: 20,
    secondDropPoints: 40,
    wrongShowPoints: 80,
    aceValue: 10,
    faceCardValue: 10,
  },

  elimination: {
    maxPoints: 250,
    rebuysAllowed: 0,
    rebuyPoints: 0,
  },

  round: {
    cardsPerPlayer: 13,
    minPlayers: 2,
    maxPlayers: 6,
    numberOfDecks: 3,
    printedJokers: 3,
    allowFirstDrop: true,
    allowSecondDrop: true,
  },

  disconnection: {
    autoDropTimeoutSeconds: 300, // 5 minutes
    missedTurnsBeforeAutoDrop: 3,
    autoDropOnDisconnect: false,
  },
} as const;
