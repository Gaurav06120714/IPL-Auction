import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetResults } from "@workspace/api-client-react";
import { formatMoney, IPL_TEAMS } from "@/lib/constants";
import confetti from "canvas-confetti";
import { Trophy, Zap, Crown, Medal, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function Results() {
  const { roomId } = useParams<{ roomId: string }>();
  const [_, setLocation] = useLocation();

  const { data, isLoading, error } = useGetResults(roomId);

  useEffect(() => {
    if (data) {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#F59E0B', '#3B82F6']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#F59E0B', '#E11D48']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [data]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Trophy className="w-12 h-12 animate-pulse text-primary" /></div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center text-destructive">Failed to load results</div>;

  const top3 = data.results.slice(0, 3);
  const others = data.results.slice(3);

  return (
    <div className="min-h-screen w-full bg-background p-6 md:p-12 overflow-y-auto relative">
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/stadium-bg.png`} 
          alt="Stadium Background" 
          className="w-full h-full object-cover opacity-10"
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-4 pt-8">
          <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tight text-white drop-shadow-xl">
            Auction <span className="text-gradient-gold">Results</span>
          </h1>
          <p className="text-xl text-white/60 font-mono">Room: {roomId}</p>
        </div>

        {/* Top 3 Podium */}
        <div className="flex flex-col md:flex-row justify-center items-end gap-6 pt-12 pb-8">
          {[1, 0, 2].map((rankIndex) => {
            const result = top3[rankIndex];
            if (!result) return null;
            
            const teamInfo = IPL_TEAMS.find(t => t.id === result.teamName);
            const isWinner = rankIndex === 0;
            const heightClass = isWinner ? 'md:h-80' : rankIndex === 1 ? 'md:h-64' : 'md:h-56';
            
            return (
              <motion.div
                key={result.userId}
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: isWinner ? 0.4 : rankIndex === 1 ? 0.2 : 0.6, type: "spring" }}
                className={`relative w-full md:w-72 flex flex-col items-center order-${rankIndex === 0 ? 2 : rankIndex === 1 ? 1 : 3}`}
              >
                {isWinner && <Crown className="w-16 h-16 text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />}
                {!isWinner && <Medal className={`w-12 h-12 mb-4 ${rankIndex === 1 ? 'text-slate-300' : 'text-amber-700'}`} />}
                
                <Card className={`w-full ${heightClass} glass-panel border-t-4 p-6 flex flex-col items-center justify-start text-center relative overflow-hidden ${
                  isWinner ? 'border-t-yellow-400 bg-yellow-500/10' : 
                  rankIndex === 1 ? 'border-t-slate-300 bg-slate-500/10' : 
                  'border-t-amber-700 bg-amber-900/10'
                }`}>
                  <div className={`absolute top-0 left-0 w-full h-1 ${teamInfo?.color || 'bg-primary'}`} />
                  
                  <h3 className="text-2xl font-bold text-white mb-1">{result.name}</h3>
                  <Badge team={teamInfo} teamName={result.teamName} />
                  
                  <div className="mt-auto w-full space-y-3 pt-6">
                    <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                      <span className="text-white/60 uppercase tracking-wider">Power Score</span>
                      <span className="font-mono font-bold text-emerald-400 flex items-center gap-1"><Zap className="w-4 h-4"/>{result.totalPowerScore}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white/60 uppercase tracking-wider">Purse Left</span>
                      <span className="font-mono font-bold text-white">{formatMoney(result.balance)}</span>
                    </div>
                  </div>
                </Card>
                <div className="mt-4 text-6xl font-black font-display text-white/20">#{rankIndex + 1}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Rest of the leaderboard */}
        {others.length > 0 && (
          <div className="space-y-4 mt-12">
            <h3 className="text-2xl font-display font-bold text-white uppercase tracking-wider mb-6">Other Franchises</h3>
            {others.map((result) => {
              const teamInfo = IPL_TEAMS.find(t => t.id === result.teamName);
              return (
                <motion.div key={result.userId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className="glass-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-6 w-full sm:w-auto">
                      <span className="text-3xl font-display font-bold text-white/30 w-8 text-center">#{result.rank}</span>
                      <div>
                        <h4 className="text-xl font-bold text-white">{result.name}</h4>
                        <p className="text-sm text-white/60 flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${teamInfo?.color}`} />
                          {teamInfo?.name || result.teamName}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 w-full sm:w-auto bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                      <div className="text-center">
                        <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Squad</p>
                        <p className="font-mono font-bold text-white">{result.squadCount}/15</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Purse Left</p>
                        <p className="font-mono font-bold text-white">{formatMoney(result.balance)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Power</p>
                        <p className="font-mono font-bold text-emerald-400 flex items-center justify-center gap-1">
                          <Zap className="w-4 h-4"/>{result.totalPowerScore}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="text-center pb-20 pt-10">
          <button 
            onClick={() => setLocation("/")}
            className="text-white/50 hover:text-white transition-colors underline underline-offset-4"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ team, teamName }: { team: any, teamName: string }) {
  if (!team) return <span className="text-sm text-white/60">{teamName}</span>;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${team.color} ${team.text}`}>
      {team.name}
    </span>
  );
}
