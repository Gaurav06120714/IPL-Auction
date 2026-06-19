import { useState } from "react";
import { Player } from "@/services/api";
import { formatMoney } from "@/lib/constants";
import { getPlayerImage } from "@/data/player-images";
import { motion } from "framer-motion";
import { User, Star, Shield, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlayerCardProps {
  player: Player | null;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Circular player avatar with a strict fallback chain:
//   1. Real local photo (public/images/players/<slug>.jpg) \u2014 fades in once loaded.
//   2. Generated avatar \u2014 category-tinted gradient ring + silhouette glow.
//   3. Initials monogram \u2014 always rendered underneath.
// A loading skeleton shows while the photo is fetching. On error the photo is
// removed (never a broken-image icon, never alt-text leakage \u2014 alt is "").
function PlayerAvatar({ player }: { player: Player }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const isGoat = player.category === "goat";
  const isCapped = player.category === "capped";

  const ring = isGoat
    ? "ring-yellow-400/70 from-yellow-500/30 to-yellow-900/50"
    : isCapped
      ? "ring-slate-300/60 from-slate-400/30 to-slate-800/50"
      : "ring-emerald-400/50 from-emerald-500/25 to-emerald-900/50";

  const showPhoto = status !== "error";

  return (
    <div
      className={`relative w-32 h-32 rounded-full ring-2 ${ring} bg-gradient-to-br shadow-2xl shadow-black/40 overflow-hidden flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-105`}
    >
      {/* (3) Initials monogram \u2014 base layer */}
      <span className="font-display font-black text-5xl text-white/90 select-none drop-shadow">
        {initials(player.name)}
      </span>

      {/* Loading skeleton \u2014 only while a photo is actively fetching */}
      {showPhoto && status === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-white/10" />
      )}

      {/* (1) Real photo \u2014 fades in once decoded; removed on error */}
      {showPhoto && (
        <img
          src={getPlayerImage(player.name)}
          alt=""
          aria-hidden="true"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

export function PlayerCard({ player, className = "" }: PlayerCardProps) {
  if (!player) {
    return (
      <div className={`glass-panel rounded-3xl p-8 flex flex-col items-center justify-center text-center aspect-[3/4] max-h-[500px] ${className}`}>
        <User className="w-24 h-24 text-muted-foreground/30 mb-4" />
        <h3 className="text-2xl font-display text-muted-foreground">Waiting for Next Player</h3>
      </div>
    );
  }

  const isGoat = player.category === 'goat';
  const isCapped = player.category === 'capped';

  const bgGradient = isGoat
    ? "bg-gradient-to-br from-yellow-500/20 via-yellow-700/20 to-yellow-900/40 border-yellow-500/50"
    : isCapped
      ? "bg-gradient-to-br from-slate-400/20 via-slate-600/20 to-slate-800/40 border-slate-400/50"
      : "bg-gradient-to-br from-emerald-500/10 via-emerald-700/10 to-emerald-900/30 border-emerald-500/30";

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", bounce: 0.5 }}
      whileHover={{ y: -4 }}
      className={`group relative rounded-3xl overflow-hidden shadow-2xl ${bgGradient} border-2 transition-shadow duration-300 hover:shadow-[0_0_40px_-8px_rgba(245,158,11,0.35)] ${className}`}
    >
      {/* Background Effect */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm -z-10" />
      {/* Watermark powerScore — premium sports-card look, no external assets */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10 overflow-hidden">
        <span className="font-display font-black leading-none text-white/[0.06] text-[14rem] select-none">
          {player.powerScore}
        </span>
      </div>

      <div className="relative z-10 p-6 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className={`px-3 py-1 font-display uppercase tracking-widest text-lg border-2 ${
            isGoat ? 'text-yellow-400 border-yellow-400/50' :
            isCapped ? 'text-slate-200 border-slate-400/50' :
            'text-emerald-400 border-emerald-400/50'
          }`}>
            {player.category}
          </Badge>

          <div className="flex items-center gap-2 bg-black/50 rounded-full px-4 py-1.5 border border-white/10">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="font-mono font-bold text-white">{player.powerScore} PWR</span>
          </div>
        </div>

        {/* Player avatar */}
        <div className="flex justify-center pt-4">
          <PlayerAvatar player={player} />
        </div>

        <div className="mt-auto pt-6">
          <h2 className="text-5xl font-display font-black text-white uppercase tracking-tight leading-none mb-2 drop-shadow-lg">
            {player.name}
          </h2>

          <div className="flex items-center gap-4 text-white/80 mb-6">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span className="font-medium">{player.role}</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4" />
              <span className="font-medium">{player.country}</span>
            </div>
          </div>

          <div className="bg-black/60 rounded-2xl p-4 border border-white/10 backdrop-blur-md flex justify-between items-center">
            <span className="text-white/60 font-medium uppercase tracking-wider text-sm">Base Price</span>
            <span className="font-mono text-2xl font-bold text-white">{formatMoney(player.basePrice)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
