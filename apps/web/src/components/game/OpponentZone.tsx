import { motion, AnimatePresence } from "framer-motion";

interface FloatingEmoji {
  id: string;
  senderId: string;
  emoji: string;
}

interface OpponentInfo {
  id: string;
  player_id: string;
  name: string;
  total_score: number;
  status: string;
  is_admin: boolean;
  avatarUrl?: string | null;
  disconnected_at?: string | null;
}

interface RoundPlayerInfo {
  player_id: string;
  status: string;
  has_drawn_this_turn: boolean;
}

interface OpponentZoneProps {
  opponents: OpponentInfo[];
  roundPlayers: RoundPlayerInfo[];
  currentTurnPlayerId: string | null;
  userId: string | undefined;
  isAdmin: boolean;
  onlinePlayerIds: string[];
  floatingEmojis: FloatingEmoji[];
  getTimeoutText: (p: OpponentInfo) => string;
  onAdminKick: (playerId: string, action: "ELIMINATE" | "DROP") => void;
}

export default function OpponentZone({
  opponents,
  roundPlayers,
  currentTurnPlayerId,
  userId,
  isAdmin,
  onlinePlayerIds,
  floatingEmojis,
  getTimeoutText,
  onAdminKick,
}: OpponentZoneProps) {
  return (
    <div className="w-full flex justify-center items-center gap-4 flex-wrap px-3 py-2 shrink-0 z-20 select-none">
      {opponents.map((opp) => {
        const oppRp = roundPlayers.find((p) => p.player_id === opp.player_id);
        const isOppTurn = currentTurnPlayerId === opp.player_id;
        const activeEmojisForOpp = floatingEmojis.filter(
          (e) => e.senderId === opp.player_id
        );
        const isOppOffline =
          opp.player_id !== userId &&
          !onlinePlayerIds.includes(opp.player_id);
        const cardCount = oppRp?.status === "active" ? 13 : 0;

        return (
          <div key={opp.id} className="relative flex flex-col items-center">
            {/* Opponent Capsule Pill */}
            <motion.div
              layout
              animate={{
                scale: isOppTurn ? 1.05 : 1,
                borderColor: isOppTurn
                  ? "var(--color-gold)"
                  : "rgba(255, 255, 255, 0.15)",
                boxShadow: isOppTurn
                  ? "0 0 15px var(--color-gold-glow)"
                  : "0 4px 6px rgba(0, 0, 0, 0.2)",
              }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="bg-gradient-to-r from-[#a65e3e] to-[#864627] border-2 px-3 py-1.5 rounded-full flex items-center gap-3.5 min-w-[170px] max-w-[210px] shrink-0"
            >
              {/* Left: Avatar with Online status dot overlay */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full border-2 border-[#E19E3A] overflow-hidden bg-slate-700 flex items-center justify-center font-bold text-white text-sm">
                  {opp.avatarUrl ? (
                    <img src={opp.avatarUrl} alt={opp.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{opp.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {/* Status Dot */}
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#864627] shrink-0 ${
                    isOppOffline || opp.status === "disconnected"
                      ? "bg-red-500"
                      : "bg-emerald-400"
                  }`}
                />
              </div>

              {/* Middle: Name & Score */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-[15px] font-black text-white truncate leading-none">
                  {opp.name}
                </span>
                <span className="text-[12px] font-bold text-[var(--color-gold-light)] font-score mt-1 leading-none">
                  {opp.total_score} pts
                </span>
              </div>

              {/* Right: Red card count badge */}
              {oppRp?.status === "active" ? (
                <div className="w-7 h-9 bg-red-700 border-2 border-white rounded-[4px] flex flex-col items-center justify-center font-bold text-white text-[12px] shadow-md shrink-0 relative overflow-hidden">
                  <span className="z-10">{cardCount}</span>
                  {/* Card pattern */}
                  <div className="absolute inset-0.5 border border-white/20 rounded-[2px] bg-red-700 opacity-80" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent" />
                </div>
              ) : oppRp ? (
                <span className="text-[9px] font-bold text-amber-300 uppercase shrink-0">
                  {oppRp.status.replace("dropped_", "drop ").replace("_", " ")}
                </span>
              ) : opp.status === "eliminated" ? (
                <span className="text-[9px] font-bold text-red-400 uppercase shrink-0">
                  Out
                </span>
              ) : null}
            </motion.div>

            {/* Thinking / Turn highlights indicator */}
            {isOppTurn && oppRp?.status === "active" && (
              <div className="absolute -bottom-5 flex items-center gap-1 text-[var(--color-gold)] select-none">
                <span className="text-[10px] font-bold tracking-wider uppercase">Thinking</span>
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1 h-1 rounded-full bg-[var(--color-gold)]"
                      animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.2,
                        delay: i * 0.2,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </span>
              </div>
            )}

            {/* Disconnection Warning & Admin Controls */}
            {(opp.status === "disconnected" || isOppOffline) && (
              <div className="absolute -bottom-8 flex flex-col items-center gap-1 z-30">
                <span className="text-[10px] text-red-400 font-semibold bg-black/60 px-2 py-0.5 rounded-full border border-red-500/20">
                  {getTimeoutText(opp)}
                </span>
                {isAdmin && (
                  <div className="flex gap-3 mt-1.5 bg-black/90 p-1.5 rounded-xl border border-white/10 shadow-lg">
                    <button
                      onClick={() => onAdminKick(opp.player_id, "DROP")}
                      className="text-[11px] font-bold bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/40 transition-colors min-h-[30px] min-w-[52px]"
                    >
                      Drop
                    </button>
                    <button
                      onClick={() => onAdminKick(opp.player_id, "ELIMINATE")}
                      className="text-[11px] font-bold bg-red-500/20 text-red-400 px-3 py-1 rounded-lg hover:bg-red-500/40 transition-colors min-h-[30px] min-w-[52px]"
                    >
                      Kick
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Floating Emojis */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-50">
              <AnimatePresence>
                {activeEmojisForOpp.map((fe) => (
                  <motion.div
                    key={fe.id}
                    initial={{ opacity: 0, y: 10, scale: 0.5 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      y: [10, -10, -25, -40],
                      scale: [0.5, 1.4, 1.4, 0.9],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 2.0,
                      times: [0, 0.15, 0.8, 1],
                      ease: "easeOut",
                    }}
                    className="text-2xl filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
                  >
                    {fe.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
