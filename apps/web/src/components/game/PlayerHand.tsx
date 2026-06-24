import { useCallback } from "react";
import { motion, Reorder, PanInfo } from "framer-motion";
import { Suit } from "@rummy/shared";
import type { Card } from "@rummy/shared";
import { cardSuitColor, cardSuitSymbol, cardRankName } from "./card-utils";

interface PlayerHandProps {
  myHand: Card[];
  selectedCards: string[];
  isMyTurn: boolean;
  hasDrawnThisTurn: boolean;
  isSpectator: boolean;
  roundStatus: string | undefined;
  turnOrderIndex: number;
  playerCount: number;
  myTotalScore: number;

  onReorder: (newHand: Card[]) => void;
  onCardClick: (cardId: string) => void;
  onDiscard: (card: Card) => void;
  onDeclareShow: (card: Card) => void;
  onDropFirst: () => void;
  onDropSecond: () => void;
  discardDropRef: React.RefObject<HTMLDivElement | null>;
  onDiscardDragStateChange: (active: boolean) => void;

  // Redesign props
  myName: string;
  myAvatarUrl?: string | null;
  onDrawCard: () => void;
}

// Vector Jester illustration for hand Joker cards
const JesterSvg = () => (
  <svg viewBox="0 0 60 80" className="w-[80%] h-[80%] max-h-[50px] self-center my-auto drop-shadow-sm select-none pointer-events-none">
    <path d="M 30 30 Q 15 15 10 25 Q 12 35 30 35" fill="#EF4444" />
    <circle cx="10" cy="25" r="2.5" fill="#F5A623" />
    <path d="M 30 30 Q 45 15 50 25 Q 48 35 30 35" fill="#3B82F6" />
    <circle cx="50" cy="25" r="2.5" fill="#F5A623" />
    <path d="M 30 30 Q 30 5 30 10 Q 30 35 30 35" fill="#10B981" />
    <circle cx="30" cy="10" r="2.5" fill="#F5A623" />
    <path d="M 20 32 C 20 15, 40 15, 40 32" fill="#10B981" />
    <circle cx="30" cy="42" r="10" fill="#FDE047" stroke="#8A4C32" strokeWidth="0.8" />
    <circle cx="23" cy="44" r="1.5" fill="#EF4444" opacity="0.5" />
    <circle cx="37" cy="44" r="1.5" fill="#EF4444" opacity="0.5" />
    <circle cx="26" cy="40" r="1.2" fill="#000" />
    <circle cx="34" cy="40" r="1.2" fill="#000" />
    <path d="M 26 46 Q 30 50 34 46" fill="none" stroke="#000" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M 18 50 L 30 56 L 42 50 L 37 53 L 30 51 L 23 53 Z" fill="#EF4444" stroke="#F5A623" strokeWidth="0.4" />
  </svg>
);

export default function PlayerHand({
  myHand,
  selectedCards,
  isMyTurn,
  hasDrawnThisTurn,
  isSpectator,
  roundStatus,
  turnOrderIndex,
  playerCount,
  myTotalScore,
  onReorder,
  onCardClick,
  onDiscard,
  onDeclareShow,
  onDropFirst,
  onDropSecond,
  discardDropRef,
  onDiscardDragStateChange,
  myName,
  myAvatarUrl,
  onDrawCard,
}: PlayerHandProps) {
  const canDrop = isMyTurn && !hasDrawnThisTurn;
  const canDiscard = isMyTurn && hasDrawnThisTurn;
  const showFirstDrop = canDrop && turnOrderIndex < playerCount && (myTotalScore + 20) < 250;
  const showSecondDrop = canDrop && turnOrderIndex >= playerCount && (myTotalScore + 40) < 250;

  const handleDiscardDrag = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!canDiscard || !discardDropRef.current) return;

      const discardRect = discardDropRef.current.getBoundingClientRect();
      const dragPoint = {
        x: info.point.x,
        y: info.point.y,
      };

      const isOverDiscard =
        dragPoint.x >= discardRect.left - 20 &&
        dragPoint.x <= discardRect.right + 20 &&
        dragPoint.y >= discardRect.top - 20 &&
        dragPoint.y <= discardRect.bottom + 20;

      onDiscardDragStateChange(isOverDiscard);
    },
    [canDiscard, discardDropRef, onDiscardDragStateChange]
  );

  const handleDiscardDragEnd = useCallback(
    (card: Card, _event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      onDiscardDragStateChange(false);

      if (!canDiscard || !discardDropRef.current) return;

      const discardRect = discardDropRef.current.getBoundingClientRect();
      const dragPoint = {
        x: info.point.x,
        y: info.point.y,
      };

      const isOverDiscard =
        dragPoint.x >= discardRect.left &&
        dragPoint.x <= discardRect.right &&
        dragPoint.y >= discardRect.top &&
        dragPoint.y <= discardRect.bottom;

      if (isOverDiscard) {
        if (navigator.vibrate) navigator.vibrate(30);
        onDiscard(card);
      }
    },
    [canDiscard, discardDropRef, onDiscard, onDiscardDragStateChange]
  );

  return (
    <div
      className={`w-full bg-[#0D1B2A]/95 border-t py-2 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] flex flex-col z-30 transition-colors duration-300 ${isMyTurn
          ? "border-[var(--color-gold)]/50 shadow-[0_-6px_16px_rgba(245,166,35,0.12)]"
          : "border-white/10"
        } overflow-visible shrink-0 select-none`}
    >
      <div className="w-full flex items-center justify-between gap-3 max-w-5xl mx-auto relative overflow-visible">
        {/* Left: Player Profile Pill */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="bg-gradient-to-b from-[#a65e3e] to-[#864627] border-2 border-[#E19E3A]/45 px-2.5 py-1.5 rounded-2xl flex flex-col items-center gap-1.5 min-w-[76px] shadow-md relative">
            {/* Smiling face badge overlay */}
            <div className="absolute -top-2.5 -left-1 w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-[12px] shadow-sm select-none">
              😊
            </div>
            {/* Avatar frame */}
            <div className="w-9 h-9 rounded-full border-2 border-[#E19E3A] overflow-hidden bg-slate-700 flex items-center justify-center font-bold text-white text-sm">
              {myAvatarUrl ? (
                <img src={myAvatarUrl} alt={myName} className="w-full h-full object-cover" />
              ) : (
                <span>{myName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {/* Name */}
            <span className="text-[12px] font-black text-white truncate max-w-[68px] text-center leading-none uppercase tracking-wide">
              {myName}
            </span>
          </div>
        </div>

        {/* Center: Cards Hand */}
        <div className="flex-1 min-w-0 overflow-visible py-3">
          <Reorder.Group
            axis="x"
            values={myHand}
            onReorder={onReorder}
            as="div"
            data-hand-container="true"
            className="flex bg-black/25 px-2.5 py-2 rounded-2xl border border-white/5 gap-0 overflow-x-auto min-h-[106px] items-end justify-start md:justify-center w-full relative overflow-y-visible scrollbar-none"
          >
            {myHand.map((card, cardIdx) => {
              const isSelected = selectedCards.includes(card.id);
              const globalCardIndex = cardIdx;
              const suitColor = cardSuitColor(card.suit);
              const symbol = cardSuitSymbol(card.suit);
              const rank = cardRankName(card.rank);
              const isCardJoker = card.suit === Suit.JOKER;

              return (
                <Reorder.Item
                  key={card.id}
                  value={card}
                  as="div"
                  id={`card-hand-${card.id}`}
                  data-card-idx={cardIdx}
                  dragListener={!isSpectator}
                  style={{ zIndex: cardIdx }}
                  initial={
                    roundStatus === "dealing"
                      ? { opacity: 0, scale: 0.6, x: 0, y: -150 }
                      : false
                  }
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: isSelected ? -10 : 0,
                    boxShadow: isSelected
                      ? "0 0 12px 4px rgba(245, 166, 35, 0.45)"
                      : "0 2px 4px rgba(0, 0, 0, 0.15)",
                  }}
                  whileHover={{
                    y: isSelected ? -14 : -5,
                    scale: 1.01,
                    zIndex: 50,
                  }}
                  whileTap={{ scale: 0.96 }}
                  transition={{
                    y: { type: "tween", duration: 0.12, ease: "easeOut" },
                    boxShadow: { type: "tween", duration: 0.12, ease: "easeOut" },
                    default: {
                      type: "spring",
                      stiffness: 380,
                      damping: 28,
                      delay: roundStatus === "dealing" ? globalCardIndex * 0.04 : 0,
                    },
                  }}
                  className={`w-[clamp(66px,16vw,80px)] h-[clamp(98px,23.8vw,120px)] rounded-md bg-white border text-black cursor-pointer shrink-0 relative overflow-hidden hand-card ${isSelected
                      ? "ring-2 ring-[var(--color-gold)] border-[var(--color-gold)]"
                      : "border-gray-200"
                    }`}
                >
                  <motion.div
                    className="w-full h-full flex flex-col justify-between p-[clamp(4px,1vw,5px)] relative"
                    onTap={() => onCardClick(card.id)}
                    drag={canDiscard ? "y" : false}
                    dragConstraints={{ top: -200, bottom: 0 }}
                    dragElastic={0.4}
                    dragSnapToOrigin
                    onDrag={canDiscard ? handleDiscardDrag : undefined}
                    onDragEnd={
                      canDiscard
                        ? (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) =>
                          handleDiscardDragEnd(card, event, info)
                        : undefined
                    }
                  >
                    {isCardJoker ? (
                      <div className="w-full h-full flex flex-col justify-between select-none relative">
                        {/* JOKER vertical stack */}
                        <div className="flex flex-col items-center leading-none text-[8px] font-black text-amber-500 uppercase tracking-tighter self-start">
                          <span>J</span>
                          <span>O</span>
                          <span>K</span>
                          <span>E</span>
                          <span>R</span>
                        </div>
                        <JesterSvg />
                        <div className="flex flex-col items-center leading-none text-[8px] font-black text-amber-500 uppercase tracking-tighter scale-y-[-1] scale-x-[-1] self-end">
                          <span>J</span>
                          <span>O</span>
                          <span>K</span>
                          <span>E</span>
                          <span>R</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Standard stacked corner */}
                        <div className="flex flex-col items-start leading-none self-start">
                          <span className={`text-[clamp(26px,7vw,30px)] font-black leading-none ${suitColor} tracking-tighter`}>
                            {rank}
                          </span>
                          <span className={`text-[clamp(26px,7vw,30px)] font-bold leading-none ${suitColor} mt-0.5`}>
                            {symbol}
                          </span>
                        </div>

                        {/* Huge bottom-right suit symbol */}
                        <div className={`absolute right-[clamp(2px,0.5vw,6px)] bottom-[clamp(2px,0.5vw,6px)] font-bold leading-none select-none ${suitColor} text-[clamp(36px,9.5vw,42px)]`}>
                          {symbol}
                        </div>
                      </>
                    )}


                  </motion.div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>

        {/* Right: Actions Panel */}
        <div className="shrink-0 flex items-center justify-center min-w-[90px]">
          {isMyTurn ? (
            <div className="flex flex-col gap-1.5 w-full">
              {!hasDrawnThisTurn ? (
                <button
                  onClick={onDrawCard}
                  className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-[#10b981] text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all min-h-[44px]"
                >
                  Get
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (selectedCards.length !== 1) return;
                      const card = myHand.find((c) => c.id === selectedCards[0]);
                      if (card) onDiscard(card);
                    }}
                    disabled={selectedCards.length !== 1}
                    className="w-full px-3 py-2 rounded-lg text-[11px] font-black bg-[var(--color-gold)] text-black disabled:opacity-40 flex items-center justify-center shadow-sm hover:brightness-115 transition-all min-h-[34px]"
                  >
                    Discard
                  </button>
                  <button
                    onClick={() => {
                      if (selectedCards.length !== 1) return;
                      const card = myHand.find((c) => c.id === selectedCards[0]);
                      if (card) onDeclareShow(card);
                    }}
                    disabled={selectedCards.length !== 1}
                    className="w-full px-3 py-2 rounded-lg text-[11px] font-black bg-emerald-600 text-white disabled:opacity-40 flex items-center justify-center shadow-sm hover:brightness-115 transition-all min-h-[34px]"
                  >
                    Declare
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center">
              {/* Disabled/waiting mode button */}
              <button
                disabled
                className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white/30 flex items-center justify-center min-h-[44px]"
              >
                Get
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drop overlay triggers (First/Second drop actions before draw) */}
      {canDrop && (showFirstDrop || showSecondDrop) && (
        <div className="w-full flex justify-center gap-4 mt-2 max-w-md mx-auto">
          {showFirstDrop && (
            <button
              onClick={onDropFirst}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-all"
            >
              First Drop (20)
            </button>
          )}
          {showSecondDrop && (
            <button
              onClick={onDropSecond}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-all"
            >
              Second Drop (40)
            </button>
          )}
        </div>
      )}

      {/* Helper text footer */}
      <div className="text-center mt-1">
        {canDiscard && (
          <span className="text-[10px] text-[var(--color-gold)]/70 font-semibold mr-1">
            Drag card up to discard •
          </span>
        )}
        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
          {myHand.length} Cards in Hand
        </span>
      </div>
    </div>
  );
}
