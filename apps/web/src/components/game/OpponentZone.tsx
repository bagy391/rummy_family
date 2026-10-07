import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert, Wifi, WifiOff, Move } from "lucide-react";

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

interface OpponentSeatConfig {
  style: {
    top: string;
    left: string;
  };
}

interface RingOffset {
  x: number;
  y: number;
}

const STORAGE_KEY = "rummy_opponent_ring_offsets_v2";



/**
 * Compute clean default seat coordinates along the top perimeter & upper corners.
 * Kept well above center decks and player hand to avoid overlapping.
 * All positions use explicit top/left percentages with -translate-x-1/2 -translate-y-1/2.
 */
function getOpponentSeat(index: number, total: number): OpponentSeatConfig {
  if (total <= 1) {
    return {
      style: { top: '6%', left: '50%' },
    };
  }
  if (total === 2) {
    const seats: OpponentSeatConfig[] = [
      { style: { top: '6%', left: '32%' } },
      { style: { top: '6%', left: '68%' } },
    ];
    return seats[index] ?? seats[0]!;
  }
  if (total === 3) {
    const seats: OpponentSeatConfig[] = [
      { style: { top: '12%', left: '10%' } },
      { style: { top: '6%', left: '50%' } },
      { style: { top: '12%', left: '90%' } },
    ];
    return seats[index] ?? seats[0]!;
  }
  if (total === 4) {
    const seats: OpponentSeatConfig[] = [
      { style: { top: '14%', left: '10%' } },
      { style: { top: '6%', left: '34%' } },
      { style: { top: '6%', left: '66%' } },
      { style: { top: '14%', left: '90%' } },
    ];
    return seats[index] ?? seats[0]!;
  }
  // 5 or 6 opponents
  const seats: OpponentSeatConfig[] = [
    { style: { top: '15%', left: '9%' } },
    { style: { top: '6%', left: '28%' } },
    { style: { top: '6%', left: '50%' } },
    { style: { top: '6%', left: '72%' } },
    { style: { top: '15%', left: '91%' } },
  ];
  return seats[index % seats.length] ?? seats[0]!;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  // Active drag state
  const [draggingOppId, setDraggingOppId] = useState<string | null>(null);
  const [liveDragOffset, setLiveDragOffset] = useState<RingOffset>({ x: 0, y: 0 });
  const startPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartOffsetRef = useRef<RingOffset>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const activeDragOppRef = useRef<{ oppId: string; playerKey: string; seatKey: string } | null>(null);

  // User-configured custom positions (persisted across rounds & sessions)
  const [customOffsets, setCustomOffsets] = useState<Record<string, RingOffset>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    opp: OpponentInfo,
    playerKey: string,
    seatKey: string,
    currentOffset: RingOffset
  ) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    startPointerPosRef.current = { x: e.clientX, y: e.clientY };
    dragStartOffsetRef.current = { ...currentOffset };
    hasMovedRef.current = false;
    activeDragOppRef.current = { oppId: opp.id, playerKey, seatKey };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch { }
  };

  const handlePointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    opp: OpponentInfo,
    seat: OpponentSeatConfig
  ) => {
    if (!startPointerPosRef.current || activeDragOppRef.current?.oppId !== opp.id) return;
    const dx_screen = e.clientX - startPointerPosRef.current.x;
    const dy_screen = e.clientY - startPointerPosRef.current.y;

    if (!hasMovedRef.current) {
      if (Math.hypot(dx_screen, dy_screen) > 6) {
        hasMovedRef.current = true;
        setDraggingOppId(opp.id);
      } else {
        return;
      }
    }

    // Pointer delta directly matches container coordinate space
    const localDx = dx_screen;
    const localDy = dy_screen;

    let targetX = dragStartOffsetRef.current.x + localDx;
    let targetY = dragStartOffsetRef.current.y + localDy;

    // Bounds checking to ensure ring stays safely inside table boundaries
    const container = containerRef.current;
    if (container) {
      const containerW = container.offsetWidth;
      const containerH = container.offsetHeight;
      const seatLeftPx = (parseFloat(seat.style.left) / 100) * containerW;
      const seatTopPx = (parseFloat(seat.style.top) / 100) * containerH;

      const minX = 28 - seatLeftPx;
      const maxX = containerW - 28 - seatLeftPx;
      const minY = 24 - seatTopPx;
      const maxY = containerH - 24 - seatTopPx;

      targetX = Math.max(minX, Math.min(maxX, targetX));
      targetY = Math.max(minY, Math.min(maxY, targetY));
    }

    setLiveDragOffset({
      x: Math.round(targetX),
      y: Math.round(targetY),
    });
  };

  const handlePointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    opp: OpponentInfo,
    playerKey: string,
    seatKey: string,
    seat: OpponentSeatConfig
  ) => {
    if (!startPointerPosRef.current || activeDragOppRef.current?.oppId !== opp.id) return;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { }

    if (hasMovedRef.current) {
      const dx_screen = e.clientX - startPointerPosRef.current.x;
      const dy_screen = e.clientY - startPointerPosRef.current.y;
      const localDx = dx_screen;
      const localDy = dy_screen;

      let targetX = dragStartOffsetRef.current.x + localDx;
      let targetY = dragStartOffsetRef.current.y + localDy;

      const container = containerRef.current;
      if (container) {
        const containerW = container.offsetWidth;
        const containerH = container.offsetHeight;
        const seatLeftPx = (parseFloat(seat.style.left) / 100) * containerW;
        const seatTopPx = (parseFloat(seat.style.top) / 100) * containerH;

        const minX = 28 - seatLeftPx;
        const maxX = containerW - 28 - seatLeftPx;
        const minY = 24 - seatTopPx;
        const maxY = containerH - 24 - seatTopPx;

        targetX = Math.max(minX, Math.min(maxX, targetX));
        targetY = Math.max(minY, Math.min(maxY, targetY));
      }

      const finalOffset: RingOffset = {
        x: Math.round(targetX),
        y: Math.round(targetY),
      };

      setCustomOffsets((prev) => {
        const next = {
          ...prev,
          [playerKey]: finalOffset,
          [seatKey]: finalOffset,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch { }
        return next;
      });
    } else {
      // Tap / click without movement -> Open opponent modal
      setSelectedOppId(opp.id);
    }

    startPointerPosRef.current = null;
    hasMovedRef.current = false;
    setDraggingOppId(null);
    activeDragOppRef.current = null;
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { }
    startPointerPosRef.current = null;
    hasMovedRef.current = false;
    setDraggingOppId(null);
    activeDragOppRef.current = null;
  };

  const selectedOpp = opponents.find((o) => o.id === selectedOppId);
  const selectedOppRp = selectedOpp
    ? roundPlayers.find((p) => p.player_id === selectedOpp.player_id)
    : null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-20 select-none overflow-hidden"
    >

      {/* Opponent Rings */}
      {opponents.map((opp, index) => {
        const oppRp = roundPlayers.find((p) => p.player_id === opp.player_id);
        const isOppTurn = currentTurnPlayerId === opp.player_id;
        const activeEmojisForOpp = floatingEmojis.filter((e) => e.senderId === opp.player_id);
        const isOppOffline = opp.player_id !== userId && !onlinePlayerIds.includes(opp.player_id);
        const isDropped = oppRp && oppRp.status !== "active";
        const isEliminated = opp.status === "eliminated";
        const cardCount = oppRp?.status === "active" ? 13 : 0;

        const seat = getOpponentSeat(index, opponents.length);
        const seatKey = `seat_${index}_${opponents.length}`;
        const playerKey = opp.player_id;
        const currentOffset = customOffsets[playerKey] || customOffsets[seatKey] || { x: 0, y: 0 };

        const isThisDragging = draggingOppId === opp.id;
        const activeX = isThisDragging ? liveDragOffset.x : currentOffset.x;
        const activeY = isThisDragging ? liveDragOffset.y : currentOffset.y;

        return (
          <motion.div
            key={opp.id}
            onPointerDown={(e) => handlePointerDown(e, opp, playerKey, seatKey, currentOffset)}
            onPointerMove={(e) => handlePointerMove(e, opp, seat)}
            onPointerUp={(e) => handlePointerUp(e, opp, playerKey, seatKey, seat)}
            onPointerCancel={handlePointerCancel}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: isThisDragging ? 1.15 : 1,
              x: activeX,
              y: activeY,
            }}
            transition={
              isThisDragging
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 28 }
            }
            className="absolute pointer-events-auto cursor-grab active:cursor-grabbing group select-none touch-none"
            style={{
              top: seat.style.top,
              left: seat.style.left,
              zIndex: isThisDragging ? 100 : 20,
              touchAction: "none",
            }}
            whileHover={isThisDragging ? undefined : { scale: 1.04 }}
            title={`${opp.name} • Drag to move anywhere • Click for info`}
          >
            {/* Centering wrapper so coordinate percentages are centered precisely */}
            <div className="-translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              {/* Floating Emojis */}
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex flex-col items-center">
                <AnimatePresence>
                  {activeEmojisForOpp.map((fe) => (
                    <motion.div
                      key={fe.id}
                      initial={{ opacity: 0, y: 10, scale: 0.5 }}
                      animate={{ opacity: 1, y: -20, scale: 1.3 }}
                      exit={{ opacity: 0, y: -35, scale: 0.8 }}
                      transition={{ duration: 1.8, ease: "easeOut" }}
                      className="text-2xl drop-shadow-md"
                    >
                      {fe.emoji}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Avatar Ring Frame */}
              <div className="relative flex items-center justify-center">
                {/* Active turn glowing halo ring */}
                {isOppTurn && (
                  <motion.div
                    className="absolute -inset-2 rounded-full z-0 pointer-events-none"
                    animate={{
                      scale: [1, 1.16, 1],
                      opacity: [0.6, 1, 0.6],
                    }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    style={{
                      background: 'radial-gradient(circle, rgba(16,185,129,0.85) 0%, rgba(16,185,129,0.2) 65%, transparent 85%)',
                    }}
                  />
                )}

                {/* 3D Metallic Ring Frame */}
                <div
                  className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center p-[2px] shadow-xl transition-all group-hover:shadow-[0_0_16px_rgba(245,166,35,0.4)]"
                  style={{
                    background: isOppTurn
                      ? 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)'
                      : isOppOffline
                      ? 'linear-gradient(135deg, #f87171 0%, #ef4444 50%, #b91c1c 100%)'
                      : 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 40%, #64748b 80%, #334155 100%)',
                    boxShadow: isOppTurn
                      ? '0 0 16px rgba(16,185,129,0.7), inset 0 1px 2px rgba(255,255,255,0.9)'
                      : '0 4px 10px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.7)',
                  }}
                >
                  {/* Inner image */}
                  <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center font-black text-white text-xs shadow-inner relative">
                    {opp.avatarUrl ? (
                      <img src={opp.avatarUrl} alt={opp.name} className="w-full h-full object-cover" />
                    ) : (
                      <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                        {opp.name.charAt(0).toUpperCase()}
                      </span>
                    )}

                    {/* Offline overlay */}
                    {isOppOffline && (
                      <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                        <WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Online Dot */}
                  <div
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#122812]"
                    style={{ background: isOppOffline ? '#ef4444' : '#10b981' }}
                  />
                </div>

                {/* Mini Card Count Badge */}
                {!isDropped && !isEliminated && cardCount > 0 && (
                  <div
                    className="absolute -top-1 -right-1 z-20 bg-amber-500 text-black text-[7.5px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md border border-amber-200"
                    title={`${cardCount} cards`}
                  >
                    {cardCount}
                  </div>
                )}
              </div>

              {/* Compact Name + Score Pill with subtle Drag Indicator */}
              <div
                className="mt-1 px-1.5 py-0.5 rounded-full text-center shadow-md flex items-center gap-1 backdrop-blur-md transition-all group-hover:border-amber-400/50"
                style={{
                  background: isOppTurn ? 'rgba(16,185,129,0.3)' : 'rgba(0,0,0,0.68)',
                  border: isOppTurn ? '1px solid rgba(16,185,129,0.6)' : '1px solid rgba(255,255,255,0.14)',
                  minWidth: '52px',
                }}
              >
                <Move className="w-2 h-2 text-white/30 group-hover:text-amber-300 transition-colors shrink-0" />
                <span className="text-[9px] font-black text-white truncate max-w-[50px] leading-none uppercase">
                  {opp.name}
                </span>
                <span className="text-[8px] font-bold text-amber-300 font-score leading-none">
                  {isDropped ? "drop" : isEliminated ? "out" : `${opp.total_score}p`}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Opponent Info / Admin Modal */}
      <AnimatePresence>
        {selectedOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#122416] border border-amber-500/30 rounded-2xl p-5 max-w-sm w-full shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedOppId(null)}
                className="absolute top-3 right-3 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-700 border-2 border-amber-400 flex items-center justify-center font-bold text-white text-lg">
                  {selectedOpp.avatarUrl ? (
                    <img src={selectedOpp.avatarUrl} alt={selectedOpp.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{selectedOpp.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-none">{selectedOpp.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    {onlinePlayerIds.includes(selectedOpp.player_id) ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <Wifi className="w-3 h-3" /> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-red-400 font-medium">
                        <WifiOff className="w-3 h-3" /> {getTimeoutText(selectedOpp) || "Offline"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-black/30 rounded-xl p-2.5 text-center border border-white/5">
                  <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Total Score</div>
                  <div className="text-lg font-black text-amber-400 font-score">{selectedOpp.total_score} pts</div>
                </div>
                <div className="bg-black/30 rounded-xl p-2.5 text-center border border-white/5">
                  <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Status</div>
                  <div className="text-sm font-bold text-white capitalize mt-0.5">
                    {selectedOppRp?.status?.replace("_", " ") || selectedOpp.status}
                  </div>
                </div>
              </div>

              {/* Admin Kick / Drop Actions */}
              {isAdmin && selectedOpp.player_id !== userId && (
                <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Admin Controls
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onAdminKick(selectedOpp.player_id, "DROP");
                        setSelectedOppId(null);
                      }}
                      className="flex-1 py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/30 transition-all"
                    >
                      Force Drop
                    </button>
                    <button
                      onClick={() => {
                        onAdminKick(selectedOpp.player_id, "ELIMINATE");
                        setSelectedOppId(null);
                      }}
                      className="flex-1 py-1.5 px-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg border border-red-500/30 transition-all"
                    >
                      Eliminate
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
