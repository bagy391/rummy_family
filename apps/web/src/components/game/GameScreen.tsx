import { AnimatePresence, motion } from "framer-motion";
import { sortHand } from "@rummy/shared";
import type { Card, WildJokerInfo } from "@rummy/shared";
import OpponentZone from "./OpponentZone";
import TableCenter from "./TableCenter";

interface FloatingEmoji {
  id: string;
  senderId: string;
  emoji: string;
}

interface RoomPlayer {
  id: string;
  player_id: string;
  name: string;
  seat_position: number;
  status: string;
  is_admin: boolean;
  total_score: number;
  opted_leave_share: boolean;
  avatarUrl?: string | null;
  disconnected_at?: string | null;
}

interface RoundPlayerInfo {
  player_id: string;
  status: string;
  has_drawn_this_turn: boolean;
  hand?: Card[];
}

interface GameScreenProps {
  // Room
  betAmount: number;

  // Round
  roundNumber: number;
  roundStatus: string | undefined;
  wildJoker: WildJokerInfo | null;
  currentTurnPlayerId: string | null;
  turnOrderIndex: number;
  discardPile: Card[];

  // Players
  players: RoomPlayer[];
  roundPlayers: RoundPlayerInfo[];
  userId: string | undefined;
  isAdmin: boolean;
  isMyTurn: boolean;
  isSpectator: boolean;
  onlinePlayerIds: string[];
  floatingEmojis: FloatingEmoji[];

  // My state
  myHand: Card[];
  selectedCards: string[];
  myTotalScore: number;
  hasDrawnThisTurn: boolean;

  // Actions
  onQuit: () => void;
  onDrawCard: () => void;
  onPickDiscard: () => void;
  onDiscard: (card: Card) => void;
  onDeclareShow: (card: Card) => void;
  onDropFirst: () => void;
  onDropSecond: () => void;
  onCardClick: (cardId: string) => void;
  onReorderHand: (newHand: Card[]) => void;
  onAdminKick: (playerId: string, action: "ELIMINATE" | "DROP") => void;
  getTimeoutText: (p: any) => string;

  // Settings
  soundOn: boolean;
  vibrationOn: boolean;
  onToggleSound: () => void;
  onToggleVibration: () => void;

  // Chat
  onOpenChat: () => void;
  unreadCount: number;

  // Spectator content
  spectatorContent?: React.ReactNode;
}

export default function GameScreen({
  betAmount,
  roundNumber,
  wildJoker,
  currentTurnPlayerId,
  turnOrderIndex,
  discardPile,
  players,
  roundPlayers,
  userId,
  isAdmin,
  isMyTurn,
  isSpectator,
  onlinePlayerIds,
  floatingEmojis,
  myHand,
  selectedCards,
  myTotalScore,
  hasDrawnThisTurn,
  onQuit,
  onDrawCard,
  onPickDiscard,
  onDiscard,
  onDeclareShow,
  onDropFirst,
  onDropSecond,
  onCardClick,
  onReorderHand,
  onAdminKick,
  getTimeoutText,
  soundOn,
  vibrationOn,
  onToggleSound,
  onToggleVibration,
  onOpenChat,
  unreadCount,
  spectatorContent,
}: GameScreenProps) {


  const opponents = players.filter(
    (p) => p.player_id !== userId || isSpectator
  );

  const me = players.find((p) => p.player_id === userId);
  const myName = me?.name || "You";
  const myAvatarUrl = me?.avatarUrl;

  const currentTurnPlayerName =
    players.find((p) => p.player_id === currentTurnPlayerId)?.name ||
    "next player";

  const handleResortHand = () => {
    const sorted = sortHand(myHand);
    onReorderHand(sorted);
  };

  const canDrop = isMyTurn && !hasDrawnThisTurn;
  const showFirstDrop = canDrop && turnOrderIndex < roundPlayers.length && (myTotalScore + 20) < 250;
  const showSecondDrop = canDrop && turnOrderIndex >= roundPlayers.length && (myTotalScore + 40) < 250;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden felt-texture h-full w-full">
      {/* Zone 1: Opponent Zone */}
      <OpponentZone
        opponents={opponents}
        roundPlayers={roundPlayers}
        currentTurnPlayerId={currentTurnPlayerId}
        userId={userId}
        isAdmin={isAdmin}
        onlinePlayerIds={onlinePlayerIds}
        floatingEmojis={floatingEmojis}
        getTimeoutText={getTimeoutText}
        onAdminKick={onAdminKick}
      />

      {/* Zone 2: Table Center containing Sets, Hand cards, and Sidebar controls */}
      <TableCenter
        discardPile={discardPile}
        isMyTurn={isMyTurn}
        hasDrawnThisTurn={hasDrawnThisTurn}
        currentTurnPlayerName={currentTurnPlayerName}
        onDrawCard={onDrawCard}
        onPickDiscard={onPickDiscard}
        selectedCards={selectedCards}
        onCardClick={onCardClick}
        wildJoker={wildJoker}
        onResortHand={handleResortHand}
        myName={myName}
        myAvatarUrl={myAvatarUrl}
        myTotalScore={myTotalScore}
        roundNumber={roundNumber}
        betAmount={betAmount}
        soundOn={soundOn}
        vibrationOn={vibrationOn}
        onToggleSound={onToggleSound}
        onToggleVibration={onToggleVibration}
        onQuit={onQuit}
        myHand={myHand}
        showFirstDrop={showFirstDrop}
        showSecondDrop={showSecondDrop}
        onDropFirst={onDropFirst}
        onDropSecond={onDropSecond}
        onDeclareShow={onDeclareShow}
        onDiscard={onDiscard}
        onReorder={onReorderHand}
        isSpectator={isSpectator}
        spectatorContent={spectatorContent}
      />

      {/* Chat FAB */}
      <button
        onClick={onOpenChat}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+2rem)] right-4 z-50 w-12 h-12 rounded-full bg-[var(--color-gold)] text-black flex items-center justify-center shadow-lg shadow-[var(--color-gold)]/30 hover:brightness-110 transition-all"
        title="Open Chat"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] text-white font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating emojis for self */}
      <div className="fixed bottom-36 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex flex-col items-center">
        <AnimatePresence>
          {floatingEmojis
            .filter((e) => e.senderId === userId)
            .map((fe) => (
              <motion.div
                key={fe.id}
                initial={{ opacity: 0, y: 10, scale: 0.5 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [10, -15, -35, -55],
                  scale: [0.5, 1.5, 1.5, 1.0],
                }}
                shadow-md
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2.0,
                  times: [0, 0.15, 0.8, 1],
                  ease: "easeOut",
                }}
                className="text-3xl filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
              >
                {fe.emoji}
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
