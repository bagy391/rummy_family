import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert, Wifi, WifiOff } from "lucide-react";

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
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const selectedOpp = opponents.find((o) => o.id === selectedOppId);
  const selectedOppRp = selectedOpp
    ? roundPlayers.find((p) => p.player_id === selectedOpp.player_id)
    : null;

  return (
    <div className="w-full overflow-x-auto md:overflow-visible scrollbar-none shrink-0 z-20 select-none py-2.5 px-3">
      <div className="flex md:flex-wrap flex-nowrap gap-3 items-center justify-center w-fit min-w-full px-4 md:overflow-visible">
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
            <div key={opp.id} className="relative flex flex-col items-center group">
              {/* Opponent Capsule Pill */}
              <motion.div
                layout
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedOppId(opp.id)}
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
                className={`cursor-pointer bg-gradient-to-r from-[#a65e3e] to-[#864627] border-2 px-2 md:px-3 flex items-center gap-2 md:gap-3.5 max-w-[220px] shrink-0 relative ${
                  isAdmin && (isOppOffline || opp.status === "disconnected")
                    ? "rounded-2xl py-1.5 md:py-2 min-w-[160px] md:min-w-[190px]"
                    : "rounded-full py-1 md:py-1.5 min-w-[140px] md:min-w-[170px]"
                }`}
              >
                {/* Left: Avatar with Online status dot overlay */}
                <div className="relative shrink-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#E19E3A] overflow-hidden bg-slate-700 flex items-center justify-center font-bold text-white text-xs md:text-sm">
                    {opp.avatarUrl ? (
                      <img src={opp.avatarUrl} alt={opp.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{opp.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {/* Status Dot */}
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-3.5 md:h-3.5 rounded-full border-2 border-[#864627] shrink-0 ${
                      isOppOffline || opp.status === "disconnected"
                        ? "bg-red-500"
                        : "bg-emerald-400"
                    }`}
                  />
                </div>

                {/* Middle: Name & Score / Status / Thinking / Action Buttons */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[13px] md:text-[15px] font-black text-white truncate leading-none">
                    {opp.name}
                  </span>
                  {isOppOffline || opp.status === "disconnected" ? (
                    <span className="text-[10px] md:text-[11px] font-bold text-red-400 mt-1 leading-none animate-pulse flex items-center gap-1">
                      {isAdmin && <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-400" />}
                      {getTimeoutText(opp) || "Offline"}
                    </span>
                  ) : isOppTurn && oppRp?.status === "active" ? (
                    <span className="text-[10px] md:text-[11px] font-black text-[var(--color-gold)] mt-1 leading-none tracking-wider uppercase flex items-center gap-0.5">
                      Think
                      <span className="inline-flex gap-0.5 shrink-0">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-0.75 h-0.75 rounded-full bg-[var(--color-gold)]"
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.2,
                              delay: i * 0.2,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[10px] md:text-[12px] font-bold text-[var(--color-gold-light)] font-score mt-1 leading-none">
                      {opp.total_score} pts
                    </span>
                  )}

                  {/* Direct Drop/Kick Buttons for Admin (Offline Players Only) */}
                  {isAdmin && opp.player_id !== userId && (isOppOffline || opp.status === "disconnected") && (
                    <div className="flex gap-1 mt-1.5">
                      {oppRp && oppRp.status === "active" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAdminKick(opp.player_id, "DROP");
                          }}
                          className="text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 px-1.5 py-0.5 rounded transition-colors border border-amber-500/30 flex-1 text-center min-h-[18px] leading-none"
                        >
                          Drop
                        </button>
                      )}
                      {opp.status !== "eliminated" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAdminKick(opp.player_id, "ELIMINATE");
                          }}
                          className="text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 hover:bg-red-500/40 px-1.5 py-0.5 rounded transition-colors border border-red-500/30 flex-1 text-center min-h-[18px] leading-none"
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Red card count badge */}
                {oppRp?.status === "active" ? (
                  <div className="w-6 h-8 md:w-7 md:h-9 bg-red-700 border-2 border-white rounded-[4px] flex flex-col items-center justify-center font-bold text-white text-[10px] md:text-[12px] shadow-md shrink-0 relative overflow-hidden">
                    <span className="z-10">{cardCount}</span>
                    {/* Card pattern */}
                    <div className="absolute inset-0.5 border border-white/20 rounded-[2px] bg-red-700 opacity-80" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent" />
                  </div>
                ) : oppRp ? (
                  <span className="text-[8px] md:text-[9px] font-bold text-amber-300 uppercase shrink-0">
                    {oppRp.status.replace("dropped_", "drop ").replace("_", " ")}
                  </span>
                ) : opp.status === "eliminated" ? (
                  <span className="text-[8px] md:text-[9px] font-bold text-red-400 uppercase shrink-0">
                    Out
                  </span>
                ) : null}
              </motion.div>



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

      {/* Opponent Details & Admin Actions Popover Modal */}
      <AnimatePresence>
        {selectedOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            {/* Backdrop click to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setSelectedOppId(null)}
            />

            {/* Modal Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-sm overflow-hidden bg-gradient-to-b from-[#1a2e3b] to-[#0f1c24] border border-[#E19E3A]/30 rounded-2xl shadow-2xl p-6 text-center select-none"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedOppId(null)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title */}
              <h3 className="text-[16px] font-black uppercase tracking-wider text-[var(--color-gold)] mb-4">
                Player Details
              </h3>

              {/* Profile Avatar */}
              <div className="flex flex-col items-center gap-3 mb-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-[#E19E3A] overflow-hidden bg-slate-800 flex items-center justify-center font-black text-white text-3xl shadow-lg">
                    {selectedOpp.avatarUrl ? (
                      <img
                        src={selectedOpp.avatarUrl}
                        alt={selectedOpp.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{selectedOpp.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {/* Connection Indicator Dot */}
                  <div
                    className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-[#0f1c24] ${
                      onlinePlayerIds.includes(selectedOpp.player_id)
                        ? "bg-emerald-400"
                        : "bg-red-500"
                    }`}
                  />
                </div>
                <div>
                  <h4 className="text-[18px] font-black text-white leading-tight">
                    {selectedOpp.name}
                  </h4>
                  <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mt-1">
                    {selectedOpp.is_admin ? "Room Admin" : "Player"}
                  </p>
                </div>
              </div>

              {/* Stats & Game Status Grid */}
              <div className="bg-[#2D5265]/20 border border-white/5 rounded-xl p-4 flex flex-col gap-3 mb-6 text-left">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[13px] font-bold text-white/50">Connection Status</span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold">
                    {onlinePlayerIds.includes(selectedOpp.player_id) ? (
                      <>
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Online</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-400">Offline</span>
                      </>
                    )}
                  </span>
                </div>

                {(!onlinePlayerIds.includes(selectedOpp.player_id) || selectedOpp.status === "disconnected") && (
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[13px] font-bold text-white/50">Disconnection Clock</span>
                    <span className="text-[13px] font-extrabold text-red-400 animate-pulse">
                      {getTimeoutText(selectedOpp) || "Offline"}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[13px] font-bold text-white/50">Rummy Score</span>
                  <span className="text-[14px] font-black text-[var(--color-gold)] font-score">
                    {selectedOpp.total_score} pts
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-white/50">Round Status</span>
                  <span className="text-[13px] font-extrabold text-white">
                    {selectedOppRp ? (
                      selectedOppRp.status === "active" ? (
                        <span className="text-emerald-400 uppercase">Playing (13 cards)</span>
                      ) : (
                        <span className="text-amber-400 uppercase">
                          {selectedOppRp.status.replace("dropped_", "drop ").replace("_", " ")}
                        </span>
                      )
                    ) : selectedOpp.status === "eliminated" ? (
                      <span className="text-red-400 uppercase">Eliminated</span>
                    ) : (
                      <span className="text-white/40 uppercase">Spectating</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Admin Actions Panel */}
              {isAdmin &&
                selectedOpp.player_id !== userId &&
                (!onlinePlayerIds.includes(selectedOpp.player_id) || selectedOpp.status === "disconnected") && (
                  <div className="border border-red-500/20 bg-red-950/20 rounded-xl p-3.5 mb-6 text-left flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-red-400">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span className="text-[12px] font-black uppercase tracking-wider">Admin Controls</span>
                    </div>
                    <p className="text-[11px] text-white/60 leading-normal">
                      This player is offline/disconnected. You can drop them from the current round or kick them from the room.
                    </p>
                    {selectedOppId && (
                      <div className="flex gap-3 mt-1.5">
                        {selectedOppRp && selectedOppRp.status === "active" && (
                          <button
                            onClick={() => {
                              onAdminKick(selectedOpp.player_id, "DROP");
                              setSelectedOppId(null);
                            }}
                            className="flex-1 text-[12px] font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 border border-amber-500/30 px-3 py-2 rounded-xl transition-all min-h-[36px]"
                          >
                            Drop Player
                          </button>
                        )}
                        {selectedOpp.status !== "eliminated" && (
                          <button
                            onClick={() => {
                              onAdminKick(selectedOpp.player_id, "ELIMINATE");
                              setSelectedOppId(null);
                            }}
                            className="flex-1 text-[12px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/30 px-3 py-2 rounded-xl transition-all min-h-[36px]"
                          >
                            Kick Player
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

              {/* Close Action Button */}
              <button
                onClick={() => setSelectedOppId(null)}
                className="w-full text-[13px] font-black uppercase tracking-wider bg-white/10 hover:bg-white/15 text-white py-2.5 rounded-xl border border-white/10 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
