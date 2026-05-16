import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { getSession } from "@/store/session";
import { useAuctionSocket } from "@/hooks/use-auction-socket";
import { formatMoney, getNextBidAmount, IPL_TEAMS } from "@/lib/constants";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy, Clock, Zap, AlertTriangle, CheckCircle2,
  SkipForward, MessageCircle, Send, Crown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Auction() {
  const { roomId } = useParams<{ roomId: string }>();
  const [_, setLocation] = useLocation();
  const session = getSession();
  const { toast } = useToast();
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { socket, chatMessages, skipVotes, bidFlash } = useAuctionSocket(roomId, session?.userId);

  const { data: state, isLoading } = useQuery({
    queryKey: ["auctionState", roomId],
    queryFn: () => api.getAuctionState(roomId),
    enabled: !!roomId,
    refetchInterval: false,
  });

  const { data: squadData } = useQuery({
    queryKey: ["squad", roomId, session?.userId],
    queryFn: () => api.getUserSquad(roomId, session!.userId),
    enabled: !!session?.userId && !!roomId,
  });

  const placeBid = useMutation({
    mutationFn: ({ amount }: { amount: number }) =>
      api.placeBid(roomId, session!.userId, amount),
    onError: (error: Error) => {
      toast({ title: "Bid failed", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!session) setLocation("/");
    else if (state?.status === "finished") setLocation(`/room/${roomId}/results`);
  }, [session, state?.status, roomId, setLocation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (isLoading || !state || !session) return null;

  const me = state.users.find((u) => u.id === session.userId);
  const isMyBid = state.highestBidderId === session.userId;
  const nextBid = state.currentPlayer
    ? getNextBidAmount(state.currentBid, state.currentPlayer.basePrice, state.currentPlayer.category)
    : 0;
  const canAfford = me ? me.balance >= nextBid : false;
  const isSquadFull = me ? me.squadCount >= 15 : true;
  const timeRemaining = state.timeRemaining ?? 0;
  const isCritical = timeRemaining <= 5 && timeRemaining > 0;
  const isWarning = timeRemaining <= 10 && timeRemaining > 5;
  const hasVotedSkip = skipVotes.votedIds.includes(session.userId);

  const handleBid = () => {
    if (!state.currentPlayer || !canAfford || isSquadFull || isMyBid) return;
    placeBid.mutate({ amount: nextBid });
  };

  const handleSkip = () => {
    if (hasVotedSkip || !state.currentPlayer) return;
    socket.current?.emit("vote_skip", { roomId, userId: session.userId });
  };

  const handleSendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    socket.current?.emit("send_chat", {
      roomId,
      userId: session.userId,
      name: session.name,
      message: msg,
    });
    setChatInput("");
  };

  const sortedUsers = [...state.users].sort((a, b) => b.balance - a.balance);

  const timerColor = isCritical
    ? "text-red-400"
    : isWarning
      ? "text-orange-400"
      : "text-white";

  return (
    <div className="h-screen w-full bg-background overflow-hidden flex flex-col">
      {/* Top Bar */}
      <header className="h-14 border-b border-white/10 bg-black/60 backdrop-blur-sm flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-primary" />
          <span className="font-bold uppercase tracking-widest text-white text-sm">IPL Auction</span>
          <span className="text-white/20 text-xs mx-1">•</span>
          <span className="font-mono text-white/50 text-xs">Room: {roomId}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40">
            {state.playersAuctioned}
            <span className="text-white/20"> / </span>
            {state.totalPlayers} auctioned
          </span>
          {me && (
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <span className="text-white/50 text-xs">Purse</span>
              <span className="font-mono font-bold text-primary">{formatMoney(me.balance)}</span>
            </div>
          )}
        </div>
      </header>

      {/* 3-column layout */}
      <div className="flex-1 grid grid-cols-[220px_1fr_260px] min-h-0 overflow-hidden">

        {/* LEFT: Franchises */}
        <div className="border-r border-white/5 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center justify-between">
              Franchises
              <span className="bg-white/10 text-white/50 px-1.5 py-0.5 rounded text-[10px]">{sortedUsers.length}</span>
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {sortedUsers.map((user) => {
                const teamInfo = IPL_TEAMS.find((t) => t.id === user.teamName);
                const isLeading = state.highestBidderId === user.id;
                const isMe = user.id === session.userId;
                return (
                  <motion.div key={user.id} layout>
                    <div className={`
                      relative rounded-xl p-3 border transition-all duration-300
                      ${isLeading
                        ? "bg-primary/10 border-primary/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                        : "bg-white/3 border-white/5 hover:border-white/10"}
                    `}>
                      <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${teamInfo?.color || "bg-white/20"}`} />
                      <div className="pl-3">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-white/90">{user.name}</span>
                          {user.isHost && <Crown className="w-3 h-3 text-yellow-400" />}
                          {isMe && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">YOU</span>}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/40">{user.teamName} · {user.squadCount}/15</span>
                          <span className={`font-mono text-xs font-bold ${isLeading ? "text-primary" : "text-white/60"}`}>
                            {formatMoney(user.balance)}
                          </span>
                        </div>
                        {isLeading && (
                          <div className="mt-1 flex items-center gap-1 text-primary text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                            Leading
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* CENTER: Auction arena */}
        <div className="flex flex-col items-center justify-center relative px-6 py-4 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
            <img
              src={`${import.meta.env.BASE_URL}images/auction-gavel.png`}
              alt=""
              className="w-80 h-80 object-contain"
            />
          </div>

          <div className="w-full max-w-md space-y-5 z-10">
            {/* Player card with enter animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={state.currentPlayer?.id ?? "none"}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <PlayerCard player={state.currentPlayer} />
              </motion.div>
            </AnimatePresence>

            {state.currentPlayer && (
              <div className="space-y-4">
                {/* Bid + timer card */}
                <div className={`
                  rounded-2xl border p-5 text-center space-y-4 transition-all duration-300
                  ${bidFlash
                    ? "bg-primary/15 border-primary/60 shadow-[0_0_30px_rgba(245,158,11,0.25)]"
                    : "bg-white/3 border-white/8"}
                `}>
                  {/* Current bid */}
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Current Bid</p>
                    <div className="text-5xl font-mono font-black text-white drop-shadow-sm">
                      {formatMoney(state.currentBid)}
                    </div>
                    <AnimatePresence>
                      {state.highestBidderName && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2"
                        >
                          <span className="inline-flex items-center gap-1.5 text-xs bg-primary/15 text-primary border border-primary/30 px-3 py-1 rounded-full font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            {state.highestBidderName}
                            {state.highestBidderId === session.userId && " (You)"}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Timer */}
                  <div className={`flex items-center justify-center gap-2 font-mono font-bold transition-colors duration-500 ${timerColor} ${isCritical ? "animate-pulse" : ""}`}>
                    <Clock className="w-5 h-5 opacity-70" />
                    <span className="text-4xl tabular-nums">{timeRemaining}s</span>
                  </div>

                  {/* Bid button */}
                  {isMyBid ? (
                    <div className="w-full h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      You're leading — hold on!
                    </div>
                  ) : (
                    <Button
                      onClick={handleBid}
                      disabled={!canAfford || isSquadFull || placeBid.isPending || timeRemaining === 0}
                      className={`
                        w-full h-14 text-lg font-bold rounded-xl uppercase tracking-wide transition-all duration-200
                        ${canAfford && !isSquadFull && timeRemaining > 0
                          ? "bg-primary text-black hover:bg-primary/90 active:scale-[0.98] shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_30px_rgba(245,158,11,0.45)]"
                          : "bg-white/5 text-white/25 cursor-not-allowed border border-white/5"}
                      `}
                    >
                      {isSquadFull
                        ? "Squad Full (15/15)"
                        : !canAfford
                          ? "Not enough funds"
                          : placeBid.isPending
                            ? "Placing bid..."
                            : `Bid ${formatMoney(nextBid)}`}
                    </Button>
                  )}

                  {!isMyBid && !canAfford && me && (
                    <p className="text-xs text-red-400/80 flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Need {formatMoney(nextBid - me.balance)} more for the next bid
                    </p>
                  )}
                </div>

                {/* Skip voting */}
                <div className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <SkipForward className="w-4 h-4 text-white/40" />
                    <span className="text-xs text-white/50">
                      Skip votes:{" "}
                      <span className={`font-bold ${skipVotes.votes > 0 ? "text-orange-400" : "text-white/40"}`}>
                        {skipVotes.votes}/{skipVotes.total || state.users.length}
                      </span>
                    </span>
                    {skipVotes.votes > 0 && (
                      <div className="flex gap-1">
                        {Array.from({ length: skipVotes.total || state.users.length }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${i < skipVotes.votes ? "bg-orange-400" : "bg-white/10"}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSkip}
                    disabled={hasVotedSkip}
                    className={`
                      text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 border
                      ${hasVotedSkip
                        ? "bg-orange-500/10 border-orange-500/30 text-orange-400 cursor-default"
                        : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80 hover:border-white/20 active:scale-95"}
                    `}
                  >
                    {hasVotedSkip ? "Voted" : "Vote to Skip"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Squad + Chat */}
        <div className="border-l border-white/5 flex flex-col overflow-hidden">
          {/* Squad */}
          <div className="flex-[0_0_auto] border-b border-white/5">
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">My Squad</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50 font-mono">{squadData?.squadCount || 0}/15</span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                  <Zap className="w-3 h-3" />{squadData?.totalPowerScore || 0} pts
                </span>
              </div>
            </div>
            <ScrollArea className="h-48">
              <div className="p-3 space-y-1.5">
                {!squadData?.squad.length ? (
                  <div className="text-center py-6 text-white/20 text-xs">No players yet</div>
                ) : (
                  squadData.squad.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-white">{p.name}</p>
                        <p className="text-[10px] text-white/40">{p.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-primary">{formatMoney(p.pricePaid)}</p>
                        <p className="text-[9px] text-emerald-400 flex items-center justify-end gap-0.5">
                          <Zap className="w-2.5 h-2.5" />{p.powerScore}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
              <MessageCircle className="w-3.5 h-3.5 text-white/40" />
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Chat</h3>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {chatMessages.length === 0 && (
                  <div className="text-center py-4 text-white/20 text-xs">No messages yet</div>
                )}
                <AnimatePresence initial={false}>
                  {chatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`rounded-xl px-3 py-2 ${msg.userId === session.userId ? "bg-primary/10 border border-primary/20 ml-4" : "bg-white/4 border border-white/5 mr-4"}`}
                    >
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-bold ${msg.userId === session.userId ? "text-primary" : "text-white/60"}`}>
                          {msg.userId === session.userId ? "You" : msg.name}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed break-words">{msg.message}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder="Say something..."
                  maxLength={200}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-all"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim()}
                  className="p-2 rounded-lg bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
