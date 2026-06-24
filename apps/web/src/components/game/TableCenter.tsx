import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Suit, Rank, isWildJoker } from "@rummy/shared";
import type { Card, WildJokerInfo } from "@rummy/shared";
import { Settings, LogOut, Volume2, Smartphone, RefreshCw } from "lucide-react";
import PlayingCard, { JesterIllustration } from "./PlayingCard";
import { cardSuitColor, cardSuitSymbol, cardRankName } from "./card-utils";

interface TableCenterProps {
  discardPile: Card[];
  isMyTurn: boolean;
  hasDrawnThisTurn: boolean;
  currentTurnPlayerName: string;
  onDrawCard: () => void;
  onPickDiscard: () => void;

  // Card grouping and selection
  selectedCards: string[];
  onCardClick: (cardId: string) => void;
  wildJoker: WildJokerInfo | null;
  onResortHand?: () => void;

  // Sidebar / Navbar options
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

  // Hand & Action props
  myHand: Card[]; // ungrouped cards
  showFirstDrop: boolean;
  showSecondDrop: boolean;
  onDropFirst: () => void;
  onDropSecond: () => void;
  onDeclareShow: (card: Card) => void;
  onDiscard: (card: Card) => void;
  onReorder: (newHand: Card[]) => void;

  // Spectator props
  isSpectator?: boolean;
  spectatorContent?: React.ReactNode;
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
  vibrationOn,
  onToggleSound,
  onToggleVibration,
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
}: TableCenterProps) {
  const canDraw = isMyTurn && !hasDrawnThisTurn;
  const canDiscard = isMyTurn && hasDrawnThisTurn;
  const canDrop = isMyTurn && !hasDrawnThisTurn;
  const topCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

  const [isConfirmingQuit, setIsConfirmingQuit] = useState(false);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [activeDragIdx, setActiveDragIdx] = useState<number | null>(null);
  const [hoveredSlotIdx, setHoveredSlotIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const slotCenters = useRef<{ x: number; y: number; idx: number; rowIdx: number }[]>([]);
  const lastHandRef = useRef<Card[]>([]);
  const [rowSizes, setRowSizes] = useState<{ id: string; size: number }[]>([]);
  const isLocalReorderRef = useRef(false);

  useEffect(() => {
    const prevHand = lastHandRef.current;
    lastHandRef.current = myHand;

    if (myHand.length === 0) {
      setRowSizes([]);
      return;
    }

    // Avoid spurious resets if the hand order and contents are identical (e.g. from parent re-renders)
    const isSameHand =
      prevHand.length === myHand.length &&
      myHand.every((card, i) => card.id === prevHand[i]?.id);

    if (isSameHand) {
      return;
    }

    if (isLocalReorderRef.current) {
      isLocalReorderRef.current = false;
      return;
    }

    // Complete reset, external sort, or major change
    if (prevHand.length === 0 || myHand.length === prevHand.length || Math.abs(myHand.length - prevHand.length) > 1) {
      const defaultSizes: { id: string; size: number }[] = [];
      let rem = myHand.length;
      while (rem > 0) {
        const size = rem >= 4 ? 4 : rem;
        defaultSizes.push({
          id: `group-${Math.random().toString(36).substring(2, 11)}`,
          size
        });
        rem -= size;
      }
      setRowSizes(defaultSizes);
      return;
    }

    if (myHand.length === prevHand.length + 1) {
      const newSizes = [...rowSizes];
      if (newSizes.length === 0) {
        newSizes.push({ id: `group-${Math.random().toString(36).substring(2, 11)}`, size: 1 });
      } else {
        const lastIdx = newSizes.length - 1;
        const currentGroup = newSizes[lastIdx];
        if (currentGroup && currentGroup.size < 5) {
          newSizes[lastIdx] = { ...currentGroup, size: currentGroup.size + 1 };
        } else {
          newSizes.push({ id: `group-${Math.random().toString(36).substring(2, 11)}`, size: 1 });
        }
      }
      setRowSizes(newSizes);
      return;
    }

    if (myHand.length === prevHand.length - 1) {
      const removedIdx = prevHand.findIndex((c) => !myHand.some((nc) => nc.id === c.id));
      if (removedIdx !== -1) {
        let accum = 0;
        let targetRowIdx = -1;
        for (let i = 0; i < rowSizes.length; i++) {
          const group = rowSizes[i];
          if (!group) continue;
          accum += group.size;
          if (removedIdx < accum) {
            targetRowIdx = i;
            break;
          }
        }
        if (targetRowIdx !== -1) {
          const newSizes = [...rowSizes];
          const currentGroup = newSizes[targetRowIdx];
          if (currentGroup) {
            const newSize = currentGroup.size - 1;
            if (newSize === 0) {
              newSizes.splice(targetRowIdx, 1);
            } else {
              newSizes[targetRowIdx] = { ...currentGroup, size: newSize };
            }
            setRowSizes(newSizes);
            return;
          }
        }
      }

      const newSizes = [...rowSizes];
      if (newSizes.length > 0) {
        const lastIdx = newSizes.length - 1;
        const currentGroup = newSizes[lastIdx];
        if (currentGroup) {
          const newSize = currentGroup.size - 1;
          if (newSize === 0) {
            newSizes.pop();
          } else {
            newSizes[lastIdx] = { ...currentGroup, size: newSize };
          }
        }
      }
      setRowSizes(newSizes);
    }
  }, [myHand, rowSizes]);

  const handleQuitClick = () => {
    if (isConfirmingQuit) {
      onQuit();
    } else {
      setIsConfirmingQuit(true);
      setTimeout(() => setIsConfirmingQuit(false), 3000);
    }
  };

  const handleDragStartInternal = (idx: number) => {
    setActiveDragIdx(idx);
    if (containerRef.current) {
      const cardEls = containerRef.current.querySelectorAll("[data-card-idx]");
      slotCenters.current = Array.from(cardEls).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          idx: parseInt(el.getAttribute("data-card-idx") || "0"),
          rowIdx: parseInt(el.getAttribute("data-row-idx") || "0"),
        };
      });
    }
  };

  const handleDragInternal = (_event: any, info: any) => {
    if (activeDragIdx === null) return;

    // Compare viewport/client coordinates directly with getBoundingClientRect positions
    const x = info.point.x;
    const y = info.point.y;

    let closestSlot: { x: number; y: number; idx: number; rowIdx: number } | null = null;
    let minDistance = Infinity;

    slotCenters.current.forEach((slot) => {
      const dist = Math.hypot(x - slot.x, y - slot.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestSlot = slot;
      }
    });

    if (closestSlot) {
      setHoveredSlotIdx((closestSlot as any).idx);
    }
  };

  const handleDragEndInternal = () => {
    if (activeDragIdx !== null && hoveredSlotIdx !== null && hoveredSlotIdx !== activeDragIdx) {
      // 1. Build the 2D rows from current state
      const cardRows: { id: string; cards: Card[] }[] = [];
      let startIdx = 0;
      rowSizes.forEach((group) => {
        cardRows.push({
          id: group.id,
          cards: myHand.slice(startIdx, startIdx + group.size)
        });
        startIdx += group.size;
      });

      // 2. Find source row and col idx
      let sourceRowIdx = -1;
      let sourceColIdx = -1;
      let accum = 0;
      for (let r = 0; r < cardRows.length; r++) {
        const row = cardRows[r];
        if (!row) continue;
        if (activeDragIdx >= accum && activeDragIdx < accum + row.cards.length) {
          sourceRowIdx = r;
          sourceColIdx = activeDragIdx - accum;
          break;
        }
        accum += row.cards.length;
      }

      if (sourceRowIdx !== -1) {
        const newRows = cardRows.map(row => ({ id: row.id, cards: [...row.cards] }));
        const sourceRow = newRows[sourceRowIdx];
        if (sourceRow) {
          const draggedCard = sourceRow.cards[sourceColIdx];

          if (draggedCard) {
            // Remove from source row
            sourceRow.cards.splice(sourceColIdx, 1);

            // Case A: Dropping to a new group
            if (hoveredSlotIdx === myHand.length) {
              newRows.push({
                id: `group-${Math.random().toString(36).substring(2, 11)}`,
                cards: [draggedCard]
              });
            }
            // Case B: Dropping onto an existing card
            else {
              // Find target row and col idx
              let targetRowIdx = -1;
              let targetColIdx = -1;
              accum = 0;
              for (let r = 0; r < cardRows.length; r++) {
                const row = cardRows[r];
                if (!row) continue;
                if (hoveredSlotIdx >= accum && hoveredSlotIdx < accum + row.cards.length) {
                  targetRowIdx = r;
                  targetColIdx = hoveredSlotIdx - accum;
                  break;
                }
                accum += row.cards.length;
              }

              if (targetRowIdx !== -1) {
                const targetRow = newRows[targetRowIdx];
                if (targetRow) {
                  if (sourceRowIdx === targetRowIdx) {
                    // Same row reordering: use the original row, remove and insert to prevent shift bugs
                    const row = cardRows[sourceRowIdx];
                    if (row) {
                      const sameRowCards = [...row.cards];
                      const [removed] = sameRowCards.splice(sourceColIdx, 1);
                      if (removed) {
                        sameRowCards.splice(targetColIdx, 0, removed);
                        sourceRow.cards = sameRowCards;
                      }
                    }
                  } else {
                    // Different row
                    if (targetRow.cards.length >= 5) {
                      // Target row is full: displace its last card to the end of the source row
                      const displacedCard = targetRow.cards.pop();
                      if (displacedCard) {
                        sourceRow.cards.push(displacedCard);
                      }
                    }
                    targetRow.cards.splice(targetColIdx, 0, draggedCard);
                  }
                }
              }
            }

            // Clean up empty rows
            const cleanedRows = newRows.filter(row => row && row.cards.length > 0);
            const newHand = cleanedRows.map(row => row.cards).flat();
            const newSizes = cleanedRows.map(row => ({ id: row.id, size: row.cards.length }));

            isLocalReorderRef.current = true;
            setTimeout(() => {
              onReorder(newHand);
              setRowSizes(newSizes);
            }, 0);
          }
        }
      }
    }

    setActiveDragIdx(null);
    setHoveredSlotIdx(null);
    slotCenters.current = [];
  };

  const handleCardClickInternal = (cardId: string, cardIdx: number) => {
    if (selectedCards.length === 1) {
      const selectedId = selectedCards[0];
      if (selectedId === cardId) {
        // Deselect
        onCardClick(cardId);
      } else if (selectedId) {
        // Swap their positions!
        const sourceIdx = myHand.findIndex((c) => c.id === selectedId);
        const targetIdx = cardIdx;
        if (sourceIdx !== -1 && targetIdx !== -1) {
          const newHand = [...myHand];
          const temp = newHand[sourceIdx];
          const targetCard = newHand[targetIdx];
          if (temp && targetCard) {
            newHand[sourceIdx] = targetCard;
            newHand[targetIdx] = temp;
            isLocalReorderRef.current = true;
            onReorder(newHand);
          }
        }
        // Clear selection
        onCardClick(selectedId);
      }
    } else {
      // Select
      onCardClick(cardId);
    }
  };

  const cardRows: { id: string; cards: Card[] }[] = [];
  let startIdx = 0;
  rowSizes.forEach((group) => {
    cardRows.push({
      id: group.id,
      cards: myHand.slice(startIdx, startIdx + group.size)
    });
    startIdx += group.size;
  });
  if (cardRows.length === 0 && myHand.length > 0) {
    for (let i = 0; i < myHand.length; i += 4) {
      cardRows.push({
        id: `group-fallback-${i}`,
        cards: myHand.slice(i, i + 4)
      });
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-3 px-3 sm:py-4 sm:px-4 md:py-6 md:px-6 lg:py-8 lg:px-8 z-10 select-none w-full max-w-5xl mx-auto">
      {/* Turn indicator banner */}
      <motion.div
        animate={{
          backgroundColor: isMyTurn
            ? "rgba(245, 166, 35, 0.15)"
            : "rgba(255, 255, 255, 0.05)",
          borderColor: isMyTurn
            ? "rgba(245, 166, 35, 0.3)"
            : "rgba(255, 255, 255, 0.1)",
        }}
        className="px-5 py-1.5 rounded-full border mb-4 backdrop-blur-sm shadow-sm"
      >
        <span
          className={`text-[15px] sm:text-[17px] font-black ${isMyTurn ? "text-[var(--color-gold)]" : "text-white/60"
            }`}
        >
          {isMyTurn
            ? hasDrawnThisTurn
              ? "Select a card to discard"
              : "Your Turn — Draw a card!"
            : `${currentTurnPlayerName}'s Turn`}
        </span>
      </motion.div>

      {/* Main Grid: Cards layout (Left) & Sidebar Controls (Right) */}
      <div className="w-full flex flex-row gap-2.5 sm:gap-4 md:gap-6 lg:gap-8 items-stretch justify-center">

        {/* Left Section: Center Cards Board */}
        <div className="flex-1 flex flex-col justify-center items-center">
          <div ref={containerRef} className="w-full h-full rounded-2xl bg-[#2D5265]/40 border-2 border-[#C67035]/80 relative flex flex-col p-2 sm:p-4 shadow-inner backdrop-blur-sm justify-center items-center min-h-[320px] sm:min-h-[460px]">
            {isSpectator ? (
              <div className="w-full flex justify-center z-30 animate-fade-in">
                {spectatorContent}
              </div>
            ) : (
              <div className="flex flex-col gap-y-[clamp(8px,2vh,14px)] w-full items-center overflow-visible">
                {cardRows.map((row, rowIdx) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-center w-full max-w-[clamp(340px,80vw,420px)] overflow-visible"
                  >
                    {row.cards.map((card, cardIdxInRow) => {
                      const cardIdx = myHand.findIndex((c) => c.id === card.id);
                      if (cardIdx === -1) return null;

                      const isSelected = selectedCards.includes(card.id);
                      const suitColor = cardSuitColor(card.suit);
                      const symbol = cardSuitSymbol(card.suit);
                      const rank = cardRankName(card.rank);
                      const isCardJoker = card.suit === Suit.JOKER;

                      return (
                        <motion.div
                          key={card.id}
                          layoutId={card.id}
                          drag={!isSpectator}
                          dragConstraints={containerRef}
                          dragElastic={0.15}
                          dragMomentum={false}
                          dragSnapToOrigin
                          onDragStart={() => handleDragStartInternal(cardIdx)}
                          onDrag={(e, info) => handleDragInternal(e, info)}
                          onDragEnd={handleDragEndInternal}
                          data-card-idx={cardIdx}
                          data-row-idx={rowIdx}
                          animate={{
                            x: 0,
                            y: isSelected ? -10 : 0,
                            scale: activeDragIdx === cardIdx ? 1.05 : 1,
                          }}
                          style={{
                            zIndex: activeDragIdx === cardIdx ? 100 : isSelected ? 50 : 10 + cardIdx,
                            opacity: activeDragIdx === cardIdx ? 0.85 : 1,
                            touchAction: "none",
                          }}
                          whileHover={{
                            y: isSelected ? -14 : -6,
                            scale: activeDragIdx === cardIdx ? 1.05 : 1.02,
                            zIndex: 60,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
                          className={`w-[clamp(66px,18vw,88px)] h-[clamp(99px,27vw,132px)] rounded-lg bg-white border-2 text-black cursor-pointer shrink-0 relative select-none ${cardIdxInRow > 0 ? "-ml-[clamp(33px,9vw,44px)]" : ""
                            } ${isSelected
                              ? "ring-2 ring-[var(--color-gold)] border-[var(--color-gold)] shadow-[0_0_12px_4px_rgba(245,166,35,0.45)]"
                              : hoveredSlotIdx === cardIdx && activeDragIdx !== cardIdx
                                ? "ring-2 ring-emerald-400 border-emerald-400 shadow-[0_0_12px_4px_rgba(16,185,129,0.45)]"
                                : "border-gray-300 shadow-md"
                            }`}
                          onClick={() => handleCardClickInternal(card.id, cardIdx)}
                        >
                          <div className="w-full h-full flex flex-col justify-between p-[clamp(4px,1.2vw,6px)] relative overflow-hidden rounded-lg">
                            {isCardJoker ? (
                              <div className="w-full h-full border border-amber-500/30 rounded-md p-1 flex flex-col justify-start select-none relative bg-amber-500/5">
                                {/* JOKER vertical stack */}
                                <div className="flex flex-col items-center leading-none text-[8px] sm:text-[10px] font-black text-amber-600 uppercase tracking-tighter self-start z-10 relative">
                                  <span>J</span>
                                  <span>O</span>
                                  <span>K</span>
                                  <span>E</span>
                                  <span>R</span>
                                </div>
                                <JesterIllustration />
                              </div>
                            ) : (
                              <>
                                {/* Standard stacked corner */}
                                <div className="flex flex-col items-start leading-none self-start select-none z-10 relative">
                                  <span className={`text-[clamp(28px,7.5vw,36px)] font-black leading-none ${suitColor} tracking-tighter`}>
                                    {rank}
                                  </span>
                                  <span className={`text-[clamp(28px,7.5vw,36px)] font-bold leading-none ${suitColor} mt-0.5`}>
                                    {symbol}
                                  </span>
                                </div>

                                {/* Huge bottom-right suit symbol */}
                                <div className={`absolute right-[clamp(2px,0.5vw,8px)] bottom-[clamp(2px,0.5vw,8px)] font-bold leading-none select-none ${suitColor} text-[clamp(42px,11vw,56px)]`}>
                                  {symbol}
                                </div>
                              </>
                            )}


                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
                {!isSpectator && rowSizes.length < 5 && (
                  <div
                    data-card-idx={myHand.length}
                    data-row-idx={rowSizes.length}
                    className={`w-[200px] h-[32px] sm:h-[36px] border-2 border-dashed rounded-xl flex items-center justify-center text-[11px] font-black uppercase tracking-wider transition-colors mt-2 ${hoveredSlotIdx === myHand.length
                      ? "border-emerald-400 text-emerald-400 bg-emerald-500/5 shadow-[0_0_12px_4px_rgba(16,185,129,0.25)] animate-pulse"
                      : "border-white/15 text-white/30 hover:border-white/30 hover:text-white/50"
                      }`}
                  >
                    + New Group
                  </div>
                )}
              </div>
            )}

            {/* Re-sort Hand button inside the board */}
            {!isSpectator && onResortHand && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onResortHand}
                className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md border border-red-500 hover:bg-red-500 transition-colors z-20"
                title="Sort Hand"
              >
                <RefreshCw className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Right Section: Sidebar (Controls, Stats, Piles, Actions) */}
        <div className="w-[105px] sm:w-[130px] md:w-[150px] lg:w-[170px] shrink-0 bg-[#2D5265]/20 border border-white/5 rounded-2xl p-1.5 sm:p-2.5 md:p-3.5 lg:p-4.5 pb-3 sm:pb-5 md:pb-7 lg:pb-9 flex flex-col gap-2 sm:gap-3.5 md:gap-4.5 lg:gap-5.5 items-center justify-start backdrop-blur-sm shadow-md transition-all duration-200">

          {/* Collapsible Info/Settings Panel */}
          <div className="w-full flex flex-col gap-1.5 shrink-0 select-none">
            <button
              onClick={() => setIsMenuExpanded(!isMenuExpanded)}
              className={`w-full py-1.5 md:py-2 lg:py-2.5 rounded-lg border text-[9px] md:text-[10px] lg:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 md:gap-1.5 lg:gap-2 transition-all ${isMenuExpanded
                ? "bg-[var(--color-gold)] text-black border-[var(--color-gold)]"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
            >
              <span>{isMenuExpanded ? "Hide Info" : "Show Info"}</span>
              <Settings className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-4.5 lg:h-4.5" />
            </button>

            {isMenuExpanded && (
              <div className="w-full flex flex-col gap-2 md:gap-2.5 bg-black/40 p-1.5 md:p-2 rounded-xl border border-white/5 overflow-hidden animate-scale-in">
                {/* Player profile capsule */}
                {!isSpectator && (
                  <div className="w-full bg-gradient-to-b from-[#a65e3e] to-[#864627] border border-[#E19E3A]/45 px-1 py-1.5 md:py-2 rounded-lg flex flex-col items-center gap-1 md:gap-1.5 shadow-md relative select-none">
                    <div className="absolute -top-1.5 -left-1 w-4.5 h-4.5 md:w-5 md:h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-[8px] md:text-[9px] shadow-sm">
                      😊
                    </div>
                    <div className="w-6.5 h-6.5 md:w-8 md:h-8 rounded-full border border-[#E19E3A] overflow-hidden bg-slate-700 flex items-center justify-center font-bold text-white text-[10px] md:text-[11px]">
                      {myAvatarUrl ? (
                        <img src={myAvatarUrl} alt={myName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{myName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-[8px] md:text-[10px] lg:text-[11px] font-black text-white truncate max-w-[70px] md:max-w-[100px] lg:max-w-[125px] text-center leading-none uppercase tracking-wide">
                      {myName}
                    </span>
                    <span className="text-[8px] md:text-[9px] lg:text-[10px] font-bold text-[var(--color-gold-light)] leading-none font-score">
                      {myTotalScore} pts
                    </span>
                  </div>
                )}

                {/* Stats panel */}
                <div className="flex flex-col gap-0.5 md:gap-1 w-full text-center">
                  <span className="text-[8px] md:text-[10px] lg:text-[11px] font-bold text-white/70 bg-white/5 border border-white/10 py-0.5 md:py-1 rounded-md leading-none">
                    Rnd {roundNumber}
                  </span>
                  <span className="text-[8px] md:text-[10px] lg:text-[11px] font-extrabold text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 py-0.5 md:py-1 rounded-md leading-none">
                    ₹{betAmount}
                  </span>
                </div>

                {/* Preferences & Quit panel */}
                <div className="flex items-center gap-0.5 md:gap-1.5 w-full justify-between pt-0.5 md:pt-1 border-t border-white/5">
                  <button
                    onClick={onToggleSound}
                    className={`p-1 md:p-1.5 rounded hover:bg-white/5 flex items-center justify-center ${soundOn ? "text-emerald-400" : "text-white/30"}`}
                    title="Toggle Sound"
                  >
                    <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-4.5 lg:h-4.5" />
                  </button>
                  <button
                    onClick={onToggleVibration}
                    className={`p-1 md:p-1.5 rounded hover:bg-white/5 flex items-center justify-center ${vibrationOn ? "text-emerald-400" : "text-white/30"}`}
                    title="Toggle Vibration"
                  >
                    <Smartphone className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-4.5 lg:h-4.5" />
                  </button>
                  <button
                    onClick={handleQuitClick}
                    className={`p-1 md:p-1.5 rounded flex items-center justify-center ${isConfirmingQuit ? "bg-red-600 text-white" : "text-red-400 hover:bg-red-500/10"
                      }`}
                    title="Quit Room"
                  >
                    <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-4.5 lg:h-4.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Wild Joker Display */}
          {wildJoker && (
            <div className="flex flex-col items-center w-full gap-0.5 md:gap-1 animate-scale-in shrink-0">
              <span className="text-[8px] md:text-[10px] lg:text-[11px] uppercase tracking-wider text-[var(--color-gold)] font-black">
                🃏 JOKER
              </span>
              <PlayingCard card={wildJoker.card} size="md" />
            </div>
          )}

          {/* Draw Pile */}
          <div className="flex flex-col items-center shrink-0">
            <motion.div
              onClick={canDraw ? onDrawCard : undefined}
              whileHover={canDraw ? { y: -2, scale: 1.02 } : {}}
              whileTap={canDraw ? { scale: 0.95 } : {}}
              animate={
                canDraw
                  ? {
                    boxShadow: [
                      "0 0 0px 0px rgba(16, 185, 129, 0.2)",
                      "0 0 12px 6px rgba(16, 185, 129, 0.4)",
                      "0 0 0px 0px rgba(16, 185, 129, 0.2)",
                    ],
                  }
                  : {}
              }
              transition={
                canDraw
                  ? {
                    boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                  }
                  : {}
              }
              className={`relative rounded-lg shadow-md border ${canDraw
                ? "border-emerald-400 cursor-pointer"
                : "border-white/10 opacity-70"
                }`}
            >
              <PlayingCard card={{ id: "draw", suit: Suit.JOKER, rank: Rank.ACE } as Card} faceDown={true} size="md" />
              <div className="absolute inset-0 -z-10 rounded-lg bg-red-800 border border-white/5 translate-x-[2px] translate-y-[2px]" />
              <div className="absolute inset-0 -z-20 rounded-lg bg-red-900 border border-white/5 translate-x-[4px] translate-y-[4px]" />
            </motion.div>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center shrink-0">
            {topCard ? (
              <div className="relative select-none transition-all duration-200">
                {discardPile.slice(-3).map((card, idx, arr) => {
                  const isTopCard = idx === arr.length - 1;
                  const charCodeSum = card.id
                    .split("")
                    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const rotation = (charCodeSum % 10) - 5;
                  const offsetIdx = idx - (arr.length - 1);
                  const xOffset = offsetIdx * 1.5;
                  const yOffset = offsetIdx * 1.0;
                  const isCardWild = wildJoker ? isWildJoker(card, wildJoker.wildRank) : false;

                  return (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      size="md"
                      isJoker={isCardWild}
                      rotation={rotation}
                      selected={selectedCards.includes(card.id)}
                      onClick={isTopCard && canDraw ? onPickDiscard : undefined}
                      className={`absolute inset-0 select-none ${isTopCard && canDraw
                        ? "ring-2 ring-emerald-400 cursor-pointer"
                        : isTopCard
                          ? "cursor-pointer"
                          : "pointer-events-none"
                        } ${isTopCard ? "opacity-100" : "opacity-60"}`}
                      style={{
                        transform: `translate(${xOffset}px, ${yOffset}px) rotate(${rotation}deg)`,
                        zIndex: 10 + idx,
                      }}
                    />
                  );
                })}
                {/* Spacer placeholder */}
                <div className="w-[clamp(65px,9vh,82px)] h-[clamp(96px,13.2vh,120px)] opacity-0 pointer-events-none" />
              </div>
            ) : (
              <div className="w-[clamp(65px,9vh,82px)] h-[clamp(96px,13.2vh,120px)] rounded-lg border-2 border-dashed border-white/15 flex items-center justify-center transition-all duration-200">
                <span className="text-[7px] text-white/20 font-bold uppercase">Empty</span>
              </div>
            )}
          </div>

          {/* Action buttons (context-aware sidebar panel) */}
          <div className="w-full flex flex-col gap-1.5 mt-auto">
            {isMyTurn ? (
              <>
                {!hasDrawnThisTurn ? (
                  <button
                    onClick={onDrawCard}
                    className="w-full py-2 md:py-2.5 lg:py-3 rounded-xl text-xs md:text-sm lg:text-base font-black bg-[#10b981] text-white flex items-center justify-center shadow-md hover:brightness-110 active:scale-95 transition-all min-h-[34px] md:min-h-[40px] lg:min-h-[44px]"
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
                      className="w-full py-1.5 md:py-2 lg:py-2.5 rounded-lg text-[9px] md:text-[10px] lg:text-xs font-black bg-[var(--color-gold)] text-black disabled:opacity-40 flex items-center justify-center shadow-sm hover:brightness-115 transition-all min-h-[28px] md:min-h-[32px] lg:min-h-[36px]"
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
                      className="w-full py-1.5 md:py-2 lg:py-2.5 rounded-lg text-[9px] md:text-[10px] lg:text-xs font-black bg-emerald-600 text-white disabled:opacity-40 flex items-center justify-center shadow-sm hover:brightness-115 transition-all min-h-[28px] md:min-h-[32px] lg:min-h-[36px]"
                    >
                      Declare
                    </button>
                  </>
                )}
              </>
            ) : (
              <button
                disabled
                className="w-full py-2 md:py-2.5 lg:py-3 rounded-xl text-xs md:text-sm lg:text-base font-black bg-white/5 border border-white/10 text-white/20 flex items-center justify-center min-h-[34px] md:min-h-[40px] lg:min-h-[44px]"
              >
                Get
              </button>
            )}

            {/* Drop buttons (before drawing) */}
            {canDrop && (showFirstDrop || showSecondDrop) && (
              <div className="flex flex-col gap-1 w-full">
                {showFirstDrop && (
                  <button
                    onClick={onDropFirst}
                    className="w-full py-1.5 md:py-2 lg:py-2.5 rounded-lg text-[9px] md:text-[10px] lg:text-xs font-bold bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-all min-h-[28px] md:min-h-[32px] lg:min-h-[36px]"
                  >
                    Drop (20)
                  </button>
                )}
                {showSecondDrop && (
                  <button
                    onClick={onDropSecond}
                    className="w-full py-1.5 md:py-2 lg:py-2.5 rounded-lg text-[9px] md:text-[10px] lg:text-xs font-bold bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-all min-h-[28px] md:min-h-[32px] lg:min-h-[36px]"
                  >
                    Drop (40)
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Helper text footer */}
      <div className="text-center mt-2.5">
        {canDiscard && (
          <span className="text-[10px] text-[var(--color-gold)]/70 font-semibold mr-1">
            Drag card up to discard •
          </span>
        )}
        <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">
          {myHand.length} cards in Hand
        </span>
      </div>
    </div>
  );
}
