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
    if (isConfirmingQuit) { onQuit(); }
    else { setIsConfirmingQuit(true); setTimeout(() => setIsConfirmingQuit(false), 3000); }
  };

  return (
    <div
      className="w-full h-[48px] sm:h-[52px] px-3 flex justify-between items-center z-40 shrink-0"
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Left: Quit */}
      <button
        onClick={handleQuitClick}
        id="topbar-quit-btn"
        className={`text-xs font-bold px-3 py-1.5 rounded-lg border min-h-[34px] flex items-center justify-center transition-all ${
          isConfirmingQuit
            ? "bg-red-600 text-white border-red-500"
            : "bg-black/30 text-white/60 border-white/10 hover:bg-black/50 hover:text-white"
        }`}
      >
        {isConfirmingQuit ? "Confirm?" : "Quit"}
      </button>

      {/* Center: Round + Wild Joker */}
      <div className="flex items-center gap-2">
        <div
          className="px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span className="text-xs font-bold text-white/80 font-score">
            Round {roundNumber}
          </span>
        </div>

        {wildJoker && (() => {
          const jokerCard = (wildJoker as any).card || wildJoker;
          return (
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 4px rgba(245, 166, 35, 0.15)",
                  "0 0 12px 3px rgba(245, 166, 35, 0.4)",
                  "0 0 4px rgba(245, 166, 35, 0.15)",
                ],
              }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-xl"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(245,166,35,0.35)' }}
            >
              <span className="text-[9px] uppercase tracking-wider text-[var(--color-gold)] font-extrabold flex items-center gap-0.5">
                🃏 Joker
              </span>
              <div
                className="w-[26px] h-[38px] rounded-[4px] bg-white border-2 border-[var(--color-gold)] shadow-sm flex flex-col justify-between p-[2px] text-black shrink-0 relative overflow-hidden"
              >
                <div className="flex flex-col items-start leading-none">
                  <span className={`text-[10px] font-black leading-none ${cardSuitColor(jokerCard.suit)}`}>
                    {cardRankName(jokerCard.rank)}
                  </span>
                </div>
                <div className={`text-[12px] text-center font-bold self-center leading-none ${cardSuitColor(jokerCard.suit)}`}>
                  {cardSuitSymbol(jokerCard.suit)}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </div>

      {/* Right: Bet + Settings */}
      <div className="flex items-center gap-1.5">
        <div
          className="px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)' }}
        >
          <span className="text-xs font-bold text-[var(--color-gold)] font-score">
            ₹{betAmount}
          </span>
        </div>

        <div className="relative">
          <button
            id="topbar-settings-btn"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {isSettingsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
              <div
                className="absolute right-0 mt-1 w-44 rounded-xl shadow-2xl p-3 z-50 flex flex-col gap-2"
                style={{
                  background: 'linear-gradient(160deg, #0f2210 0%, #091509 100%)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-0.5">
                  Preferences
                </div>
                <button
                  onClick={onToggleSound}
                  className="flex items-center justify-between text-xs font-semibold text-white px-3 py-2 rounded-lg border border-white/5 transition-colors min-h-[36px] hover:bg-white/5"
                  style={{ background: 'rgba(0,0,0,0.3)' }}
                >
                  <span>Sound</span>
                  <span className={soundOn ? "text-emerald-400" : "text-red-400"}>{soundOn ? "ON" : "OFF"}</span>
                </button>
                <button
                  onClick={onToggleVibration}
                  className="flex items-center justify-between text-xs font-semibold text-white px-3 py-2 rounded-lg border border-white/5 transition-colors min-h-[36px] hover:bg-white/5"
                  style={{ background: 'rgba(0,0,0,0.3)' }}
                >
                  <span>Vibration</span>
                  <span className={vibrationOn ? "text-emerald-400" : "text-red-400"}>{vibrationOn ? "ON" : "OFF"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
