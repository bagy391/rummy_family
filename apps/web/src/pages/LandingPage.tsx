import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Users, Trophy, Smartphone } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Multiplayer",
    desc: "Play with 2-6 friends in real-time",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    desc: "Track wins, earnings & compete",
  },
  {
    icon: Smartphone,
    title: "Install Anywhere",
    desc: "Works on mobile, tablet & desktop",
  },
  {
    icon: Sparkles,
    title: "Live Betting",
    desc: "Set stakes & settle via UPI",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-[200px]" />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center max-w-lg"
      >
        {/* Logo / Title */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
          className="mb-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg glow-emerald mb-4 mx-auto">
            <span className="text-4xl font-bold text-white font-[Outfit]">R</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold font-[Outfit] tracking-tight">
            <span className="text-gradient-emerald">Family</span>{" "}
            <span className="text-[var(--color-text-primary)]">Rummy</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-[var(--color-text-secondary)] text-lg mb-8 leading-relaxed"
        >
          The ultimate multiplayer rummy experience for family &amp; friends.
          Play live, bet, and settle with UPI.
        </motion.p>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="grid grid-cols-2 gap-3 mb-8 w-full"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
              className="glass rounded-xl p-4 text-left hover:border-emerald-500/30 transition-colors duration-200"
            >
              <f.icon className="w-5 h-5 text-emerald-400 mb-2" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {f.title}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
        >
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-base shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl glass text-[var(--color-text-primary)] font-semibold text-base hover:border-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Sign In
          </Link>
        </motion.div>

        {/* Version tag */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-8 text-xs text-[var(--color-text-muted)]"
        >
          v1.0.0 • Built for family & friends
        </motion.p>
      </motion.div>
    </div>
  );
}
