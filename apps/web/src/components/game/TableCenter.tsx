import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Suit, Rank, isWildJoker } from "@rummy/shared";
import type { Card, WildJokerInfo } from "@rummy/shared";
import { Volume2, VolumeX, LogOut, RefreshCw, Trophy, Layers, X, Wifi } from "lucide-react";
import PlayingCard from "./PlayingCard";

interface TableCenterProps {
  discardPile: Card[];
  isMyTurn: boolean;
  hasDrawnThisTurn: boolean;
  currentTurnPlayerName: string;
  onDrawCard: () => void;
  onPickDiscard: () => void;

  selectedCards: string[];
  onCardClick: (cardId: string) => void;
  wildJoker: WildJokerInfo | null;
  onResortHand?: () => void;

  myName: string;
  myAvatarUrl?: string | null;
  myTotalScore: number;
  roundNumber: number;
  betAmount: number;
  soundOn: boolean;
  vibrationOn: boolean;
  onToggleSound: () => void;
  onToggleVibration: () => void;
  onQuit: () => void;

  myHand: Card[];
  showFirstDrop: boolean;
  showSecondDrop: boolean;
  onDropFirst: () => void;
  onDropSecond: () => void;
  onDeclareShow: (card: Card) => void;
  onDiscard: (card: Card) => void;
  onReorder: (newHand: Card[]) => void;

  isSpectator?: boolean;
  spectatorContent?: React.ReactNode;

  rowSizes?: { id: string; size: number }[];
  onRowSizesChange?: (sizes: { id: string; size: number }[]) => void;
  boardOnly?: boolean;

  voiceContent?: React.ReactNode;
  justDrawnCardId?: string | null;
}

/* ─── Row-size healing helper ─── */
function healRowSizes(
  currentSizes: { id: string; size: number }[],
  handLength: number
): { id: string; size: number }[] {
  const s = currentSizes.map((g) => ({ ...g }));
  let total = s.reduce((a, g) => a + g.size, 0);
  if (total === handLength) return s;
  if (total < handLength) {
    let diff = handLength - total;
    for (let i = 0; i < s.length && diff > 0; i++) {
      const g = s[i]!;
      const space = 5 - g.size;
      if (space > 0) { const add = Math.min(space, diff); g.size += add; diff -= add; }
    }
    while (diff > 0) {
      const size = Math.min(5, diff);
      s.push({ id: `g-${Math.random().toString(36).slice(2, 9)}`, size });
      diff -= size;
    }
  } else {
    let diff = total - handLength;
    for (let i = s.length - 1; i >= 0 && diff > 0; i--) {
      const g = s[i]!;
      if (g.size <= diff) { diff -= g.size; s.splice(i, 1); } else { g.size -= diff; diff = 0; }
    }
  }
  return s;
}

function HandCardItem({
  card,
  isSelected,
  isHoverTarget,
  isJustDrawn = false,
  cardIdx,
  dynamicMarginLeft,
  onCardClick,
  onDragStart,
  onDrag,
  onDragEnd,
  wildJoker,
}: {
  card: Card;
  isSelected: boolean;
  isHoverTarget: boolean;
  isJustDrawn?: boolean;
  cardIdx: number;
  dynamicMarginLeft?: number;
  onCardClick: () => void;
  onDragStart: () => void;
  onDrag: (point: { x: number; y: number }) => void;
  onDragEnd: (point: { x: number; y: number }) => void;
  wildJoker: WildJokerInfo | null;
}) {
  const isWild = wildJoker ? isWildJoker(card, wildJoker.wildRank) : false;
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch { }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startPosRef.current) return;
    const dx_screen = e.clientX - startPosRef.current.x;
    const dy_screen = e.clientY - startPosRef.current.y;

    if (!hasMovedRef.current) {
      if (Math.hypot(dx_screen, dy_screen) > 6) {
        hasMovedRef.current = true;
        setIsDragging(true);
        onDragStart();
      } else {
        return;
      }
    }

    setOffset({ x: dx_screen, y: dy_screen });
    onDrag({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startPosRef.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { }

    if (hasMovedRef.current) {
      onDragEnd({ x: e.clientX, y: e.clientY });
    } else {
      onCardClick();
    }

    startPosRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(false);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startPosRef.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { }
    if (hasMovedRef.current) {
      onDragEnd({ x: e.clientX, y: e.clientY });
    }
    startPosRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(false);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <motion.div
      layoutId={card.id}
      data-card-idx={cardIdx}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      animate={{
        y: isDragging ? offset.y : isSelected ? -16 : isJustDrawn ? -8 : 0,
        x: isDragging ? offset.x : 0,
        scale: isDragging ? 1.18 : 1,
        rotateZ: isDragging ? 4 : 0,
      }}
      style={{
        zIndex: isDragging ? 999999 : isSelected ? 80 : isJustDrawn ? 60 : 10 + cardIdx,
        opacity: 1,
        boxShadow: isDragging ? '0 16px 36px rgba(0,0,0,0.8), 0 0 24px rgba(245,166,35,0.6)' : isJustDrawn ? '0 0 16px 4px rgba(245,166,35,0.45)' : undefined,
        touchAction: "none",
        marginLeft: cardIdx > 0
          ? dynamicMarginLeft !== undefined
            ? `${dynamicMarginLeft}px`
            : "var(--card-neg-margin)"
          : undefined,
      }}
      whileHover={isDragging ? undefined : { y: isSelected ? -20 : isJustDrawn ? -12 : -8, scale: 1.03, zIndex: 90 }}
      whileTap={isDragging ? undefined : { scale: 0.96 }}
      transition={isDragging ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 26 }}
      className={`relative cursor-grab active:cursor-grabbing select-none shrink-0 ${isHoverTarget ? "ring-2 ring-emerald-400 rounded-[8px]" : ""
        }`}
    >
      <PlayingCard
        card={card}
        size="lg"
        selected={isSelected}
        isWildJoker={isWild}
        isJustDrawn={isJustDrawn}
      />
    </motion.div>
  );
}

export default function TableCenter({
  discardPile,
  isMyTurn,
  hasDrawnThisTurn,
  currentTurnPlayerName,
  onDrawCard,
  onPickDiscard,
  selectedCards,
  onCardClick,
  wildJoker,
  onResortHand,
  myName,
  myAvatarUrl,
  myTotalScore,
  roundNumber,
  betAmount,
  soundOn,
  vibrationOn: _vibrationOn,
  onToggleSound,
  onToggleVibration: _onToggleVibration,
  onQuit,
  myHand,
  showFirstDrop,
  showSecondDrop,
  onDropFirst,
  onDropSecond,
  onDeclareShow,
  onDiscard,
  onReorder,
  isSpectator = false,
  spectatorContent,
  rowSizes: propRowSizes,
  onRowSizesChange,
  boardOnly = false,
  voiceContent,
  justDrawnCardId = null,
}: TableCenterProps) {
  const canDraw = isMyTurn && !hasDrawnThisTurn && !isSpectator;
  const canDiscard = isMyTurn && hasDrawnThisTurn && !isSpectator;
  const topCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isConfirmingQuit, setIsConfirmingQuit] = useState(false);
  const [activeDragIdx, setActiveDragIdx] = useState<number | null>(null);
  const [hoveredSlotIdx, setHoveredSlotIdx] = useState<number | null>(null);
  const [discardHover, setDiscardHover] = useState(false);
  const [finishHover, setFinishHover] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const handContainerRef = useRef<HTMLDivElement>(null);
  const discardZoneRef = useRef<HTMLDivElement>(null);
  const finishZoneRef = useRef<HTMLDivElement>(null);
  const slotCenters = useRef<{ x: number; y: number; idx: number }[]>([]);
  const lastHandRef = useRef<Card[]>([]);
  const isLocalReorderRef = useRef(false);
  const [localRowSizes, setLocalRowSizes] = useState<{ id: string; size: number }[]>([]);
  const rowSizes = propRowSizes !== undefined ? propRowSizes : localRowSizes;
  const setRowSizes = onRowSizesChange !== undefined ? onRowSizesChange : setLocalRowSizes;

  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!handContainerRef.current) return;
    const updateWidth = () => {
      if (handContainerRef.current) {
        setContainerWidth(handContainerRef.current.clientWidth);
      }
    };
    updateWidth();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(handContainerRef.current);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  /* ─── Compute dynamic card margin to fill bottom row with room for bottom-right chat ─── */
  const cardCount = myHand.length;
  const cardWidth = 66;
  const rightReservedSpace = 56; // Reserved space for bottom-right Chat button
  const availableWidth = Math.max((containerWidth || 700) - rightReservedSpace - 16, cardWidth);
  const step = cardCount > 1
    ? Math.min((availableWidth - cardWidth) / (cardCount - 1), cardWidth * 0.82)
    : 0;
  const dynamicMarginLeft = cardCount > 1 ? -(cardWidth - step) : 0;

  /* ─── Row-size sync ─── */
  useEffect(() => {
    if (myHand.length === 0) return;
    const total = rowSizes.reduce((s, g) => s + g.size, 0);
    if (total !== myHand.length) {
      setRowSizes(healRowSizes(rowSizes, myHand.length));
    }
  }, [myHand.length, rowSizes, setRowSizes]);

  useEffect(() => {
    const prev = lastHandRef.current;
    lastHandRef.current = myHand;
    if (myHand.length === 0) { setRowSizes([]); return; }
    const same = prev.length === myHand.length && myHand.every((c, i) => c.id === prev[i]?.id);
    if (same) return;
    if (isLocalReorderRef.current) { isLocalReorderRef.current = false; return; }

    if (prev.length === 0 || myHand.length === prev.length || Math.abs(myHand.length - prev.length) > 1) {
      const sizes: { id: string; size: number }[] = [];
      let rem = myHand.length;
      while (rem > 0) {
        const size = rem >= 4 ? 4 : rem;
        sizes.push({ id: `g-${Math.random().toString(36).slice(2, 9)}`, size });
        rem -= size;
      }
      setRowSizes(sizes);
      return;
    }
    // +1 card (drawn)
    if (myHand.length === prev.length + 1) {
      const ns = [...rowSizes];
      if (!ns.length) { ns.push({ id: `g-${Math.random().toString(36).slice(2, 9)}`, size: 1 }); }
      else {
        const li = ns.length - 1;
        const lg = ns[li]!;
        if (lg.size < 5) ns[li] = { ...lg, size: lg.size + 1 };
        else ns.push({ id: `g-${Math.random().toString(36).slice(2, 9)}`, size: 1 });
      }
      setRowSizes(ns);
      return;
    }
    // -1 card (discarded)
    if (myHand.length === prev.length - 1) {
      const removedIdx = prev.findIndex((c) => !myHand.some((nc) => nc.id === c.id));
      if (removedIdx !== -1) {
        let acc = 0;
        for (let i = 0; i < rowSizes.length; i++) {
          const g = rowSizes[i]!;
          acc += g.size;
          if (removedIdx < acc) {
            const ns = [...rowSizes];
            const ng = { ...g, size: g.size - 1 };
            if (ng.size === 0) ns.splice(i, 1); else ns[i] = ng;
            setRowSizes(ns);
            return;
          }
        }
      }
      const ns = [...rowSizes];
      if (ns.length) {
        const li = ns.length - 1;
        const lg = ns[li]!;
        const ns2 = lg.size - 1 === 0 ? ns.slice(0, -1) : [...ns.slice(0, -1), { ...lg, size: lg.size - 1 }];
        setRowSizes(ns2);
      }
    }
  }, [myHand, rowSizes, setRowSizes]);

  /* ─── Drag handlers ─── */
  const handleDragStart = useCallback((idx: number) => {
    setActiveDragIdx(idx);
    if (handContainerRef.current) {
      const els = handContainerRef.current.querySelectorAll("[data-card-idx]");
      slotCenters.current = Array.from(els).map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, idx: parseInt(el.getAttribute("data-card-idx") || "0") };
      });
    }
  }, []);

  const handleDrag = useCallback((point: { x: number; y: number }) => {
    if (activeDragIdx === null) return;
    const { x, y } = point;

    // Check Discard Pile drop target
    if (discardZoneRef.current) {
      const dr = discardZoneRef.current.getBoundingClientRect();
      const overDiscard = x >= dr.left - 25 && x <= dr.right + 25 && y >= dr.top - 25 && y <= dr.bottom + 25;
      setDiscardHover(overDiscard && canDiscard);
    }

    // Check Finish Slot drop target
    if (finishZoneRef.current) {
      const fr = finishZoneRef.current.getBoundingClientRect();
      const overFinish = x >= fr.left - 25 && x <= fr.right + 25 && y >= fr.top - 25 && y <= fr.bottom + 25;
      setFinishHover(overFinish && canDiscard);
    }

    // Nearest hand card slot for reordering
    let closest: { x: number; y: number; idx: number } | null = null;
    let minDist = Infinity;
    slotCenters.current.forEach((slot) => {
      const d = Math.hypot(x - slot.x, y - slot.y);
      if (d < minDist) { minDist = d; closest = slot; }
    });
    if (closest) setHoveredSlotIdx((closest as any).idx);
  }, [activeDragIdx, canDiscard]);

  const handleDragEnd = useCallback((point: { x: number; y: number }) => {
    const { x, y } = point;
    const draggedCard = activeDragIdx !== null ? myHand[activeDragIdx] : null;

    // 1. Drop on Finish Slot -> Declare Show
    if (draggedCard && canDiscard && finishZoneRef.current) {
      const fr = finishZoneRef.current.getBoundingClientRect();
      if (x >= fr.left - 25 && x <= fr.right + 25 && y >= fr.top - 25 && y <= fr.bottom + 25) {
        if (navigator.vibrate) navigator.vibrate(40);
        onDeclareShow(draggedCard);
        setActiveDragIdx(null);
        setHoveredSlotIdx(null);
        setFinishHover(false);
        setDiscardHover(false);
        slotCenters.current = [];
        return;
      }
    }
    setFinishHover(false);

    // 2. Drop on Open Deck -> Discard
    if (draggedCard && canDiscard && discardZoneRef.current) {
      const dr = discardZoneRef.current.getBoundingClientRect();
      if (x >= dr.left - 25 && x <= dr.right + 25 && y >= dr.top - 25 && y <= dr.bottom + 25) {
        if (navigator.vibrate) navigator.vibrate(30);
        onDiscard(draggedCard);
        setActiveDragIdx(null);
        setHoveredSlotIdx(null);
        setDiscardHover(false);
        setFinishHover(false);
        slotCenters.current = [];
        return;
      }
    }
    setDiscardHover(false);

    // 3. Drop on hand slot -> Reorder hand
    if (activeDragIdx !== null && hoveredSlotIdx !== null && hoveredSlotIdx !== activeDragIdx && hoveredSlotIdx < myHand.length) {
      const newHand = [...myHand];
      const [moved] = newHand.splice(activeDragIdx, 1);
      if (moved) {
        newHand.splice(hoveredSlotIdx, 0, moved);
        isLocalReorderRef.current = true;
        setTimeout(() => {
          onReorder(newHand);
        }, 0);
      }
    }

    setActiveDragIdx(null);
    setHoveredSlotIdx(null);
    slotCenters.current = [];
  }, [activeDragIdx, hoveredSlotIdx, canDiscard, myHand, onDeclareShow, onDiscard, onReorder]);

  /* ─── Group Selected Cards ─── */
  const handleGroupSelected = () => {
    if (selectedCards.length < 2) return;
    const selSet = new Set(selectedCards);
    const selectedList = myHand.filter((c) => selSet.has(c.id));
    const unselectedList = myHand.filter((c) => !selSet.has(c.id));

    const newHand = [...selectedList, ...unselectedList];
    isLocalReorderRef.current = true;
    onReorder(newHand);
    selectedCards.forEach((id) => onCardClick(id));
  };

  const handleQuitClick = () => {
    if (isConfirmingQuit) { onQuit(); }
    else { setIsConfirmingQuit(true); setTimeout(() => setIsConfirmingQuit(false), 3000); }
  };

  /* ─── boardOnly mode (post-round review) ─── */
  if (boardOnly) {
    return (
      <div className="w-full flex flex-col justify-center items-center py-3 overflow-visible">
        <div
          ref={containerRef}
          className="w-full rounded-xl relative flex flex-col p-2 sm:p-3 shadow-inner justify-center items-center min-h-[200px] overflow-visible"
          style={{ background: 'rgba(0,0,0,0.2)', border: '1.5px solid rgba(255,255,255,0.08)' }}
        >
          {isSpectator ? (
            <div className="w-full flex justify-center z-30">{spectatorContent}</div>
          ) : (
            <div className="flex flex-wrap gap-2 w-full items-center justify-center overflow-visible">
              {myHand.map((card, idx) => (
                <HandCardItem
                  key={card.id}
                  card={card}
                  isSelected={selectedCards.includes(card.id)}
                  isJustDrawn={justDrawnCardId === card.id && hasDrawnThisTurn}
                  isHoverTarget={hoveredSlotIdx === idx && activeDragIdx !== idx}
                  cardIdx={idx}
                  onCardClick={() => onCardClick(card.id)}
                  onDragStart={() => handleDragStart(idx)}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  wildJoker={wildJoker}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── MAIN LANDSCAPE VIEW ─── */
  return (
    <div className="flex-1 flex flex-col min-h-0 z-10 select-none w-full h-full overflow-visible relative" ref={containerRef}>

      {/* ── TOP-LEFT USER PROFILE PILL ── */}
      <div className="absolute left-2.5 top-2.5 z-40 flex flex-col items-start gap-1 pointer-events-auto">
        {/* Profile Button */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsUserMenuOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl shadow-xl backdrop-blur-md cursor-pointer transition-all"
          style={{
            background: 'rgba(10, 26, 10, 0.88)',
            border: '1px solid rgba(245, 166, 35, 0.35)',
          }}
          title="View Profile & Settings"
        >
          {/* Avatar frame */}
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-amber-400 flex items-center justify-center bg-slate-800 font-bold text-white text-xs shrink-0">
            {myAvatarUrl ? (
              <img src={myAvatarUrl} alt={myName} className="w-full h-full object-cover" />
            ) : (
              <span>{myName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Name + Score */}
          <div className="flex flex-col leading-none text-left">
            <span className="text-[10px] font-black text-white truncate max-w-[60px] uppercase">
              {myName}
            </span>
            <span className="text-[9px] font-extrabold text-amber-400 font-score mt-0.5">
              {myTotalScore} pts
            </span>
          </div>
        </motion.button>

        {/* Profile & Settings Centered Modal Popup */}
        <AnimatePresence>
          {isUserMenuOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto"
              onClick={() => { setIsUserMenuOpen(false); setIsConfirmingQuit(false); }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 w-full max-w-xs shadow-2xl relative text-left"
                style={{
                  background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(10,26,10,0.98))',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.85), 0 0 20px rgba(245,166,35,0.15)',
                }}
              >
                {/* Close Button */}
                <button
                  onClick={() => { setIsUserMenuOpen(false); setIsConfirmingQuit(false); }}
                  className="absolute top-3 right-3 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* User Info Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-700 border-2 border-amber-400 flex items-center justify-center font-bold text-white text-lg shrink-0">
                    {myAvatarUrl ? (
                      <img src={myAvatarUrl} alt={myName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{myName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-none">{myName}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <Wifi className="w-3 h-3" /> Online (You)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-black/30 rounded-xl p-2.5 text-center border border-white/5">
                    <div className="text-[9px] text-white/50 font-bold uppercase tracking-wider">Score</div>
                    <div className="text-base font-black text-amber-400 font-score">{myTotalScore} pts</div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-2.5 text-center border border-white/5">
                    <div className="text-[9px] text-white/50 font-bold uppercase tracking-wider">Round</div>
                    <div className="text-sm font-bold text-white mt-0.5">{roundNumber}</div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-2.5 text-center border border-white/5">
                    <div className="text-[9px] text-white/50 font-bold uppercase tracking-wider">Bet</div>
                    <div className="text-sm font-extrabold text-[var(--color-gold)] mt-0.5">₹{betAmount}</div>
                  </div>
                </div>

                {/* Sound & Actions */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={onToggleSound}
                    className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      soundOn
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                    }`}
                  >
                    {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>Sound {soundOn ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* Voice Content Slot */}
                {voiceContent && <div className="mb-3">{voiceContent}</div>}

                {/* Quit Room Section */}
                <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                  <button
                    onClick={handleQuitClick}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isConfirmingQuit
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                        : 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isConfirmingQuit ? 'Confirm Quit Room?' : 'Quit Room'}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── TOP / CENTER TABLE FELT: Turn Banner + Decks Cluster ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative px-4 pt-1 pb-1">

        {/* Turn Status Banner */}
        <motion.div
          animate={{
            background: isMyTurn ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.4)',
            borderColor: isMyTurn ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)',
          }}
          className="px-4 py-1 rounded-full border backdrop-blur-md shadow-md mb-2 shrink-0 z-10"
        >
          <span className={`text-[12px] sm:text-[13px] font-black tracking-wide ${isMyTurn ? 'text-emerald-400' : 'text-white/60'}`}>
            {isMyTurn
              ? hasDrawnThisTurn
                ? "✦ Select card to Discard or Drag to Open Deck / Finish Slot"
                : "✦ Your Turn — Tap Closed Deck or Discard to Draw!"
              : `${currentTurnPlayerName}'s Turn`}
          </span>
        </motion.div>

        {/* ── DECKS + JOKER + FINISH SLOT (Exact RummyCircle Alignment) ── */}
        <div className="flex items-center justify-center gap-5 sm:gap-7 z-10">

          {/* 1. CLOSED DECK + UNDERNEATH WILD JOKER (Unified Cluster) */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              className="relative flex items-center justify-center select-none"
              style={{ minWidth: 105, height: 'clamp(74px, 16.5vh, 98px)' }}
            >
              {/* Wild Joker Card sliding out to the left */}
              {wildJoker && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 z-0 cursor-default"
                  style={{ transform: 'translateX(-52%) translateY(0)' }}
                >
                  <div className="relative flex items-center">
                    {/* Vertical JOKER text on left exposed strip */}
                    <div className="absolute -left-3.5 top-0 bottom-0 flex flex-col items-center justify-center text-[7px] font-black text-emerald-400 uppercase tracking-tighter select-none pointer-events-none drop-shadow">
                      <span>J</span><span>O</span><span>K</span><span>E</span><span>R</span>
                    </div>
                    <PlayingCard card={wildJoker.card} size="md" isWildJoker={false} />
                  </div>
                </div>
              )}

              {/* Face-down Closed Deck Stack */}
              <motion.div
                onClick={canDraw ? onDrawCard : undefined}
                whileHover={canDraw ? { scale: 1.05, y: -2 } : {}}
                whileTap={canDraw ? { scale: 0.94 } : {}}
                animate={canDraw ? {
                  boxShadow: [
                    '0 0 0px 0px rgba(16,185,129,0.2)',
                    '0 0 20px 6px rgba(16,185,129,0.55)',
                    '0 0 0px 0px rgba(16,185,129,0.2)',
                  ]
                } : {}}
                transition={canDraw ? { boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" } } : {}}
                className={`relative z-10 rounded-[6px] ${canDraw ? 'cursor-pointer ring-2 ring-emerald-400' : 'opacity-90'
                  }`}
                style={{ transform: 'translateX(18%)' }}
              >
                <PlayingCard
                  card={{ id: "draw-top", suit: Suit.JOKER, rank: Rank.ACE } as Card}
                  faceDown
                  size="md"
                />
                {/* 3D Stack depth */}
                <div className="absolute inset-0 -z-10 rounded-[6px] bg-amber-950/80 translate-x-[2px] translate-y-[2px]" />
                <div className="absolute inset-0 -z-20 rounded-[6px] bg-black/60 translate-x-[4px] translate-y-[4px]" />
              </motion.div>
            </div>
            <span className="deck-label">CLOSED DECK</span>
          </div>

          {/* 2. OPEN DECK (Discard Pile) */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              ref={discardZoneRef}
              data-discard-zone
              onClick={canDraw && topCard ? onPickDiscard : undefined}
              className={`relative select-none transition-all duration-200 rounded-[6px] ${discardHover
                  ? 'ring-4 ring-amber-400 shadow-[0_0_24px_8px_rgba(245,166,35,0.65)] scale-108'
                  : canDraw && topCard
                    ? 'ring-2 ring-emerald-400 cursor-pointer shadow-[0_0_14px_rgba(16,185,129,0.45)] hover:scale-104'
                    : ''
                }`}
            >
              {topCard ? (
                <div className="relative">
                  {discardPile.slice(-2).map((card, idx, arr) => {
                    const isTop = idx === arr.length - 1;
                    const isCardWild = wildJoker ? isWildJoker(card, wildJoker.wildRank) : false;
                    return (
                      <PlayingCard
                        key={card.id}
                        card={card}
                        size="md"
                        isWildJoker={isCardWild}
                        className={isTop ? 'relative z-10' : 'absolute inset-0 opacity-40 -translate-x-1 -translate-y-0.5 pointer-events-none'}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="w-[clamp(56px,8.2vw,74px)] h-[clamp(80px,12vw,108px)] landscape:w-[clamp(50px,11.5vh,68px)] landscape:h-[clamp(74px,16.5vh,98px)] rounded-[6px] border-2 border-dashed border-white/20 flex items-center justify-center">
                  <span className="text-[8px] text-white/30 font-bold uppercase tracking-wider">Empty</span>
                </div>
              )}
            </div>
            <span className="deck-label">OPEN DECK</span>
          </div>

          {/* Elegant Divider between Discard Pile and Declare / Finish Slot */}
          <div className="hidden sm:block h-12 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent shrink-0 mx-1 md:mx-3" />

          {/* 3. FINISH SLOT / DECLARE SLOT (Positioned clearly to the right) */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 ml-3 sm:ml-5 md:ml-8">
            <motion.div
              ref={finishZoneRef}
              data-finish-zone
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                if (!canDiscard || selectedCards.length !== 1) return;
                const card = myHand.find((c) => c.id === selectedCards[0]);
                if (card) onDeclareShow(card);
              }}
              className={`finish-slot w-[clamp(56px,8.2vw,74px)] h-[clamp(80px,12vw,108px)] landscape:w-[clamp(50px,11.5vh,68px)] landscape:h-[clamp(74px,16.5vh,98px)] flex flex-col items-center justify-center gap-1 cursor-pointer select-none transition-all duration-200 ${finishHover
                  ? 'ring-4 ring-amber-400 bg-amber-500/25 shadow-[0_0_24px_8px_rgba(245,166,35,0.7)] scale-108'
                  : canDiscard && selectedCards.length === 1
                    ? 'active ring-2 ring-amber-400 animate-pulse'
                    : ''
                }`}
            >
              <Trophy className="w-5 h-5 text-[var(--color-gold)]" />
              <span className="text-[8px] font-black text-[var(--color-gold)] uppercase tracking-wider text-center leading-tight">
                FINISH<br />SLOT
              </span>
            </motion.div>
            <span className="deck-label">DECLARE</span>
          </div>

        </div>

        {/* Subtle Felt Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.06] z-0">
          <span className="text-6xl sm:text-7xl font-black uppercase tracking-widest text-white">
            RUMMY
          </span>
        </div>
      </div>

      {/* ── ACTION CONTROLS BAR (Floating above Hand) ── */}
      <div className="shrink-0 flex items-center justify-center gap-2 px-3 py-1 z-30 pointer-events-auto">
        {/* GROUP Button (active when 2+ cards selected) */}
        {selectedCards.length >= 2 && !isSpectator && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={handleGroupSelected}
            className="px-3 py-1 rounded-lg text-xs font-black text-black flex items-center gap-1 shadow-lg cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #F5A623, #FBBF24)',
              boxShadow: '0 2px 10px rgba(245,166,35,0.4)',
            }}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>GROUP ({selectedCards.length})</span>
          </motion.button>
        )}

        {/* SORT Button */}
        {onResortHand && !isSpectator && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onResortHand}
            title="Sort cards into melds"
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white/90 bg-white/10 hover:bg-white/20 border border-white/15 flex items-center gap-1 shadow cursor-pointer transition-all"
          >
            <RefreshCw className="w-3 h-3 text-amber-400" />
            <span>SORT</span>
          </motion.button>
        )}

        {/* Discard & Declare action buttons */}
        {isMyTurn && hasDrawnThisTurn && selectedCards.length === 1 && (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const card = myHand.find((c) => c.id === selectedCards[0]);
                if (card) onDiscard(card);
              }}
              className="px-3.5 py-1 rounded-lg text-[11px] font-black text-black shadow-lg cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #F5A623, #d4901a)',
                boxShadow: '0 2px 10px rgba(245,166,35,0.4)',
              }}
            >
              DISCARD
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const card = myHand.find((c) => c.id === selectedCards[0]);
                if (card) onDeclareShow(card);
              }}
              className="px-3.5 py-1 rounded-lg text-[11px] font-black text-white shadow-lg cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #059669, #10b981)',
                boxShadow: '0 2px 10px rgba(16,185,129,0.4)',
              }}
            >
              DECLARE
            </motion.button>
          </>
        )}

        {/* First / Second Drop buttons */}
        {showFirstDrop && (
          <button
            onClick={onDropFirst}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 shadow transition-all"
          >
            Drop (20)
          </button>
        )}
        {showSecondDrop && (
          <button
            onClick={onDropSecond}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 shadow transition-all"
          >
            Drop (40)
          </button>
        )}
      </div>

      {/* ── PLAYER HAND: Cards dynamically spreading across the entire bottom row ── */}
      <div
        className="shrink-0 z-30 transition-colors duration-300 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 w-full overflow-visible relative"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 25%, rgba(0,0,0,0.85) 100%)',
          borderTop: isMyTurn ? '1.5px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: isMyTurn ? '0 -6px 24px rgba(16,185,129,0.15)' : 'none',
        }}
      >
        {isSpectator ? (
          <div className="w-full flex justify-center py-2">{spectatorContent}</div>
        ) : (
          <div
            ref={handContainerRef}
            className="flex items-end justify-center scrollbar-none overflow-visible pb-1 pt-4 min-h-[calc(var(--hand-card-h)+20px)] w-full relative pr-14 sm:pr-16"
          >
            {myHand.map((card, idx) => {
              const sel = selectedCards.includes(card.id);
              const isJustDrawn = justDrawnCardId === card.id && hasDrawnThisTurn;

              return (
                <HandCardItem
                  key={card.id}
                  card={card}
                  isSelected={sel}
                  isJustDrawn={isJustDrawn}
                  isHoverTarget={hoveredSlotIdx === idx && activeDragIdx !== idx}
                  cardIdx={idx}
                  dynamicMarginLeft={dynamicMarginLeft}
                  onCardClick={() => {
                    if (selectedCards.length === 1 && selectedCards[0] !== card.id) {
                      const srcIdx = myHand.findIndex((c) => c.id === selectedCards[0]);
                      if (srcIdx !== -1) {
                        const nh = [...myHand];
                        const a = nh[srcIdx];
                        const b = nh[idx];
                        if (a && b) {
                          nh[srcIdx] = b;
                          nh[idx] = a;
                          isLocalReorderRef.current = true;
                          onReorder(nh);
                        }
                      }
                      onCardClick(selectedCards[0]!);
                      return;
                    }
                    onCardClick(card.id);
                  }}
                  onDragStart={() => handleDragStart(idx)}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  wildJoker={wildJoker}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
