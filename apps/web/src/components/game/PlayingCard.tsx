import React, { useId } from "react";
import { motion } from "framer-motion";
import { Suit, Rank } from "@rummy/shared";
import type { Card } from "@rummy/shared";
import { cardSuitColor, cardSuitSymbol, cardRankName } from "./card-utils";

interface PlayingCardProps {
  card: Card;
  /** sm = opponent/mini, md = table piles, lg = player hand */
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  selected?: boolean;
  isJoker?: boolean;
  isWildJoker?: boolean;
  onClick?: () => void;
  glowColor?: string;
  className?: string;
  rotation?: number;
  style?: React.CSSProperties;
}

const sizeMap = {
  sm: {
    card: "w-[30px] h-[44px]",
    rank: "text-[12px] font-black leading-none",
    suitSmall: "text-[12px] font-bold leading-none",
    suitHuge: "text-[18px]",
    jokerText: "text-[6px]",
    padding: "p-[2px]",
    cornerRadius: "rounded-[4px]",
  },
  md: {
    card: "w-[clamp(56px,8.2vw,74px)] h-[clamp(80px,12vw,108px)] landscape:w-[clamp(50px,11.5vh,68px)] landscape:h-[clamp(74px,16.5vh,98px)]",
    rank: "text-[clamp(18px,2.6vw,24px)] landscape:text-[clamp(16px,3.8vh,22px)] font-black leading-none",
    suitSmall: "text-[clamp(18px,2.6vw,24px)] landscape:text-[clamp(16px,3.8vh,22px)] font-bold leading-none",
    suitHuge: "text-[clamp(28px,4.5vw,42px)] landscape:text-[clamp(26px,6vh,38px)]",
    jokerText: "text-[8px]",
    padding: "p-[4px]",
    cornerRadius: "rounded-[6px]",
  },
  lg: {
    card: "w-[var(--hand-card-w)] h-[var(--hand-card-h)]",
    rank: "text-[clamp(22px,3.4vw,32px)] landscape:text-[clamp(20px,4.8vh,30px)] font-black leading-none",
    suitSmall: "text-[clamp(22px,3.4vw,32px)] landscape:text-[clamp(20px,4.8vh,30px)] font-bold leading-none",
    suitHuge: "text-[clamp(34px,5.2vw,52px)] landscape:text-[clamp(32px,7.5vh,48px)]",
    jokerText: "text-[10px]",
    padding: "p-[5px]",
    cornerRadius: "rounded-[8px]",
  },
};

/* ─── Royal King Illustration ─── */
export function KingIllustration() {
  const p = useId();
  return (
    <svg viewBox="0 0 60 85" className="absolute right-0 bottom-0 w-[72%] h-[78%] select-none pointer-events-none z-0 opacity-95">
      <defs>
        <linearGradient id={`${p}kGold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id={`${p}kRed`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
        <linearGradient id={`${p}kBlue`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <radialGradient id={`${p}kFace`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF1EB" />
          <stop offset="100%" stopColor="#F5D0C5" />
        </radialGradient>
      </defs>
      {/* Crown */}
      <path d="M 12 24 L 18 10 L 25 18 L 32 8 L 39 18 L 46 10 L 52 24 Z" fill={`url(#${p}kGold)`} stroke="#92400E" strokeWidth="1" />
      <circle cx="18" cy="10" r="2" fill="#EF4444" />
      <circle cx="32" cy="8" r="2.5" fill="#EF4444" />
      <circle cx="46" cy="10" r="2" fill="#EF4444" />
      <rect x="13" y="21" width="38" height="4" rx="1" fill="#D97706" />
      {/* Face */}
      <path d="M 18 24 L 46 24 L 44 48 L 20 48 Z" fill={`url(#${p}kFace)`} stroke="#78350F" strokeWidth="0.8" />
      {/* Eyes & Eyebrows */}
      <path d="M 22 30 Q 26 28 30 30" stroke="#78350F" strokeWidth="1.2" fill="none" />
      <path d="M 34 30 Q 38 28 42 30" stroke="#78350F" strokeWidth="1.2" fill="none" />
      <circle cx="26" cy="33" r="1.5" fill="#18181B" />
      <circle cx="38" cy="33" r="1.5" fill="#18181B" />
      {/* Nose */}
      <path d="M 32 32 L 30 39 L 34 39" stroke="#92400E" strokeWidth="1" fill="none" />
      {/* Moustache & Beard */}
      <path d="M 22 41 Q 32 45 42 41 Q 32 48 22 41 Z" fill="#78350F" />
      <path d="M 18 36 L 16 54 Q 32 66 48 54 L 46 36 Q 44 50 32 50 Q 20 50 18 36 Z" fill="#92400E" />
      {/* Royal Collar & Robe */}
      <path d="M 10 52 Q 32 60 54 52 L 58 85 L 6 85 Z" fill={`url(#${p}kRed)`} stroke="#B91C1C" strokeWidth="1" />
      {/* Robe accents */}
      <path d="M 20 56 L 24 85 M 44 56 L 40 85" stroke={`url(#${p}kGold)`} strokeWidth="3" />
      <path d="M 28 58 L 28 85 L 36 85 L 36 58 Z" fill={`url(#${p}kBlue)`} />
      {/* Royal Sash / Chain */}
      <path d="M 10 60 Q 32 75 54 60" fill="none" stroke={`url(#${p}kGold)`} strokeWidth="2.5" strokeDasharray="3 2" />
    </svg>
  );
}

/* ─── Royal Queen Illustration ─── */
export function QueenIllustration() {
  const p = useId();
  return (
    <svg viewBox="0 0 60 85" className="absolute right-0 bottom-0 w-[72%] h-[78%] select-none pointer-events-none z-0 opacity-95">
      <defs>
        <linearGradient id={`${p}qGold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id={`${p}qRed`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#9F1239" />
        </linearGradient>
        <radialGradient id={`${p}qFace`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF5F0" />
          <stop offset="100%" stopColor="#FED7AA" />
        </radialGradient>
      </defs>
      {/* Tiara */}
      <path d="M 16 22 L 22 10 L 32 4 L 42 10 L 48 22 Z" fill={`url(#${p}qGold)`} stroke="#92400E" strokeWidth="1" />
      <circle cx="32" cy="4" r="2.5" fill="#E11D48" />
      <circle cx="22" cy="10" r="1.8" fill="#3B82F6" />
      <circle cx="42" cy="10" r="1.8" fill="#3B82F6" />
      {/* Flowing Hair */}
      <path d="M 14 24 Q 10 45 16 60 Q 22 45 20 26 Z" fill="#92400E" />
      <path d="M 50 24 Q 54 45 48 60 Q 42 45 44 26 Z" fill="#92400E" />
      {/* Face */}
      <path d="M 19 22 Q 18 46 32 50 Q 46 46 45 22 Z" fill={`url(#${p}qFace)`} stroke="#78350F" strokeWidth="0.8" />
      {/* Eyes & Lashes */}
      <path d="M 23 28 Q 27 25 30 28" stroke="#78350F" strokeWidth="1.2" fill="none" />
      <path d="M 34 28 Q 37 25 41 28" stroke="#78350F" strokeWidth="1.2" fill="none" />
      <circle cx="27" cy="31" r="1.5" fill="#18181B" />
      <circle cx="37" cy="31" r="1.5" fill="#18181B" />
      {/* Cheeks & Lips */}
      <circle cx="23" cy="36" r="2.5" fill="#F43F5E" opacity="0.3" />
      <circle cx="41" cy="36" r="2.5" fill="#F43F5E" opacity="0.3" />
      <path d="M 28 42 Q 32 45 36 42 Q 32 46 28 42 Z" fill="#E11D48" />
      {/* Royal Gown */}
      <path d="M 12 50 Q 32 58 52 50 L 58 85 L 6 85 Z" fill={`url(#${p}qRed)`} stroke="#881337" strokeWidth="1" />
      <path d="M 24 54 Q 32 64 40 54 L 38 85 L 26 85 Z" fill="#FFFBEB" stroke={`url(#${p}qGold)`} strokeWidth="1" />
      {/* Pearl necklace */}
      <path d="M 22 49 Q 32 55 42 49" fill="none" stroke="#FDE047" strokeWidth="2" strokeDasharray="2 2" />
    </svg>
  );
}

/* ─── Royal Jack Illustration ─── */
export function JackIllustration() {
  const p = useId();
  return (
    <svg viewBox="0 0 60 85" className="absolute right-0 bottom-0 w-[72%] h-[78%] select-none pointer-events-none z-0 opacity-95">
      <defs>
        <linearGradient id={`${p}jkGold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id={`${p}jkRed`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <linearGradient id={`${p}jkBlue`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <radialGradient id={`${p}jkFace`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF1EB" />
          <stop offset="100%" stopColor="#FDE0D7" />
        </radialGradient>
      </defs>
      {/* Feathered Hat */}
      <path d="M 8 16 Q 16 4 28 8 Q 18 12 14 22 Z" fill="#3B82F6" />
      <path d="M 12 24 Q 32 14 52 24 L 48 18 Q 30 12 14 18 Z" fill={`url(#${p}jkRed)`} stroke="#991B1B" strokeWidth="0.8" />
      <circle cx="16" cy="22" r="3" fill={`url(#${p}jkGold)`} />
      {/* Hair */}
      <path d="M 16 24 Q 14 36 18 46 Q 22 36 20 26 Z" fill="#B45309" />
      <path d="M 48 24 Q 50 36 46 46 Q 42 36 44 26 Z" fill="#B45309" />
      {/* Face */}
      <path d="M 18 24 L 46 24 L 43 48 L 21 48 Z" fill={`url(#${p}jkFace)`} stroke="#78350F" strokeWidth="0.8" />
      {/* Eyes & Mustache */}
      <circle cx="26" cy="32" r="1.5" fill="#18181B" />
      <circle cx="38" cy="32" r="1.5" fill="#18181B" />
      <path d="M 25 38 Q 32 40 39 38" stroke="#78350F" strokeWidth="1" fill="none" />
      <path d="M 28 43 Q 32 46 36 43" stroke="#DC2626" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Ruff Collar */}
      <path d="M 12 48 Q 32 58 52 48 L 50 54 Q 32 62 14 54 Z" fill="#FFFFFF" stroke="#E4E4E7" strokeWidth="1" />
      {/* Doublet */}
      <path d="M 10 54 Q 32 60 54 54 L 58 85 L 6 85 Z" fill={`url(#${p}jkBlue)`} stroke="#1E40AF" strokeWidth="1" />
      <path d="M 24 58 L 26 85 M 38 58 L 36 85" stroke={`url(#${p}jkGold)`} strokeWidth="2.5" />
    </svg>
  );
}

/* ─── Jester / Joker Illustration ─── */
export function JesterIllustration() {
  const p = useId();
  return (
    <svg viewBox="0 0 65 95" className="absolute right-0 bottom-0 w-[74%] h-[82%] select-none pointer-events-none z-0">
      <defs>
        <linearGradient id={`${p}jRed`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
        <linearGradient id={`${p}jBlue`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id={`${p}jGreen`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#065F46" />
        </linearGradient>
        <linearGradient id={`${p}jGold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <radialGradient id={`${p}jFace`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF1EB" />
          <stop offset="100%" stopColor="#FDE0D7" />
        </radialGradient>
      </defs>
      {/* Hat Horns */}
      <path d="M 32 30 Q 10 10 4 22 Q 8 32 32 32" fill={`url(#${p}jRed)`} />
      <circle cx="4" cy="22" r="3" fill={`url(#${p}jGold)`} />
      <path d="M 32 30 Q 55 10 61 22 Q 57 32 32 32" fill={`url(#${p}jBlue)`} />
      <circle cx="61" cy="22" r="3" fill={`url(#${p}jGold)`} />
      <path d="M 32 30 Q 32 2 32 7 Q 32 32 32 32" fill={`url(#${p}jGreen)`} />
      <circle cx="32" cy="7" r="3" fill={`url(#${p}jGold)`} />
      {/* Face */}
      <path d="M 16 32 C 16 18, 49 18, 49 32 C 49 48, 16 48, 16 32 Z" fill={`url(#${p}jFace)`} stroke="#8A4C32" strokeWidth="0.8" />
      <circle cx="22" cy="40" r="3" fill="#EF4444" opacity="0.35" />
      <circle cx="42" cy="40" r="3" fill="#EF4444" opacity="0.35" />
      <circle cx="24" cy="35" r="1.8" fill="#18181B" />
      <circle cx="41" cy="35" r="1.8" fill="#18181B" />
      {/* Cheerful Smile */}
      <path d="M 23 43 Q 32 51 42 43" fill="none" stroke="#18181B" strokeWidth="1.8" strokeLinecap="round" />
      {/* Collar */}
      <path d="M 14 48 Q 32 56 50 48 L 45 54 L 32 51 L 19 54 Z" fill={`url(#${p}jRed)`} stroke={`url(#${p}jGold)`} strokeWidth="0.8" />
      <circle cx="21" cy="56" r="1.8" fill={`url(#${p}jGold)`} />
      <circle cx="43" cy="56" r="1.8" fill={`url(#${p}jGold)`} />
      {/* Diamond Tunic */}
      <path d="M 16 52 L 48 52 L 52 95 L 12 95 Z" fill={`url(#${p}jGold)`} stroke="#D97706" strokeWidth="0.8" />
      <path d="M 22 52 L 26 95 M 32 52 L 32 95 M 42 52 L 38 95" stroke={`url(#${p}jRed)`} strokeWidth="1" />
    </svg>
  );
}

/* ─── RummyCircle Iconic Amber/Gold Woven Card Back ─── */
export function CardBackPattern({ size = "lg" }: { size?: "sm" | "md" | "lg" }) {
  const p = useId();
  const r = sizeMap[size].cornerRadius;
  return (
    <div className={`w-full h-full ${r} overflow-hidden bg-white p-[2px] shadow-md`}>
      <div
        className={`w-full h-full ${r} flex items-center justify-center relative overflow-hidden`}
        style={{
          background: 'linear-gradient(145deg, #f59e0b 0%, #d97706 40%, #b45309 80%, #78350f 100%)',
        }}
      >
        {/* Subtle white inner border */}
        <div className="absolute inset-[2.5px] border border-white/30 rounded-[inherit] pointer-events-none z-10" />

        {/* Woven diamond crosshatch pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 40 60" fill="none" stroke="#FEF3C7" strokeWidth="0.5">
          <defs>
            <pattern id={`${p}rcPattern`} width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 0 4 L 4 0 L 8 4 L 4 8 Z" fill="none" stroke="#FEF3C7" strokeWidth="0.6" />
              <circle cx="4" cy="4" r="0.8" fill="#FFFBEB" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${p}rcPattern)`} />
        </svg>

        {/* Center Golden Diamond Emblem */}
        <div className="relative z-10 w-[34%] h-[24%] rotate-45 bg-amber-900/40 border border-amber-200/50 rounded-sm flex items-center justify-center shadow-sm">
          <div className="-rotate-45 text-amber-100 font-black text-[9px] sm:text-[10px] tracking-tighter select-none">
            ♠
          </div>
        </div>

        {/* Card gloss sweep */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 pointer-events-none" />
      </div>
    </div>
  );
}

export default function PlayingCard({
  card,
  size = "lg",
  faceDown = false,
  selected = false,
  onClick,
  glowColor,
  className = "",
  rotation = 0,
  style,
}: PlayingCardProps) {
  const s = sizeMap[size];
  const positionClass = /absolute|relative|fixed/.test(className) ? "" : "relative";

  if (faceDown) {
    return (
      <div
        onClick={onClick}
        className={`${s.card} select-none transition-transform duration-150 ${s.cornerRadius} ${className}`}
        style={{
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          cursor: onClick ? "pointer" : "default",
          ...style,
        }}
      >
        <CardBackPattern size={size} />
      </div>
    );
  }

  const suitColor = cardSuitColor(card.suit);
  const symbol = cardSuitSymbol(card.suit);
  const rank = cardRankName(card.rank);
  const isCardPrintedJoker = card.suit === Suit.JOKER;

  const borderGlow = selected
    ? "ring-2 ring-[var(--color-gold)] border-[var(--color-gold)] shadow-[0_0_18px_6px_rgba(245,166,35,0.55)]"
    : "border-gray-200/90 shadow-[0_4px_12px_rgba(0,0,0,0.4)]";

  return (
    <div
      onClick={onClick}
      className={`
        ${s.card} ${s.cornerRadius} bg-white border-2 text-black select-none
        flex flex-col justify-between ${s.padding}
        ${positionClass} overflow-hidden ${borderGlow}
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
      style={{
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        boxShadow: glowColor ? `0 0 14px 4px ${glowColor}` : undefined,
        ...style,
      }}
    >
      {/* Card shine gloss */}
      <div className="card-shine" />

      {isCardPrintedJoker ? (
        <div className="w-full h-full border border-amber-400/40 rounded-[inherit] p-[2px] flex flex-col justify-start select-none relative bg-gradient-to-br from-amber-50 to-yellow-50/40 overflow-hidden">
          {/* Vertical JOKER banner */}
          <div className={`flex flex-col items-center leading-none ${s.jokerText} font-black text-amber-600 uppercase tracking-tighter z-10 relative self-start`}>
            <span>J</span><span>O</span><span>K</span><span>E</span><span>R</span>
          </div>
          <JesterIllustration />
        </div>
      ) : (
        <>
          {/* Top-left corner: rank + suit */}
          <div className="flex flex-col items-start leading-none select-none self-start z-10 relative">
            <span className={`${s.rank} ${suitColor} tracking-tight font-black`}>{rank}</span>
            <span className={`${s.suitSmall} font-bold leading-none ${suitColor} -mt-0.5`}>{symbol}</span>
          </div>

          {/* Royal Court Illustrations for J, Q, K */}
          {card.rank === Rank.KING ? (
            <KingIllustration />
          ) : card.rank === Rank.QUEEN ? (
            <QueenIllustration />
          ) : card.rank === Rank.JACK ? (
            <JackIllustration />
          ) : (
            /* Large suit symbol for number cards and Ace */
            <div className={`absolute right-[3px] bottom-[3px] font-bold leading-none select-none ${suitColor} ${s.suitHuge} z-[1] opacity-95`}>
              {symbol}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Motion-wrapped PlayingCard for animations */
export const MotionPlayingCard = motion.create(PlayingCard);
