import { useState } from "react";
import { motion } from "framer-motion";
import type { Card, WildJokerInfo } from "@rummy/shared";
import { cardSuitColor, cardSuitSymbol, cardRankName } from "./card-utils";
import { Info, Trophy } from "lucide-react";

interface RoomPlayer {
  id: string;
  player_id: string;
  name: string;
  seat_position: number;
  status: string;
  is_admin: boolean;
  total_score: number;
  opted_leave_share: boolean;
  disconnected_at?: string | null;
  upi_id?: string;
}

interface RoundPlayer {
  id: string;
  player_id: string;
  status: string;
  hand: Card[];
  score_this_round: number | null;
  seat_position: number;
  has_drawn_this_turn: boolean;
}

interface PostRoundModalProps {
  round: {
    round_number: number;
    wild_joker: WildJokerInfo | null;
  };
  players: RoomPlayer[];
  roundPlayers: RoundPlayer[];
  userId: string | undefined;
  isAdmin: boolean;
  onlinePlayerIds: string[];
  scoreHistory: any[];
  onStartNextRound: () => void;
  // Vote handlers
  me: RoomPlayer | undefined;
  activeLeaveShareVote: any;
  activeQuitVote: any;
  activePauseVote: any;
  onInitiateLeaveShareVote: () => void;
  onInitiateMutualQuit: () => void;
  onInitiatePause: () => void;
  ScoreTrendChart: React.ComponentType<{ scoreHistory: any[]; players: any[] }>;
  isChartVisible: boolean;
  onToggleChart: () => void;
}

export default function PostRoundModal({
  round,
  players,
  roundPlayers,
  userId,
  isAdmin,
  onlinePlayerIds,
  scoreHistory,
  onStartNextRound,
  me,
  activeLeaveShareVote,
  activeQuitVote,
  activePauseVote,
  onInitiateLeaveShareVote,
  onInitiateMutualQuit,
  onInitiatePause,
  ScoreTrendChart,
  isChartVisible,
  onToggleChart,
}: PostRoundModalProps) {
  const [activeTab, setActiveTab] = useState<"scoreboard" | "cards">("scoreboard");

  const winner = roundPlayers.find(
    (rp) => rp.status === "winner" || rp.status === "shown_valid"
  );
  const winnerPlayer = winner
    ? players.find((p) => p.player_id === winner.player_id)
    : null;




  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-[200] bg-[#0D1B2A]/95 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="shrink-0 px-4 pt-6 pb-4 border-b border-white/10">
        <h2 className="text-2xl font-bold font-[Outfit] text-center flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-[var(--color-gold)]" />
          Round {round.round_number} Complete
        </h2>
        {winnerPlayer && (
          <p className="text-center text-[18px] text-[var(--color-gold)] font-semibold mt-1">
            🏆 {winnerPlayer.name} wins the round!
          </p>
        )}
      </div>

      {/* Tab switcher */}
      <div className="shrink-0 flex px-4 pt-3 gap-2">
        <button
          onClick={() => setActiveTab("scoreboard")}
          className={`flex-1 py-2.5 rounded-xl text-[18px] font-bold transition-all border ${
            activeTab === "scoreboard"
              ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)] border-[var(--color-gold)]/30"
              : "bg-white/5 text-white/50 border-white/10 hover:text-white/70"
          }`}
        >
          Scoreboard
        </button>
        <button
          onClick={() => setActiveTab("cards")}
          className={`flex-1 py-2.5 rounded-xl text-[18px] font-bold transition-all border ${
            activeTab === "cards"
              ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)] border-[var(--color-gold)]/30"
              : "bg-white/5 text-white/50 border-white/10 hover:text-white/70"
          }`}
        >
          Cards Played
        </button>
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {activeTab === "scoreboard" && (
          <div className="space-y-3 max-w-xl mx-auto">
            {/* Sticky header row */}
            <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[14px] font-bold text-white/60 sticky top-0 z-10 backdrop-blur-md">
              <span>Player</span>
              <div className="flex gap-6">
                <span>This Round</span>
                <span>Total</span>
              </div>
            </div>

            {players.map((p) => {
              const rp = roundPlayers.find((x) => x.player_id === p.player_id);
              const isWinner = rp?.status === "winner" || rp?.status === "shown_valid";
              const isOffline =
                p.status === "disconnected" ||
                (p.player_id !== userId &&
                  !onlinePlayerIds.includes(p.player_id));

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border flex justify-between items-center ${
                    p.status === "eliminated"
                      ? "bg-red-500/5 border-red-500/20 opacity-60"
                      : isWinner
                      ? "bg-[var(--color-gold)]/5 border-[var(--color-gold)]/20"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {isWinner && <span className="text-lg">🏆</span>}
                      <span className="text-[18px] font-semibold text-white">
                        {p.name}
                      </span>
                      {p.player_id === userId && (
                        <span className="text-[12px] text-white/40">(You)</span>
                      )}
                      {p.status === "eliminated" && (
                        <span className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold">
                          Eliminated
                        </span>
                      )}
                      {p.opted_leave_share && (
                        <span className="text-[11px] bg-sky-500/10 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded font-bold">
                          Leave Share
                        </span>
                      )}
                      {isOffline && (
                        <span className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded animate-pulse font-bold">
                          Offline
                        </span>
                      )}
                    </div>
                    <div className="text-[14px] text-white/40 mt-1 capitalize">
                      {p.status === "eliminated"
                        ? "eliminated"
                        : rp?.status?.replace("_", " ")}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-6">
                    <span className="text-[24px] font-bold font-[var(--font-score)] text-[var(--color-gold)]">
                      +{rp?.score_this_round ?? 0}
                    </span>
                    <div className="text-center">
                      <span className="text-[24px] font-bold font-[var(--font-score)] text-white">
                        {p.total_score}
                      </span>
                      <span className="text-[12px] text-white/40 block">/ 250</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Leave Share Vote Area */}
            {players.some((p) => p.status === "eliminated") &&
              me &&
              me.status !== "eliminated" && (
                <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20">
                  <h3 className="font-semibold text-[14px] text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> Leave Share Vote
                  </h3>
                  <p className="text-[14px] text-white/50 mb-3 leading-relaxed">
                    If approved, active players won't pay the winner if they lose.
                  </p>
                  <button
                    onClick={onInitiateLeaveShareVote}
                    disabled={me.opted_leave_share || !!activeLeaveShareVote}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all border min-h-[52px] ${
                      me.opted_leave_share
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/30 cursor-not-allowed"
                        : activeLeaveShareVote
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30 cursor-not-allowed"
                        : "bg-sky-600 hover:bg-sky-500 text-white border-transparent"
                    }`}
                  >
                    {me.opted_leave_share
                      ? "Leave Share Active"
                      : activeLeaveShareVote
                      ? "Vote in Progress..."
                      : "Propose Leave Share"}
                  </button>
                </div>
              )}

            {/* Mutual Quit Vote Area */}
            {me && me.status !== "eliminated" && (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <h3 className="font-semibold text-[14px] text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Mutual Quit Vote
                </h3>
                <p className="text-[14px] text-white/50 mb-3 leading-relaxed">
                  End the game and split the prize pool equally among active players.
                </p>
                <button
                  onClick={onInitiateMutualQuit}
                  disabled={!!activeQuitVote}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all border min-h-[52px] ${
                    activeQuitVote
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30 cursor-not-allowed"
                      : "bg-amber-600 hover:bg-amber-500 text-white border-transparent"
                  }`}
                >
                  {activeQuitVote
                    ? "Vote in Progress..."
                    : "Propose Mutual Quit"}
                </button>
              </div>
            )}

            {/* Score Chart */}
            {scoreHistory.length > 1 && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <button
                  onClick={onToggleChart}
                  className="w-full flex justify-between items-center text-[14px] font-semibold text-white/50 hover:text-white uppercase tracking-wider"
                >
                  <span>Score Trend</span>
                  <span className="text-[12px] bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                    {isChartVisible ? "Hide" : "Show"}
                  </span>
                </button>
                {isChartVisible && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <ScoreTrendChart
                      scoreHistory={scoreHistory}
                      players={players}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "cards" && (
          <div className="space-y-6 max-w-xl mx-auto">
            {roundPlayers.map((rp) => {
              const player = players.find(
                (p) => p.player_id === rp.player_id
              );
              if (!player) return null;
              const isWinner =
                rp.status === "winner" || rp.status === "shown_valid";

              return (
                <div
                  key={rp.id}
                  className={`p-4 rounded-xl border ${
                    isWinner
                      ? "bg-[var(--color-gold)]/5 border-[var(--color-gold)]/20"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {isWinner && <span className="text-lg">🏆</span>}
                    <span className="text-[18px] font-bold text-white">
                      {player.name}
                    </span>
                    <span className="text-[12px] text-white/40 capitalize">
                      {rp.status.replace("_", " ")}
                    </span>
                    <span className="text-[14px] font-bold font-[var(--font-score)] text-[var(--color-gold)] ml-auto">
                      {rp.score_this_round ?? 0} pts
                    </span>
                  </div>

                  {/* All cards flat */}
                  {rp.hand && rp.hand.length > 0 ? (
                    <div className="flex gap-1 overflow-x-auto p-2 rounded-lg bg-white/5 border border-white/10">
                      {rp.hand.map((card) => {
                        const sColor = cardSuitColor(card.suit);
                        return (
                          <div
                            key={card.id}
                            className="w-[36px] h-[50px] rounded bg-white border border-gray-200 text-black flex flex-col justify-between p-0.5 shrink-0 select-none shadow-sm"
                          >
                            <span
                              className={`text-[12px] font-black leading-none ${sColor}`}
                            >
                              {cardRankName(card.rank)}
                            </span>
                            <span
                              className={`text-[14px] text-center font-bold leading-none ${sColor}`}
                            >
                              {cardSuitSymbol(card.suit)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[14px] text-white/30 italic">
                      Hand not available (player dropped)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Bottom pinned CTA */}
      <div className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 border-t border-white/10 bg-[#0D1B2A]/95 backdrop-blur-md">
        {isAdmin ? (
          <button
            onClick={onStartNextRound}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-[18px] shadow-lg min-h-[52px] transition-all"
          >
            Start Round {round.round_number + 1}
          </button>
        ) : (
          <div className="text-center text-[14px] text-white/40 italic animate-pulse py-3">
            Waiting for host to start the next round...
          </div>
        )}

        {/* Pause Game */}
        {me && me.status !== "eliminated" && (
          <button
            onClick={onInitiatePause}
            disabled={!!activePauseVote}
            className={`w-full mt-2 py-2.5 rounded-xl text-sm font-bold transition-all border min-h-[44px] ${
              activePauseVote
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30 cursor-not-allowed"
                : "bg-white/5 hover:bg-white/10 text-white/60 border-white/10"
            }`}
          >
            {activePauseVote
              ? "Pause Vote in Progress..."
              : "Propose Pause Game"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
