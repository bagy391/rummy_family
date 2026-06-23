import { useState } from "react";
import { motion } from "framer-motion";
import type { WildJokerInfo } from "@rummy/shared";
import { cardSuitColor, cardSuitSymbol, cardRankName } from "./card-utils";

interface TopBarProps {
  roundNumber: number;
  wildJoker: WildJokerInfo | null;
  betAmount: number;
  onQuit: () => void;
  soundOn: boolean;
  vibrationOn: boolean;
  onToggleSound: () => void;
  onToggleVibration: () => void;
}

export default function TopBar({
  roundNumber,
  wildJoker,
  betAmount,
  onQuit,
  soundOn,
  vibrationOn,
  onToggleSound,
  onToggleVibration,
}: TopBarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfirmingQuit, setIsConfirmingQuit] = useState(false);

  const handleQuitClick = () => {
    if (isConfirmingQuit) {
      onQuit();
    } else {
      setIsConfirmingQuit(true);
      setTimeout(() => setIsConfirmingQuit(false), 3000);
    }
  };

  return (
    <div className="w-full h-[60px] px-3 sm:px-4 bg-[#0D1B2A]/90 backdrop-blur-md border-b border-white/8 flex justify-between items-center z-40 shrink-0">
      {/* Left: Quit */}
      <button
        onClick={handleQuitClick}
        className={`text-sm font-bold px-4 py-2 rounded-xl border min-h-[44px] flex items-center justify-center transition-all duration-200 ${
          isConfirmingQuit
            ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/20"
            : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
        }`}
      >
        {isConfirmingQuit ? "Confirm Quit" : "Quit"}
      </button>

      {/* Center: Round + Wild Joker */}
      <div className="flex items-center gap-3">
        <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
          <span className="text-sm font-bold font-[var(--font-score)] text-white">
            Round {roundNumber}
          </span>
        </div>

        {wildJoker && (() => {
          const jokerCard = (wildJoker as any).card || wildJoker;
          return (
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 4px rgba(245, 166, 35, 0.2)",
                  "0 0 14px 3px rgba(245, 166, 35, 0.5)",
                  "0 0 4px rgba(245, 166, 35, 0.2)",
                ],
              }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="flex items-center gap-1.5 bg-[#0D1B2A]/80 border border-[var(--color-gold)]/40 pl-2 pr-1 py-1 rounded-xl"
            >
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-gold)] font-extrabold flex items-center gap-0.5">
                🃏 Joker
              </span>
              <div className="w-[30px] h-[42px] sm:w-[34px] sm:h-[48px] rounded bg-white border-2 border-[var(--color-gold)] shadow-sm flex flex-col justify-between p-0.5 text-black shrink-0 relative overflow-hidden select-none">
                <div className="flex flex-col items-start leading-none">
                  <span className={`text-[11px] sm:text-[13px] font-black leading-none ${cardSuitColor(jokerCard.suit)}`}>
                    {cardRankName(jokerCard.rank)}
                  </span>
                </div>
                <div className={`text-[14px] sm:text-[16px] text-center font-bold self-center leading-none -mt-1 ${cardSuitColor(jokerCard.suit)}`}>
                  {cardSuitSymbol(jokerCard.suit)}
                </div>
                <div className="flex flex-col items-end leading-none scale-y-[-1] scale-x-[-1] self-end">
                  <span className={`text-[8px] sm:text-[9px] font-black leading-none ${cardSuitColor(jokerCard.suit)}`}>
                    {cardRankName(jokerCard.rank)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </div>

      {/* Right: Bet + Settings */}
      <div className="flex items-center gap-2">
        <div className="bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 px-3 py-1.5 rounded-full">
          <span className="text-sm font-bold font-[var(--font-score)] text-[var(--color-gold)]">
            ₹{betAmount}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {isSettingsOpen && (
            <>
              {/* Backdrop to close */}
              <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-[var(--color-bg-card)] border border-[var(--color-border-default)] rounded-xl shadow-2xl p-3 z-50 flex flex-col gap-2">
                <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">
                  Preferences
                </div>

                <button
                  onClick={onToggleSound}
                  className="flex items-center justify-between text-sm font-semibold text-white bg-black/30 hover:bg-black/50 px-3 py-2 rounded-lg border border-white/5 transition-colors min-h-[44px]"
                >
                  <span>Sound</span>
                  <span className={soundOn ? "text-emerald-400" : "text-red-400"}>
                    {soundOn ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  onClick={onToggleVibration}
                  className="flex items-center justify-between text-sm font-semibold text-white bg-black/30 hover:bg-black/50 px-3 py-2 rounded-lg border border-white/5 transition-colors min-h-[44px]"
                >
                  <span>Vibration</span>
                  <span className={vibrationOn ? "text-emerald-400" : "text-red-400"}>
                    {vibrationOn ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
