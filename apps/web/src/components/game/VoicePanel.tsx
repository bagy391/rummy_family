import { motion, AnimatePresence } from "framer-motion";
import type { VoiceParticipant } from "@/lib/useVoiceChat";

interface VoicePanelProps {
  isInVoice: boolean;
  isMuted: boolean;
  isJoining: boolean;
  voiceParticipants: VoiceParticipant[];
  error: string | null;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
  /** compact mode — used when rendered as a floating drawer in-game */
  compact?: boolean;
}

function MicIcon({ muted, className }: { muted: boolean; className?: string }) {
  if (muted) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

export default function VoicePanel({
  isInVoice,
  isMuted,
  isJoining,
  voiceParticipants,
  error,
  onJoin,
  onLeave,
  onToggleMute,
  compact = false,
}: VoicePanelProps) {
  return (
    <div className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isInVoice ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-white/40"}`}>
            <SpeakerIcon className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold font-[Outfit] text-white/80">Voice Channel</span>
          {isInVoice && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              LIVE
            </span>
          )}
        </div>
        {voiceParticipants.length > 0 && (
          <span className="text-xs text-white/40 font-semibold">
            {voiceParticipants.length} online
          </span>
        )}
      </div>

      {/* Participant List */}
      <AnimatePresence>
        {voiceParticipants.length > 0 ? (
          <div className="space-y-1.5">
            {voiceParticipants.map((p) => (
              <motion.div
                key={p.uid}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-xl
                  ${p.isSpeaking
                    ? "bg-emerald-500/10 border border-emerald-500/30"
                    : "bg-white/5 border border-white/5"
                  }
                  transition-colors duration-200
                `}
              >
                <div className="flex items-center gap-2.5">
                  {/* Speaking / online indicator */}
                  <div className="relative flex-shrink-0">
                    <div className={`
                      w-2 h-2 rounded-full
                      ${p.isMuted ? "bg-red-400" : p.isSpeaking ? "bg-emerald-400" : "bg-white/30"}
                    `} />
                    {p.isSpeaking && (
                      <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                    )}
                  </div>
                  <span className={`text-sm font-medium truncate max-w-[130px] ${p.isSpeaking ? "text-white" : "text-white/70"}`}>
                    {p.name}
                  </span>
                </div>

                {/* Muted badge */}
                {p.isMuted && (
                  <div className="flex items-center gap-1 text-red-400">
                    <MicIcon muted className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Speaking wave animation */}
                {p.isSpeaking && !p.isMuted && (
                  <div className="flex items-end gap-[2px] h-3.5">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-[3px] bg-emerald-400 rounded-full"
                        style={{
                          animation: `voiceBar 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                          height: `${i * 4}px`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : isInVoice ? (
          <p className="text-xs text-white/30 italic text-center py-2">
            You're the only one here. Waiting for others to join...
          </p>
        ) : (
          <p className="text-xs text-white/30 italic text-center py-2">
            No one in voice yet. Join to start talking!
          </p>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isInVoice ? (
          <button
            onClick={onJoin}
            disabled={isJoining}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-emerald-900/30"
          >
            <MicIcon muted={false} className="w-4 h-4" />
            {isJoining ? "Connecting..." : "Join Voice"}
          </button>
        ) : (
          <>
            {/* Mute / Unmute */}
            <button
              onClick={onToggleMute}
              title={isMuted ? "Unmute" : "Mute"}
              className={`
                flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]
                ${isMuted
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                  : "bg-white/10 hover:bg-white/15 text-white/80 border border-white/10"
                }
              `}
            >
              <MicIcon muted={isMuted} className="w-4 h-4" />
              {isMuted ? "Unmute" : "Mute"}
            </button>

            {/* Leave */}
            <button
              onClick={onLeave}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Leave Voice
            </button>
          </>
        )}
      </div>

      {/* CSS keyframes for speaking bar animation */}
      <style>{`
        @keyframes voiceBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
}
