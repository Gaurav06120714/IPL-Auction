import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import type { AuctionState } from "../services/api.js";

// Query key helpers (replaces @workspace/api-client-react helpers)
const roomKey = (roomId: string) => ["room", roomId];
const auctionStateKey = (roomId: string) => ["auctionState", roomId];

export interface ChatMessage {
  id: string;
  userId: number;
  name: string;
  message: string;
  timestamp: number;
}

export interface SkipVoteState {
  votes: number;
  total: number;
  votedIds: number[];
}

export function useAuctionSocket(
  roomId: string | undefined,
  userId: number | undefined
) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [skipVotes, setSkipVotes] = useState<SkipVoteState>({ votes: 0, total: 0, votedIds: [] });
  const [bidFlash, setBidFlash] = useState(false);

  useEffect(() => {
    if (!roomId || !userId) return;

    // Connect to the backend via Vite proxy
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", { roomId, userId });
    });

    socket.on("room_updated", () => {
      queryClient.invalidateQueries({ queryKey: roomKey(roomId) });
    });

    socket.on("auction_state", (state: AuctionState) => {
      queryClient.setQueryData(auctionStateKey(roomId), state);
    });

    socket.on("timer_tick", ({ timeRemaining }: { roomId: string; timeRemaining: number }) => {
      queryClient.setQueryData<AuctionState>(auctionStateKey(roomId), (old) => {
        if (!old) return old;
        return { ...old, timeRemaining };
      });
    });

    socket.on("bid_placed", (data: { userId: number; bidderName: string; amount: number; timeRemaining: number }) => {
      queryClient.setQueryData<AuctionState>(auctionStateKey(roomId), (old) => {
        if (!old) return old;
        return { ...old, currentBid: data.amount, highestBidderId: data.userId, highestBidderName: data.bidderName, timeRemaining: data.timeRemaining };
      });
      setBidFlash(true);
      setTimeout(() => setBidFlash(false), 600);
    });

    socket.on("player_sold", () => {
      queryClient.invalidateQueries({ queryKey: auctionStateKey(roomId) });
      queryClient.invalidateQueries({ queryKey: roomKey(roomId) });
    });

    socket.on("player_unsold", () => {
      queryClient.invalidateQueries({ queryKey: auctionStateKey(roomId) });
    });

    socket.on("player_skipped", () => {
      queryClient.invalidateQueries({ queryKey: auctionStateKey(roomId) });
    });

    socket.on("auction_finished", () => {
      queryClient.invalidateQueries({ queryKey: auctionStateKey(roomId) });
    });

    socket.on("skip_votes_updated", (data: SkipVoteState) => {
      setSkipVotes(data);
    });

    socket.on("chat_message", (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev.slice(-99), msg]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, userId, queryClient]);

  return { socket: socketRef, chatMessages, skipVotes, bidFlash };
}
