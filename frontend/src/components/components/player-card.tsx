import { Player } from "@workspace/api-client-react";
import { formatMoney } from "@/lib/constants";
import { motion } from "framer-motion";
import { User, Star, Shield, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlayerCardProps {
  player: Player | null;
  className?: string;
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
      className={`relative rounded-3xl overflow-hidden shadow-2xl ${bgGradient} border-2 ${className}`}
    >
      {/* Background Effect */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm -z-10" />
      <img 
        src={`${import.meta.env.BASE_URL}images/player-placeholder.png`}
        alt="Player silhouette"
        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay -z-10"
      />

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

        <div className="mt-auto pt-32">
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
