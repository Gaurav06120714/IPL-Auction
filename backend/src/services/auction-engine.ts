import { db } from "../db/index.js";
import {
  roomsTable,
  usersTable,
  playersTable,
  squadTable,
} from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import type { Server as SocketServer } from "socket.io";
import { logger } from "../config/logger.js";

// ────────────────────────────────────────────────────────────
// In-memory state
// ────────────────────────────────────────────────────────────

interface AuctionState {
  currentPlayerId: number;
  currentBid: number;
  highestBidderId: number | null;
}

interface TimerState {
  timer: NodeJS.Timeout;
  endTime: number;
  roomId: string;
}

const activeTimers = new Map<string, TimerState>();
const currentAuctions = new Map<string, AuctionState>();
const skipVotes = new Map<string, Set<number>>();

let io: SocketServer | null = null;

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

export function setSocketServer(socketServer: SocketServer) {
  io = socketServer;
}

export async function getAuctionStateForRoom(roomId: string) {
  const room = await db.query.roomsTable.findFirst({
    where: eq(roomsTable.id, roomId),
  });
  if (!room) return null;

  const users = await db.query.usersTable.findMany({
    where: eq(usersTable.roomId, roomId),
  });

  const auction = currentAuctions.get(roomId);
  const timerState = activeTimers.get(roomId);

  let currentPlayer = null;
  let currentBid = null;
  let highestBidderId = null;
  let highestBidderName = null;
  let timeRemaining = null;

  if (auction) {
    currentPlayer =
      (await db.query.playersTable.findFirst({
        where: eq(playersTable.id, auction.currentPlayerId),
      })) ?? null;

    currentBid = auction.currentBid;
    highestBidderId = auction.highestBidderId;

    if (auction.highestBidderId) {
      const bidder = users.find((u) => u.id === auction.highestBidderId);
      highestBidderName = bidder?.name ?? null;
    }

    if (timerState) {
      timeRemaining = Math.max(
        0,
        Math.round((timerState.endTime - Date.now()) / 1000)
      );
    }
  }

  const totalPlayers = await db.query.playersTable.findMany();

  return {
    roomId,
    status: room.status,
    currentPlayer,
    currentBid,
    highestBidderId,
    highestBidderName,
    timeRemaining,
    playersAuctioned: room.playersAuctioned,
    totalPlayers: totalPlayers.length,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      teamName: u.teamName,
      balance: u.balance,
      squadCount: u.squadCount,
      isHost: u.isHost,
    })),
  };
}

export async function startAuction(roomId: string) {
  await db
    .update(roomsTable)
    .set({ status: "active" })
    .where(eq(roomsTable.id, roomId));
  await db
    .update(usersTable)
    .set({ balance: 10000 })
    .where(eq(usersTable.roomId, roomId));
  await auctionNextPlayer(roomId);
}

export async function placeBid(
  roomId: string,
  userId: number,
  amount: number
) {
  const auction = currentAuctions.get(roomId);
  if (!auction) throw new Error("No active auction");

  const player = await db.query.playersTable.findFirst({
    where: eq(playersTable.id, auction.currentPlayerId),
  });
  if (!player) throw new Error("Player not found");

  const increment = getBidIncrement(player.category);
  const minNextBid = auction.currentBid + increment;
  if (amount < minNextBid)
    throw new Error(`Bid must be at least ${minNextBid}`);

  const user = await db.query.usersTable.findFirst({
    where: and(eq(usersTable.id, userId), eq(usersTable.roomId, roomId)),
  });
  if (!user) throw new Error("User not found");
  if (user.balance < amount) throw new Error("Insufficient balance");
  if (user.squadCount >= 15) throw new Error("Squad is full (max 15 players)");

  const existingTimer = activeTimers.get(roomId);
  if (!existingTimer) throw new Error("Auction timer not active");

  const timeRemaining = Math.max(
    0,
    Math.round((existingTimer.endTime - Date.now()) / 1000)
  );
  const newTime = timeRemaining + 2;

  auction.currentBid = amount;
  auction.highestBidderId = userId;
  currentAuctions.set(roomId, auction);

  clearInterval(existingTimer.timer);
  startTimer(roomId, newTime);

  const state = await getAuctionStateForRoom(roomId);
  if (io) {
    io.to(roomId).emit("bid_placed", {
      roomId,
      userId,
      bidderName: user.name,
      amount,
      timeRemaining: newTime,
    });
    io.to(roomId).emit("auction_state", state);
  }

  return { success: true, currentBid: amount, highestBidderId: userId, timeRemaining: newTime };
}

export async function voteSkip(roomId: string, userId: number) {
  const users = await db.query.usersTable.findMany({
    where: eq(usersTable.roomId, roomId),
  });
  const auction = currentAuctions.get(roomId);
  if (!auction) throw new Error("No active auction");

  if (!skipVotes.has(roomId)) skipVotes.set(roomId, new Set());
  const votes = skipVotes.get(roomId)!;
  votes.add(userId);

  const votedIds = Array.from(votes);
  const total = users.length;
  const voteCount = votes.size;

  if (io) {
    io.to(roomId).emit("skip_votes_updated", { votes: voteCount, total, votedIds });
  }

  if (voteCount >= total) {
    const existing = activeTimers.get(roomId);
    if (existing) {
      clearInterval(existing.timer);
      activeTimers.delete(roomId);
    }
    skipVotes.delete(roomId);
    if (io) io.to(roomId).emit("player_skipped", { playerId: auction.currentPlayerId });
    currentAuctions.delete(roomId);
    setTimeout(() => auctionNextPlayer(roomId), 1500);
  }

  return { votes: voteCount, total, votedIds };
}

export async function getResultsForRoom(roomId: string) {
  const users = await db.query.usersTable.findMany({
    where: eq(usersTable.roomId, roomId),
  });

  const results = [];
  for (const user of users) {
    const squadEntries = await db
      .select({
        id: playersTable.id,
        name: playersTable.name,
        role: playersTable.role,
        country: playersTable.country,
        category: playersTable.category,
        basePrice: playersTable.basePrice,
        powerScore: playersTable.powerScore,
        pricePaid: squadTable.pricePaid,
      })
      .from(squadTable)
      .innerJoin(playersTable, eq(squadTable.playerId, playersTable.id))
      .where(and(eq(squadTable.userId, user.id), eq(squadTable.roomId, roomId)));

    const totalPowerScore = squadEntries.reduce((s, p) => s + p.powerScore, 0);
    results.push({
      userId: user.id,
      name: user.name,
      teamName: user.teamName,
      balance: user.balance,
      squadCount: user.squadCount,
      squad: squadEntries,
      totalPowerScore,
    });
  }

  results.sort((a, b) => b.totalPowerScore - a.totalPowerScore);
  return { roomId, results: results.map((r, i) => ({ ...r, rank: i + 1 })) };
}

// ────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────

function getBidIncrement(category: string): number {
  if (category === "uncapped") return 5;
  if (category === "goat") return 15;
  return 10;
}

async function auctionNextPlayer(roomId: string) {
  const room = await db.query.roomsTable.findFirst({
    where: eq(roomsTable.id, roomId),
  });
  if (!room) return;

  skipVotes.delete(roomId);

  const soldPlayerIds = await db
    .select({ playerId: squadTable.playerId })
    .from(squadTable)
    .where(eq(squadTable.roomId, roomId));

  const soldIds = soldPlayerIds.map((r) => r.playerId);
  const allPlayers = await db.query.playersTable.findMany();
  const unsold = allPlayers.filter((p) => !soldIds.includes(p.id));

  if (unsold.length === 0) {
    await finishAuction(roomId);
    return;
  }

  const player = unsold[Math.floor(Math.random() * unsold.length)];

  currentAuctions.set(roomId, {
    currentPlayerId: player.id,
    currentBid: player.basePrice,
    highestBidderId: null,
  });

  startTimer(roomId, 25);

  if (io) {
    const state = await getAuctionStateForRoom(roomId);
    io.to(roomId).emit("auction_state", state);
    io.to(roomId).emit("skip_votes_updated", { votes: 0, total: 0, votedIds: [] });
  }
}

function startTimer(roomId: string, seconds: number) {
  const existing = activeTimers.get(roomId);
  if (existing) clearInterval(existing.timer);

  const endTime = Date.now() + seconds * 1000;

  const timer = setInterval(async () => {
    const timerData = activeTimers.get(roomId);
    if (!timerData) return;

    const remaining = Math.max(
      0,
      Math.round((timerData.endTime - Date.now()) / 1000)
    );

    if (remaining <= 0) {
      clearInterval(timerData.timer);
      activeTimers.delete(roomId);
      await handleTimerEnd(roomId);
    } else if (io) {
      io.to(roomId).emit("timer_tick", { roomId, timeRemaining: remaining });
    }
  }, 1000);

  activeTimers.set(roomId, { timer, endTime, roomId });
}

async function handleTimerEnd(roomId: string) {
  const auction = currentAuctions.get(roomId);
  if (!auction) return;

  const player = await db.query.playersTable.findFirst({
    where: eq(playersTable.id, auction.currentPlayerId),
  });
  if (!player) return;

  if (auction.highestBidderId !== null) {
    const bidder = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, auction.highestBidderId),
    });
    if (bidder) {
      await db.insert(squadTable).values({
        userId: bidder.id,
        roomId,
        playerId: player.id,
        pricePaid: auction.currentBid,
      });
      await db
        .update(usersTable)
        .set({
          balance: bidder.balance - auction.currentBid,
          squadCount: bidder.squadCount + 1,
        })
        .where(eq(usersTable.id, bidder.id));

      const room = await db.query.roomsTable.findFirst({
        where: eq(roomsTable.id, roomId),
      });
      await db
        .update(roomsTable)
        .set({ playersAuctioned: (room?.playersAuctioned ?? 0) + 1 })
        .where(eq(roomsTable.id, roomId));

      if (io) {
        io.to(roomId).emit("player_sold", {
          player,
          winnerId: bidder.id,
          winnerName: bidder.name,
          pricePaid: auction.currentBid,
        });
      }
      logger.info({ roomId, playerId: player.id, winnerId: bidder.id }, "Player sold");
    }
  } else {
    if (io) io.to(roomId).emit("player_unsold", { player });
    logger.info({ roomId, playerId: player.id }, "Player went unsold");
  }

  currentAuctions.delete(roomId);
  setTimeout(() => auctionNextPlayer(roomId), 3000);
}

async function finishAuction(roomId: string) {
  await db
    .update(roomsTable)
    .set({ status: "finished" })
    .where(eq(roomsTable.id, roomId));
  currentAuctions.delete(roomId);
  skipVotes.delete(roomId);

  if (io) {
    const results = await getResultsForRoom(roomId);
    io.to(roomId).emit("auction_finished", results);
  }
}
