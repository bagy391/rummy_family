import { motion } from "framer-motion";
import { Suit } from "@rummy/shared";
import type { Card } from "@rummy/shared";
import { cardSuitColor, cardSuitSymbol, cardRankName } from "./card-utils";

interface PlayingCardProps {
  card: Card;
  /** sm = opponent/mini, md = table piles, lg = player hand */
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  selected?: boolean;
  isJoker?: boolean;
  onClick?: () => void;
  glowColor?: string;
  className?: string;
  rotation?: number;
  style?: React.CSSProperties;
}

const sizeClasses = {
  sm: {
    card: "w-[35px] h-[50px] sm:w-[42px] sm:h-[60px]",
    rank: "text-[13px] sm:text-[16px] font-black",
    suitSmall: "text-[10px] sm:text-[11px] font-black",
    jokerText: "text-[9px]",
    padding: "p-0.5",
  },
  md: {
    card: "w-[clamp(65px,9vh,82px)] h-[clamp(96px,13.2vh,120px)] landscape:w-[clamp(46px,11vh,62px)] landscape:h-[clamp(68px,16.5vh,92px)]",
    rank: "text-[clamp(19px,3vh,26px)] landscape:text-[clamp(15px,3.8vh,20px)] font-black",
    suitSmall: "text-[clamp(12px,1.8vh,15px)] landscape:text-[clamp(10px,2.4vh,12px)] font-black",
    jokerText: "text-[11px]",
    padding: "p-1",
  },
  lg: {
    card: "w-[clamp(70px,10.2vh,90px)] h-[clamp(102px,14.6vh,130px)] landscape:w-[clamp(60px,15vh,80px)] landscape:h-[clamp(86px,21.5vh,116px)]",
    rank: "text-[clamp(24px,3.5vh,30px)] landscape:text-[clamp(20px,4.8vh,24px)] font-black",
    suitSmall: "text-[clamp(17px,2.6vh,20px)] landscape:text-[clamp(13px,3vh,16px)] font-black",
    jokerText: "text-[13px]",
    padding: "p-1.5",
  },
};

// Premium Jester Illustration with smooth linear/radial gradients, shadows, and background sparkles
export const JesterIllustration = () => (
  <svg viewBox="0 0 65 95" className="absolute right-1 bottom-1 w-[70%] h-[82%] select-none pointer-events-none z-0">
    <defs>
      {/* Hat gradients */}
      <linearGradient id="jesterRed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF4D4D" />
        <stop offset="100%" stopColor="#B30000" />
      </linearGradient>
      <linearGradient id="jesterBlue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4DA6FF" />
        <stop offset="100%" stopColor="#0059B3" />
      </linearGradient>
      <linearGradient id="jesterGreen" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#5CD65C" />
        <stop offset="100%" stopColor="#1E5C1E" />
      </linearGradient>
      <linearGradient id="jesterGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE066" />
        <stop offset="100%" stopColor="#CC9900" />
      </linearGradient>
      {/* Face gradient */}
      <radialGradient id="jesterFace" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#FFF2EC" />
        <stop offset="85%" stopColor="#FFE5D9" />
        <stop offset="100%" stopColor="#FAD2C0" />
      </radialGradient>
      {/* Soft shadow */}
      <filter id="jesterShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0.5" dy="1.5" stdDeviation="1" floodOpacity="0.25" />
      </filter>
    </defs>

    {/* Jester Hat points */}
    {/* Left point */}
    <path d="M 32 32 Q 10 12 4 25 Q 7 35 32 35" fill="url(#jesterRed)" stroke="#F5A623" strokeWidth="0.4" filter="url(#jesterShadow)" />
    <circle cx="4" cy="25" r="2.2" fill="url(#jesterGold)" stroke="#CC9900" strokeWidth="0.3" />
    
    {/* Right point */}
    <path d="M 32 32 Q 55 12 61 25 Q 58 35 32 35" fill="url(#jesterBlue)" stroke="#F5A623" strokeWidth="0.4" filter="url(#jesterShadow)" />
    <circle cx="61" cy="25" r="2.2" fill="url(#jesterGold)" stroke="#CC9900" strokeWidth="0.3" />
    
    {/* Center point */}
    <path d="M 32 32 Q 32 0 32 6 Q 32 35 32 35" fill="url(#jesterGreen)" stroke="#F5A623" strokeWidth="0.4" filter="url(#jesterShadow)" />
    <circle cx="32" cy="6" r="2.2" fill="url(#jesterGold)" stroke="#CC9900" strokeWidth="0.3" />

    {/* Hair */}
    <path d="M 12 35 Q 7 44 14 51 M 53 35 Q 58 44 51 51" fill="none" stroke="#D35400" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 10 37 Q 6 46 12 53 M 55 37 Q 59 46 53 53" fill="none" stroke="#E67E22" strokeWidth="1.2" strokeLinecap="round" />

    {/* Face */}
    <path d="M 16 35 C 16 20, 49 20, 49 35 C 49 50, 16 50, 16 35 Z" fill="url(#jesterFace)" stroke="#8A4C32" strokeWidth="0.8" />
    
    {/* Cheeks red blush */}
    <circle cx="23" cy="43" r="2.5" fill="#EF4444" opacity="0.35" />
    <circle cx="42" cy="43" r="2.5" fill="#EF4444" opacity="0.35" />
    
    {/* Eyes, Eyebrows */}
    <path d="M 21 34 Q 24 32 27 34" fill="none" stroke="#5C3A21" strokeWidth="1" strokeLinecap="round" />
    <path d="M 38 34 Q 41 32 44 34" fill="none" stroke="#5C3A21" strokeWidth="1" strokeLinecap="round" />
    <circle cx="24" cy="38" r="1.5" fill="#1A1A1A" />
    <circle cx="41" cy="38" r="1.5" fill="#1A1A1A" />
    
    {/* Nose and Smile */}
    <path d="M 32 37 L 32 42 Q 30 42 30 43" fill="none" stroke="#8A4C32" strokeWidth="0.8" />
    <path d="M 23 45 Q 32 52 42 45" fill="none" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M 22 45 C 22 45, 23 48, 25 47 M 43 45 C 43 45, 42 48, 40 47" fill="none" stroke="#EF4444" strokeWidth="1" />

    {/* Collar with bells */}
    <path d="M 15 52 Q 32 60 50 52" fill="none" stroke="#EF4444" strokeWidth="1.5" />
    <path d="M 14 52 L 23 59 L 32 52 L 41 59 L 51 52 L 45 56 L 32 54 L 20 56 Z" fill="url(#jesterRed)" stroke="#F5A623" strokeWidth="0.5" />
    <circle cx="23" cy="59" r="1.5" fill="url(#jesterGold)" stroke="#CC9900" strokeWidth="0.4" />
    <circle cx="41" cy="59" r="1.5" fill="url(#jesterGold)" stroke="#CC9900" strokeWidth="0.4" />

    {/* Checkered Tunic body */}
    <path d="M 18 56 L 47 56 L 51 95 L 14 95 Z" fill="url(#jesterGold)" stroke="#CC9900" strokeWidth="0.8" />
    {/* Checkered patterns */}
    <path d="M 23 56 L 27 95 M 32 56 L 32 95 M 41 56 L 37 95" stroke="url(#jesterRed)" strokeWidth="0.8" />
    <path d="M 17 65 L 47 65 M 15 75 L 49 75 M 14 85 L 50 85" stroke="url(#jesterRed)" strokeWidth="0.8" />

    {/* Background sparkles */}
    <path d="M 8 72 L 9 70 L 10 72 L 12 73 L 10 74 L 9 76 L 8 74 L 6 73 Z" fill="url(#jesterGold)" opacity="0.7" />
    <path d="M 54 62 L 55 60 L 56 62 L 58 63 L 56 64 L 55 66 L 54 64 L 52 63 Z" fill="url(#jesterGold)" opacity="0.7" />
  </svg>
);

// Premium floral red card back matching screenshot
const CardBackPattern = () => (
  <div className="w-full h-full p-[3px] rounded-md bg-white flex items-center justify-center select-none shadow-md">
    <div className="w-full h-full p-1 rounded-[3px] bg-red-700 flex items-center justify-center relative overflow-hidden">
      <div className="w-full h-full border border-white/70 rounded-[2px] flex items-center justify-center relative bg-red-700">
        <svg className="w-full h-full opacity-35" viewBox="0 0 40 60" fill="none" stroke="white" strokeWidth="0.4">
          <path d="M 20 0 L 20 60 M 0 30 L 40 30" />
          <circle cx="20" cy="30" r="14" />
          <circle cx="20" cy="30" r="8" />
          <path d="M 20 30 L 10 20 M 20 30 L 30 20 M 20 30 L 10 40 M 20 30 L 30 40" />
          <path d="M 5 5 L 35 55 M 35 5 L 5 55" />
          <circle cx="5" cy="5" r="2" />
          <circle cx="35" cy="5" r="2" />
          <circle cx="5" cy="55" r="2" />
          <circle cx="35" cy="55" r="2" />
          {/* Flower petals */}
          <path d="M 20 16 C 18 20, 22 20, 20 16 Z" fill="white" />
          <path d="M 20 44 C 18 40, 22 40, 20 44 Z" fill="white" />
          <path d="M 6 30 C 10 28, 10 32, 6 30 Z" fill="white" />
          <path d="M 34 30 C 30 28, 30 32, 34 30 Z" fill="white" />
        </svg>
        {/* Center emblem */}
        <div className="absolute w-7 h-7 rounded-full border border-white/80 bg-red-700 flex items-center justify-center shadow-inner">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white/85">
            <path d="M12 2c-.3 0-.5.2-.7.4L10 6l-3.6-1.3c-.3-.1-.6 0-.8.3s-.2.6 0 .8L7 10l-3.6 1.3c-.3.1-.4.4-.4.7s.1.5.4.6l3.6 1.4-1.4 3.6c-.1.3 0 .6.3.8.2.2.5.2.7 0L10 18l1.3 3.6c.1.3.4.4.7.4s.5-.1.6-.4L14 18l3.6 1.3c.3.1.6 0 .8-.3s.2-.6 0-.8L17 14l3.6-1.3c.3-.1.4-.4.4-.7s-.1-.5-.4-.6l-3.6-1.4 1.4-3.6c.1-.3 0-.6-.3-.8s-.5-.2-.7 0L14 6l-1.3-3.6c-.1-.3-.4-.4-.7-.4zM12 9c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3z" />
          </svg>
        </div>
      </div>
    </div>
  </div>
);

export default function PlayingCard({
  card,
  size = "lg",
  faceDown = false,
  selected = false,
  isJoker = false,
  onClick,
  glowColor,
  className = "",
  rotation = 0,
  style,
}: PlayingCardProps) {
  const s = sizeClasses[size];

  if (faceDown) {
    return (
      <div
        onClick={onClick}
        className={`${s.card} select-none transition-transform duration-150 ${className}`}
        style={{
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          cursor: onClick ? "pointer" : "default",
          ...style,
        }}
      >
        <CardBackPattern />
      </div>
    );
  }

  const suitColor = cardSuitColor(card.suit);
  const symbol = cardSuitSymbol(card.suit);
  const rank = cardRankName(card.rank);
  const isCardJoker = card.suit === Suit.JOKER;

  const jokerBorderClass = isJoker
    ? "ring-2 ring-[var(--color-gold)] shadow-[0_0_12px_4px_var(--color-gold-glow)]"
    : "";
  const selectedClass = selected
    ? "ring-2 ring-[var(--color-gold)] shadow-[0_0_15px_5px_var(--color-gold-glow)]"
    : "";

  return (
    <div
      onClick={onClick}
      className={`${s.card} rounded-md bg-white border border-gray-200 text-black select-none flex flex-col justify-between ${s.padding} shadow-md ${jokerBorderClass} ${selectedClass} ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        boxShadow: glowColor ? `0 0 12px 4px ${glowColor}` : undefined,
        ...style,
      }}
    >
      {isCardJoker ? (
        <div className="w-full h-full border border-amber-500/30 rounded-md p-1 sm:p-1.5 flex flex-col justify-start select-none relative bg-amber-500/5">
          {/* Vertical "JOKER" corner text */}
          <div className={`flex flex-col items-center leading-none ${s.jokerText} font-black text-amber-600 uppercase tracking-tighter z-10 relative self-start`}>
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
          {/* Top-left corner (vertical stack) */}
          <div className="flex flex-col items-center leading-none select-none self-start z-10 relative">
            <span className={`${s.rank} font-black leading-none ${suitColor} tracking-tighter`}>
              {rank}
            </span>
            <span className={`${s.suitSmall} font-bold leading-none ${suitColor} mt-0.5`}>
              {symbol}
            </span>
          </div>

          {/* Center symbol */}
          <div className={`${s.suitSmall} text-center font-bold self-center leading-none select-none opacity-20 scale-150 ${suitColor}`}>
            {symbol}
          </div>

          {/* Bottom corner (vertical stack, rotated) */}
          <div className="flex flex-col items-center leading-none scale-y-[-1] scale-x-[-1] self-end z-10 relative">
            <span className={`${s.rank} font-black leading-none ${suitColor} tracking-tighter`}>
              {rank}
            </span>
            <span className={`${s.suitSmall} font-bold leading-none ${suitColor} mt-0.5`}>
              {symbol}
            </span>
          </div>
        </>
      )}


    </div>
  );
}

/** Motion-wrapped PlayingCard for animations */
export const MotionPlayingCard = motion.create(PlayingCard);
