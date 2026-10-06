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

  // Custom row grouping props
  rowSizes?: { id: string; size: number }[];
  onRowSizesChange?: (sizes: { id: string; size: number }[]) => void;

  // Voice chat content slot
  voiceContent?: React.ReactNode;
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
  rowSizes,
  onRowSizesChange,
  voiceContent,
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

  const canDrop = isMyTurn && !hasDrawnThisTurn && !isSpectator;
  const showFirstDrop = canDrop && turnOrderIndex < roundPlayers.length && (myTotalScore + 20) < 250;
  const showSecondDrop = canDrop && turnOrderIndex >= roundPlayers.length && (myTotalScore + 40) < 250;

  return (
    /* Full-screen landscape table layout */
    <div className="flex-1 flex flex-col relative overflow-hidden felt-table h-full w-full select-none">
      {/* Subtle inner vignette */}
      <div className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.35) 100%)'
        }}
      />

      {/* Zone 1: Opponents at top */}
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

      {/* Zone 2: Table center (decks + player hand + controls) */}
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
        rowSizes={rowSizes}
        onRowSizesChange={onRowSizesChange}
        voiceContent={voiceContent}
      />

      {/* Chat FAB (Bottom-Right corner beside player hand) */}
      <button
        onClick={onOpenChat}
        id="chat-fab-btn"
        className="fixed bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-50 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer border border-amber-300/40"
        style={{
          background: 'linear-gradient(135deg, #d4901a, #F5A623)',
          boxShadow: '0 4px 18px rgba(245,166,35,0.45)',
        }}
        title="Open Chat"
      >
        <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] text-white font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating emojis for self */}
      <div className="fixed bottom-40 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex flex-col items-center">
        <AnimatePresence>
          {floatingEmojis
            .filter((e) => e.senderId === userId)
            .map((fe) => (
              <motion.div
                key={fe.id}
                initial={{ opacity: 0, y: 10, scale: 0.5 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [10, -20, -40, -60],
                  scale: [0.5, 1.6, 1.6, 1.0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2.2,
                  times: [0, 0.15, 0.8, 1],
                  ease: "easeOut",
                }}
                className="text-3xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
              >
                {fe.emoji}
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
