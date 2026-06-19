import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { getSession } from "@/store/session";
import { useAuctionSocket } from "@/hooks/use-auction-socket";
import { IPL_TEAMS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Copy, Users, Crown, PlayCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const [_, setLocation] = useLocation();
  const session = getSession();
  const { toast } = useToast();

  useAuctionSocket(roomId, session?.userId);

  const { data: room, isLoading } = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => api.getRoom(roomId),
    enabled: !!roomId,
    refetchInterval: 3000,
  });

  const startAuction = useMutation({
    mutationFn: () => api.startAuction(roomId, session!.userId),
    onError: (err: Error) => toast({ title: "Cannot start", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (!session) {
      setLocation("/");
    } else if (room?.status === "active" || room?.status === "finished") {
      setLocation(`/room/${roomId}/auction`);
    }
  }, [session, room?.status, roomId, setLocation]);

  if (isLoading || !room) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast({ title: "Copied!", description: "Room ID copied to clipboard." });
  };

  return (
    <div className="min-h-screen w-full relative p-6 flex flex-col items-center pt-20">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
      </div>

      <div className="relative z-10 w-full max-w-5xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-display font-black text-white uppercase tracking-tight">
            Auction <span className="text-primary">Lobby</span>
          </h1>
          <div className="inline-flex items-center gap-3 bg-black/50 border border-white/10 rounded-full py-2 px-6 backdrop-blur-sm">
            <span className="text-white/60 font-mono">Room ID:</span>
            <span className="text-xl font-bold font-mono text-white">{roomId}</span>
            <button onClick={copyRoomId} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Copy className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-display font-bold text-white">Franchises ({room.users.length})</h2>
            </div>
            {session?.isHost && (
              <div className="flex flex-col items-end gap-1.5">
                <Button
                  onClick={() => startAuction.mutate()}
                  disabled={startAuction.isPending || room.users.length < 2}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 shine relative overflow-hidden"
                >
                  {startAuction.isPending ? "Starting..." : (
                    <span className="flex items-center gap-2">
                      <PlayCircle className="w-5 h-5" /> Start Auction
                    </span>
                  )}
                </Button>
                {room.users.length < 2 && (
                  <p className="text-xs text-white/50">Need at least 2 franchises to start</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {room.users.map((user, idx) => {
              const teamInfo = IPL_TEAMS.find((t) => t.id === user.teamName);
              return (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }} key={user.id}>
                  <Card className="bg-black/40 border-white/10 hover:border-primary/50 transition-colors overflow-hidden relative">
                    <div className={`absolute top-0 left-0 w-2 h-full ${teamInfo?.color || "bg-gray-500"}`} />
                    <div className="p-4 pl-6 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{user.name}</h3>
                          {user.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                          {user.id === session?.userId && (
                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase">You</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-white/60">{teamInfo?.name || user.teamName}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-xl ${teamInfo?.color} ${teamInfo?.text}`}>
                        {user.teamName}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {!session?.isHost && (
            <div className="mt-8 text-center text-white/50 animate-pulse">
              Waiting for host to start the auction...
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
}
