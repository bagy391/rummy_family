import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  sortHand,
  isWildJoker,
  findOptimalGrouping,
  Rank,
  GroupType,
} from "@rummy/shared";
import type { Card, WildJokerInfo } from "@rummy/shared";
import PlayingCard from "./PlayingCard";
import {
  Trophy,
  Crown,
  ChevronDown,
  ChevronUp,
  Layers,
  TrendingUp,
  Info,
  Sparkles,
  RefreshCw,
  Users,
  ShieldCheck,
  PauseCircle,
  LogOut,
  CheckCircle2,
  Wand2,
  ArrowLeftRight,
  ArrowRight,
} from "lucide-react";

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
  avatarUrl?: string | null;
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
  myHand: Card[];
  onReorderHand: (newHand: Card[]) => void;
  rowSizes: { id: string; size: number }[];
  onRowSizesChange: (sizes: { id: string; size: number }[]) => void;
  isMatchFinished?: boolean;
  onViewSettlement?: () => void;
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
  myHand,
  onReorderHand,
  isMatchFinished = false,
  onViewSettlement,
}: PostRoundModalProps) {
  // Collapsible section states for all-in-one view
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(true);
  const [isCardsOpen, setIsCardsOpen] = useState(true);
  const [isVotesOpen, setIsVotesOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(userId || "");
  const [otherPlayerHands, setOtherPlayerHands] = useState<Record<string, Card[]>>({});

  // Interactive card selection for swapping and grouping
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  const winner = roundPlayers.find(
    (rp) => rp.status === "winner" || rp.status === "shown_valid"
  );
  const winnerPlayer = winner
    ? players.find((p) => p.player_id === winner.player_id)
    : null;

  // Overall match winner when match finishes (sole non-eliminated player, or lowest total score)
  const matchWinnerPlayer = useMemo(() => {
    if (!isMatchFinished) return null;
    const surviving = players.filter((p) => p.status !== "eliminated");
    if (surviving.length === 1) return surviving[0];
    if (surviving.length > 1) {
      return [...surviving].sort((a, b) => a.total_score - b.total_score)[0];
    }
    return [...players].sort((a, b) => a.total_score - b.total_score)[0];
  }, [isMatchFinished, players]);

  const isCalculating = roundPlayers.some((rp) => rp.score_this_round === null);

  // Player whose hand is currently selected
  const inspectingPlayer = players.find((p) => p.player_id === selectedPlayerId);

  const displayCards = useMemo(() => {
    if (selectedPlayerId === userId) return myHand;
    if (otherPlayerHands[selectedPlayerId]) return otherPlayerHands[selectedPlayerId]!;
    const rp = roundPlayers.find((x) => x.player_id === selectedPlayerId);
    return rp?.hand && rp.hand.length > 0 ? rp.hand : [];
  }, [selectedPlayerId, userId, myHand, otherPlayerHands, roundPlayers]);

  const updateCurrentHand = (newHand: Card[]) => {
    if (selectedPlayerId === userId) {
      onReorderHand(newHand);
    } else {
      setOtherPlayerHands((prev) => ({ ...prev, [selectedPlayerId]: newHand }));
    }
  };

  const wildRank = round.wild_joker ? round.wild_joker.wildRank : Rank.ACE;

  // Live Meld & Score calculation for displayed hand
  const meldAnalysis = useMemo(() => {
    if (!displayCards || displayCards.length === 0) return null;
    return findOptimalGrouping(displayCards, wildRank);
  }, [displayCards, wildRank]);

  // Card click handler: Select, Tap-to-Swap, or Multi-select
  const handleCardClick = (cardId: string) => {
    if (displayCards.length === 0) return;

    if (selectedCardIds.length === 0) {
      // Select first card
      setSelectedCardIds([cardId]);
    } else if (selectedCardIds.length === 1) {
      if (selectedCardIds[0] === cardId) {
        // Deselect
        setSelectedCardIds([]);
      } else {
        // Swap positions of card 1 and card 2!
        const srcIdx = displayCards.findIndex((c) => c.id === selectedCardIds[0]);
        const targetIdx = displayCards.findIndex((c) => c.id === cardId);
        if (srcIdx !== -1 && targetIdx !== -1) {
          const newHand = [...displayCards];
          const temp = newHand[srcIdx]!;
          newHand[srcIdx] = newHand[targetIdx]!;
          newHand[targetIdx] = temp;
          updateCurrentHand(newHand);
        }
        setSelectedCardIds([]);
      }
    } else {
      // Toggle card in multi-selection
      if (selectedCardIds.includes(cardId)) {
        setSelectedCardIds(selectedCardIds.filter((id) => id !== cardId));
      } else {
        setSelectedCardIds([...selectedCardIds, cardId]);
      }
    }
  };

  // Group selected cards together
  const handleGroupSelected = () => {
    if (displayCards.length < 2 || selectedCardIds.length < 2) return;
    const selSet = new Set(selectedCardIds);
    const selectedList = displayCards.filter((c) => selSet.has(c.id));
    const unselectedList = displayCards.filter((c) => !selSet.has(c.id));
    const newHand = [...selectedList, ...unselectedList];
    updateCurrentHand(newHand);
    setSelectedCardIds([]);
  };

  // Auto-sort by suits & ranks
  const handleAutoSort = () => {
    if (displayCards.length > 0) {
      const sorted = sortHand(displayCards);
      updateCurrentHand(sorted);
      setSelectedCardIds([]);
    }
  };

  // Auto-organize cards into optimal melds (minimum points)
  const handleOptimalMelds = () => {
    if (displayCards.length > 0 && meldAnalysis && meldAnalysis.groups) {
      const flattened = meldAnalysis.groups.flatMap((g) => g.cards);
      if (flattened.length === displayCards.length) {
        updateCurrentHand(flattened);
        setSelectedCardIds([]);
      }
    }
  };

  // Sort players for leaderboard: Winner first, then by total score ascending
  const sortedPlayers = [...players].sort((a, b) => {
    const rpA = roundPlayers.find((x) => x.player_id === a.player_id);
    const rpB = roundPlayers.find((x) => x.player_id === b.player_id);
    const isWinA = rpA?.status === "winner" || rpA?.status === "shown_valid";
    const isWinB = rpB?.status === "winner" || rpB?.status === "shown_valid";
    if (isWinA) return -1;
    if (isWinB) return 1;
    return a.total_score - b.total_score;
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden select-none"
      style={{
        background: "radial-gradient(ellipse 100% 70% at 50% 10%, #0d3b20 0%, #072213 55%, #030e07 100%)",
      }}
    >
      {/* Background Decorative Gold Flairs & Table Felt Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "radial-gradient(rgba(245, 166, 35, 0.25) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* ── TOP HEADER BAR: Round Winner Spotlight ── */}
      <div className="shrink-0 px-4 pt-3 pb-2.5 border-b border-amber-500/20 bg-black/40 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Round & Match Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(245,166,35,0.3)]">
              <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-400/80 uppercase tracking-widest">
                  {isMatchFinished ? "Match Completed" : `Round ${round.round_number} Summary`}
                </span>
                {isMatchFinished ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                    Final Standings
                  </span>
                ) : (
                  round.wild_joker && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Wild Joker: {round.wild_joker.wildRank}
                    </span>
                  )
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black font-[Outfit] text-white tracking-wide">
                {isMatchFinished && matchWinnerPlayer ? (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400 inline" />
                    {matchWinnerPlayer.name} is the Match Champion!
                  </span>
                ) : winnerPlayer ? (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400 inline" />
                    {winnerPlayer.name} won the round!
                  </span>
                ) : (
                  "Round Ended"
                )}
              </h2>
            </div>
          </div>

          {/* Right: Quick Stats & Trend Chart Toggle & View Settlement */}
          <div className="flex items-center gap-2">
            {isMatchFinished && onViewSettlement && (
              <button
                onClick={onViewSettlement}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all border border-amber-300"
              >
                <Trophy className="w-3.5 h-3.5 text-black" />
                <span>View Settlements</span>
              </button>
            )}
            {scoreHistory.length > 1 && (
              <button
                onClick={onToggleChart}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isChartVisible
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,166,35,0.2)]"
                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>{isChartVisible ? "Hide Trend Chart" : "Score Trend"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN BODY: Responsive All-In-One Dynamic Grid ── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-4 py-3 pb-24 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
          
          {/* ════ LEFT COLUMN: Leaderboard Table & Votes Widget (6 cols on lg) ════ */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            
            {/* 1. Standings & Scoreboard Card */}
            <div className="rounded-2xl bg-black/40 border border-amber-500/20 shadow-xl overflow-hidden backdrop-blur-md">
              <div
                onClick={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-950/40 to-black/60 border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-amber-950/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider font-[Outfit]">
                    Leaderboard & Scores
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/40 font-medium">
                    Elimination limit: 250 pts
                  </span>
                  {isLeaderboardOpen ? (
                    <ChevronUp className="w-4 h-4 text-white/50" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/50" />
                  )}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isLeaderboardOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="divide-y divide-white/5 overflow-hidden"
                  >
                    {/* Header Row */}
                    <div className="grid grid-cols-12 px-3.5 py-1.5 text-[10px] sm:text-[11px] font-black text-white/40 uppercase tracking-wider bg-black/20">
                      <div className="col-span-6 sm:col-span-7">Player</div>
                      <div className="col-span-3 text-right">This Round</div>
                      <div className="col-span-3 sm:col-span-2 text-right">Total</div>
                    </div>

                    {/* Players list */}
                    {sortedPlayers.map((p, idx) => {
                      const rp = roundPlayers.find((x) => x.player_id === p.player_id);
                      const isWinner = rp?.status === "winner" || rp?.status === "shown_valid";
                      const isSelf = p.player_id === userId;
                      const isOffline =
                        p.status === "disconnected" ||
                        (!isSelf && !onlinePlayerIds.includes(p.player_id));
                      const isSelectedForHand = selectedPlayerId === p.player_id;

                      // Score threshold percentage
                      const scorePct = Math.min(100, (p.total_score / 250) * 100);
                      const isHighRisk = p.total_score >= 180;
                      const isDanger = p.total_score >= 220;

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPlayerId(p.player_id)}
                          className={`grid grid-cols-12 items-center px-3.5 py-2.5 transition-all cursor-pointer ${
                            isSelectedForHand
                              ? "bg-amber-500/15 border-l-4 border-amber-400"
                              : isWinner
                              ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                              : p.status === "eliminated"
                              ? "bg-red-500/5 opacity-50"
                              : "hover:bg-white/5"
                          }`}
                        >
                          {/* Player Identity */}
                          <div className="col-span-6 sm:col-span-7 flex items-center gap-2 min-w-0">
                            {/* Rank Pill */}
                            <span
                              className={`w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 ${
                                isWinner
                                  ? "bg-amber-400 text-black shadow-sm"
                                  : idx === 1
                                  ? "bg-slate-300 text-black"
                                  : idx === 2
                                  ? "bg-amber-700 text-white"
                                  : "bg-white/10 text-white/60"
                              }`}
                            >
                              {isWinner ? "🏆" : idx + 1}
                            </span>

                            {/* Name & Status */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                                  {p.name}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                                    YOU
                                  </span>
                                )}
                                {isWinner && (
                                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-black">
                                    WINNER
                                  </span>
                                )}
                              </div>

                              {/* Status Sub-badge */}
                              <div className="flex items-center gap-1 mt-0.5">
                                {p.status === "eliminated" ? (
                                  <span className="text-[10px] text-red-400 font-bold">Eliminated</span>
                                ) : rp?.status === "dropped_first" ? (
                                  <span className="text-[10px] text-amber-400/80">First Drop (20)</span>
                                ) : rp?.status === "dropped_second" ? (
                                  <span className="text-[10px] text-amber-400/80">Second Drop (40)</span>
                                ) : rp?.status === "shown_wrong" ? (
                                  <span className="text-[10px] text-rose-400">Wrong Show (80)</span>
                                ) : isOffline ? (
                                  <span className="text-[10px] text-red-400/80 animate-pulse">Offline</span>
                                ) : (
                                  <span className="text-[10px] text-white/40">Active</span>
                                )}
                                {p.opted_leave_share && (
                                  <span className="text-[9px] bg-sky-500/15 text-sky-400 border border-sky-500/30 px-1 rounded">
                                    Leave Share
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Round Score Delta */}
                          <div className="col-span-3 text-right">
                            {rp && rp.score_this_round !== null ? (
                              <span
                                className={`text-sm sm:text-base font-black font-mono ${
                                  rp.score_this_round === 0
                                    ? "text-emerald-400"
                                    : rp.score_this_round <= 40
                                    ? "text-amber-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {rp.score_this_round === 0 ? "0 pts" : `+${rp.score_this_round}`}
                              </span>
                            ) : (
                              <span className="text-xs text-white/40 italic animate-pulse">Counting...</span>
                            )}
                          </div>

                          {/* Total Score with visual progress */}
                          <div className="col-span-3 sm:col-span-2 text-right">
                            <div className="text-sm sm:text-base font-black font-mono text-white">
                              {p.total_score}
                              <span className="text-[10px] text-white/40 font-normal">/250</span>
                            </div>
                            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-1 ml-auto max-w-[60px]">
                              <div
                                className={`h-full rounded-full ${
                                  isDanger
                                    ? "bg-red-500"
                                    : isHighRisk
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${scorePct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. Special Votes & Actions (Leave Share / Mutual Quit / Pause) */}
            {!isMatchFinished && (
            <div className="rounded-2xl bg-black/40 border border-white/10 shadow-xl overflow-hidden backdrop-blur-md">
              <div
                onClick={() => setIsVotesOpen(!isVotesOpen)}
                className="px-4 py-2.5 bg-gradient-to-r from-black/60 to-black/40 border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs sm:text-sm font-bold text-white/90 uppercase tracking-wider font-[Outfit]">
                    Leave Share & Mutual Votes
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-white/40">
                    {activeLeaveShareVote || activeQuitVote || activePauseVote ? "Active Vote" : "Options"}
                  </span>
                  {isVotesOpen ? (
                    <ChevronUp className="w-4 h-4 text-white/50" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/50" />
                  )}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isVotesOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 sm:p-4 space-y-3"
                  >
                    {/* Leave Share Vote */}
                    {players.some((p) => p.status === "eliminated") && me && me.status !== "eliminated" && (
                      <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                        <div>
                          <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5" /> Leave Share Protection
                          </div>
                          <p className="text-[11px] text-white/60 mt-0.5">
                            Active players won't pay the winner if they lose.
                          </p>
                        </div>
                        <button
                          onClick={onInitiateLeaveShareVote}
                          disabled={me.opted_leave_share || !!activeLeaveShareVote}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 w-full sm:w-auto border cursor-pointer ${
                            me.opted_leave_share
                              ? "bg-sky-500/20 text-sky-300 border-sky-500/40 cursor-not-allowed"
                              : activeLeaveShareVote
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 cursor-not-allowed"
                              : "bg-sky-600 hover:bg-sky-500 text-white border-transparent shadow"
                          }`}
                        >
                          {me.opted_leave_share
                            ? "✓ Active"
                            : activeLeaveShareVote
                            ? "Vote Active..."
                            : "Propose Leave Share"}
                        </button>
                      </div>
                    )}

                    {/* Mutual Quit Vote */}
                    {me && me.status !== "eliminated" && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                        <div>
                          <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <LogOut className="w-3.5 h-3.5" /> Mutual Quit (Split Pot)
                          </div>
                          <p className="text-[11px] text-white/60 mt-0.5">
                            End match and split the prize pool equally among remaining players.
                          </p>
                        </div>
                        <button
                          onClick={onInitiateMutualQuit}
                          disabled={!!activeQuitVote}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 w-full sm:w-auto border cursor-pointer ${
                            activeQuitVote
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 cursor-not-allowed"
                              : "bg-amber-600 hover:bg-amber-500 text-white border-transparent shadow"
                          }`}
                        >
                          {activeQuitVote ? "Vote Active..." : "Propose Split"}
                        </button>
                      </div>
                    )}

                    {/* Pause Game */}
                    {me && me.status !== "eliminated" && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                        <div>
                          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <PauseCircle className="w-3.5 h-3.5" /> Pause Match
                          </div>
                          <p className="text-[11px] text-white/60 mt-0.5">
                            Temporarily pause round timer for all participants.
                          </p>
                        </div>
                        <button
                          onClick={onInitiatePause}
                          disabled={!!activePauseVote}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 w-full sm:w-auto border cursor-pointer ${
                            activePauseVote
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 cursor-not-allowed"
                              : "bg-white/10 hover:bg-white/20 text-white border-white/10 shadow"
                          }`}
                        >
                          {activePauseVote ? "Vote Active..." : "Propose Pause"}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}
          </div>

          {/* ════ RIGHT COLUMN: Interactive Rearrangeable Hand & Score Breakdown (6 cols on lg) ════ */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            
            {/* 1. Cards Played / Rearrangeable Hand Card */}
            <div className="rounded-2xl bg-black/40 border border-emerald-500/20 shadow-xl overflow-hidden backdrop-blur-md">
              <div
                onClick={() => setIsCardsOpen(!isCardsOpen)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-950/40 to-black/60 border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-emerald-950/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs sm:text-sm font-black text-emerald-300 uppercase tracking-wider font-[Outfit]">
                    {selectedPlayerId === userId ? "Your Final Hand & Melds" : `${inspectingPlayer?.name || 'Player'}'s Hand`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const selectedRp = roundPlayers.find(x => x.player_id === selectedPlayerId);
                    if (selectedRp?.status === "winner" || selectedRp?.status === "shown_valid") {
                      return (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          0 pts (Winner!)
                        </span>
                      );
                    }
                    if (selectedRp?.status === "dropped_first") {
                      return (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          20 pts (First Drop)
                        </span>
                      );
                    }
                    if (selectedRp?.status === "dropped_second") {
                      return (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          40 pts (Second Drop)
                        </span>
                      );
                    }
                    if (selectedRp?.status === "shown_wrong") {
                      return (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          80 pts (Wrong Show)
                        </span>
                      );
                    }
                    if (meldAnalysis) {
                      const cappedPoints = Math.min(meldAnalysis.minimumPoints, 80);
                      return (
                        <span
                          className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                            cappedPoints === 0
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : cappedPoints <= 40
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {cappedPoints === 0 ? "0 pts (Valid Show!)" : `Score: ${cappedPoints} pts`}
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {isCardsOpen ? (
                    <ChevronUp className="w-4 h-4 text-white/50" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/50" />
                  )}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isCardsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 sm:p-4 space-y-3"
                  >
                    {/* Player selector tabs */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        <button
                          onClick={() => { setSelectedPlayerId(userId || ""); setSelectedCardIds([]); }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                            selectedPlayerId === userId
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                              : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                          }`}
                        >
                          Your Hand
                        </button>
                        {players
                          .filter((p) => p.player_id !== userId)
                          .map((p) => {
                            const rp = roundPlayers.find((x) => x.player_id === p.player_id);
                            const hasRevealedCards = rp?.hand && rp.hand.length > 0;
                            return (
                              <button
                                key={p.id}
                                onClick={() => { setSelectedPlayerId(p.player_id); setSelectedCardIds([]); }}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 border flex items-center gap-1 cursor-pointer ${
                                  selectedPlayerId === p.player_id
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                                    : "bg-white/5 text-white/50 border-white/10 hover:text-white"
                                }`}
                              >
                                <span>{p.name}</span>
                                {hasRevealedCards && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                )}
                              </button>
                            );
                          })}
                      </div>

                      {/* Controls for reordering/sorting displayed cards */}
                      {displayCards.length > 0 && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {selectedCardIds.length >= 2 && (
                            <button
                              onClick={handleGroupSelected}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-500 text-black hover:bg-amber-400 transition-all flex items-center gap-1 shadow cursor-pointer"
                            >
                              <Layers className="w-3 h-3" />
                              <span>Group ({selectedCardIds.length})</span>
                            </button>
                          )}
                          <button
                            onClick={handleOptimalMelds}
                            title="Auto-organize into best sequence and set melds to minimize score"
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Wand2 className="w-3 h-3 text-emerald-400" />
                            <span>Auto Melds</span>
                          </button>
                          <button
                            onClick={handleAutoSort}
                            title="Sort cards by suit and rank"
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3 text-amber-400" />
                            <span>Sort</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Hint text for swapping */}
                    {displayCards.length > 0 && (
                      <div className="text-[10px] text-white/40 flex items-center gap-1.5 px-1">
                        <ArrowLeftRight className="w-3 h-3 text-amber-400/80" />
                        <span>Tap any card to select, then tap another card to swap their position.</span>
                      </div>
                    )}

                    {/* Interactive Rearrangeable Cards Tray */}
                    {displayCards.length > 0 ? (
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 min-h-[110px]">
                        {displayCards.map((card, idx) => {
                          const isWild = isWildJoker(card, wildRank);
                          const isSelected = selectedCardIds.includes(card.id);

                          return (
                            <motion.div
                              key={card.id || idx}
                              layout
                              onClick={() => handleCardClick(card.id)}
                              animate={{
                                y: isSelected ? -12 : 0,
                                scale: isSelected ? 1.08 : 1,
                              }}
                              whileHover={{ y: isSelected ? -14 : -6, scale: 1.04 }}
                              whileTap={{ scale: 0.95 }}
                              className={`relative cursor-pointer transition-all ${
                                isSelected
                                  ? "ring-2 ring-amber-400 rounded-lg shadow-[0_0_16px_rgba(245,166,35,0.6)] z-20"
                                  : "z-10"
                              }`}
                            >
                              <PlayingCard
                                card={card}
                                size="sm"
                                isWildJoker={isWild}
                                selected={isSelected}
                              />
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl bg-black/20 border border-dashed border-white/10 text-center text-white/40 text-xs">
                        Cards for this player were not revealed or folded.
                      </div>
                    )}

                    {/* Live Meld Classification & Score Breakdown */}
                    {meldAnalysis && meldAnalysis.groups && (
                      <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-black text-amber-300/90 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" /> Melds & Score Analysis
                          </span>
                          <span className="font-mono text-emerald-400">
                            Counted Penalty: {Math.min(meldAnalysis.minimumPoints, 80)} pts
                          </span>
                        </div>

                        {/* Groups Chips */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {meldAnalysis.groups.map((group, gIdx) => {
                            const isPure = group.type === GroupType.PURE_SEQUENCE;
                            const isImpure = group.type === GroupType.IMPURE_SEQUENCE;
                            const isSet = group.type === GroupType.SET;
                            const isLondon = group.type === GroupType.LONDON;
                            const isInvalid = group.type === GroupType.INVALID;

                            const label = isPure
                              ? "Pure Sequence"
                              : isImpure
                              ? "2nd Sequence"
                              : isSet
                              ? "Valid Set"
                              : isLondon
                              ? "London Meld"
                              : "Deadwood / Unmatched";

                            return (
                              <div
                                key={gIdx}
                                className={`p-2 rounded-lg border flex items-center justify-between ${
                                  !isInvalid
                                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                                    : "bg-rose-500/10 border-rose-500/25 text-rose-300"
                                }`}
                              >
                                <div className="min-w-0 pr-1">
                                  <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    {!isInvalid ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                    ) : (
                                      <Info className="w-3 h-3 text-rose-400 shrink-0" />
                                    )}
                                    <span className="truncate">{label}</span>
                                  </div>
                                  <div className="text-[10px] text-white/70 font-mono mt-0.5 truncate">
                                    {group.cards.map((c) => `${c.rank}${c.suit[0]}`).join(" ")}
                                  </div>
                                </div>
                                <span className="font-mono text-xs font-black shrink-0">
                                  {group.points === 0 ? "0 pts" : `+${group.points} pts`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. Score Trend Chart (if opened or visible) */}
            {scoreHistory.length > 1 && isChartVisible && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-black/40 border border-amber-500/20 shadow-xl overflow-hidden p-3.5 backdrop-blur-md"
              >
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider font-[Outfit]">
                      Score Trend Across Rounds
                    </span>
                  </div>
                  <button
                    onClick={onToggleChart}
                    className="text-[11px] text-white/40 hover:text-white cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
                <div className="w-full">
                  <ScoreTrendChart scoreHistory={scoreHistory} players={players} />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ACTION FOOTER: Start Next Round OR View Match Settlements ── */}
      <div className="shrink-0 px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t border-amber-500/20 bg-black/60 backdrop-blur-xl relative z-20">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Note */}
          <div className="text-center sm:text-left">
            {isMatchFinished ? (
              <>
                <span className="text-xs font-black text-amber-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  🏆 Match Completed — Winner Decided!
                </span>
                <span className="text-[11px] text-white/60 block">
                  {matchWinnerPlayer
                    ? `${matchWinnerPlayer.name} won the match (${matchWinnerPlayer.total_score} pts).`
                    : "Game has finished."}{" "}
                  Check final leaderboard and bet settlements.
                </span>
              </>
            ) : (
              <>
                <span className="text-xs font-bold text-white/70 flex items-center justify-center sm:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Round {round.round_number} Completed
                </span>
                <span className="text-[11px] text-white/40 block">
                  {me?.status === "eliminated"
                    ? "You are eliminated. You will spectate upcoming rounds."
                    : isAdmin
                    ? "You are the room host. Ready for next round?"
                    : "Next round will start shortly."}
                </span>
              </>
            )}
          </div>

          {/* CTA Button */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            {isMatchFinished ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onViewSettlement}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all min-h-[44px] cursor-pointer bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black border border-amber-300 shadow-amber-900/40"
              >
                <Trophy className="w-4 h-4 text-black" />
                <span>View Settlements & Dashboard</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </motion.button>
            ) : isAdmin ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onStartNextRound}
                disabled={isCalculating}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all min-h-[44px] cursor-pointer ${
                  isCalculating
                    ? "bg-amber-600/40 text-white/50 cursor-not-allowed border border-white/10"
                    : "bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-900/40 border border-emerald-400/40"
                }`}
              >
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>
                  {isCalculating ? "Calculating Scores..." : `Start Round ${round.round_number + 1}`}
                </span>
              </motion.button>
            ) : (
              <div className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Waiting for host to start Round {round.round_number + 1}...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
