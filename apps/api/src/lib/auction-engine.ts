import { db } from "@workspace/db";
import { roomsTable, usersTable, playersTable, squadTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { Server as SocketServer } from "socket.io";
import { logger } from "./logger.js";

interface AuctionTimer {
  timer: NodeJS.Timeout;
  endTime: number;
  roomId: string;
}

const activeTimers = new Map<string, AuctionTimer>();
const currentAuctions = new Map<string, {
  currentPlayerId: number;
  currentBid: number;
  highestBidderId: number | null;
  timeRemaining: number;
}>();

const skipVotes = new Map<string, Set<number>>();

let ioInstance: SocketServer | null = null;

export function setSocketServer(io: SocketServer) {
  ioInstance = io;
}

function getBidIncrement(category: string): number {
  if (category === "uncapped") return 5;
  if (category === "goat") return 15;
  return 10;
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
  const timer = activeTimers.get(roomId);

  let currentPlayer = null;
  let currentBid = null;
  let highestBidderId = null;
  let highestBidderName = null;
  let timeRemaining = null;

  if (auction) {
    const player = await db.query.playersTable.findFirst({
      where: eq(playersTable.id, auction.currentPlayerId),
    });
    currentPlayer = player || null;
    currentBid = auction.currentBid;
    highestBidderId = auction.highestBidderId;
    if (auction.highestBidderId) {
      const bidder = users.find(u => u.id === auction.highestBidderId);
      highestBidderName = bidder?.name || null;
    }
    if (timer) {
      timeRemaining = Math.max(0, Math.round((timer.endTime - Date.now()) / 1000));
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
    users: users.map(u => ({
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
  await db.update(roomsTable).set({ status: "active" }).where(eq(roomsTable.id, roomId));
  await db.update(usersTable).set({ balance: 10000 }).where(eq(usersTable.roomId, roomId));
  await auctionNextPlayer(roomId);
}

export async function auctionNextPlayer(roomId: string) {
  const room = await db.query.roomsTable.findFirst({ where: eq(roomsTable.id, roomId) });
  if (!room) return;

  skipVotes.delete(roomId);

  const soldPlayerIds = await db.select({ playerId: squadTable.playerId })
    .from(squadTable)
    .where(eq(squadTable.roomId, roomId));

  const soldIds = soldPlayerIds.map(r => r.playerId);
  const allPlayers = await db.query.playersTable.findMany();
  const unsoldPlayers = allPlayers.filter(p => !soldIds.includes(p.id));

  if (unsoldPlayers.length === 0) {
    await finishAuction(roomId);
    return;
  }

  const randomIndex = Math.floor(Math.random() * unsoldPlayers.length);
  const player = unsoldPlayers[randomIndex];

  currentAuctions.set(roomId, {
    currentPlayerId: player.id,
    currentBid: player.basePrice,
    highestBidderId: null,
    timeRemaining: 25,
  });

  startTimer(roomId, 25);

  if (ioInstance) {
    const state = await getAuctionStateForRoom(roomId);
    ioInstance.to(roomId).emit("auction_state", state);
    ioInstance.to(roomId).emit("skip_votes_updated", { votes: 0, total: 0, votedIds: [] });
  }
}

function startTimer(roomId: string, seconds: number) {
  const existing = activeTimers.get(roomId);
  if (existing) clearInterval(existing.timer);

  const endTime = Date.now() + seconds * 1000;

  const timer = setInterval(async () => {
    const timerData = activeTimers.get(roomId);
    if (!timerData) return;

    const remaining = Math.max(0, Math.round((timerData.endTime - Date.now()) / 1000));

    if (remaining <= 0) {
      clearInterval(timerData.timer);
      activeTimers.delete(roomId);
      await handleTimerEnd(roomId);
    } else {
      if (ioInstance) {
        ioInstance.to(roomId).emit("timer_tick", { roomId, timeRemaining: remaining });
      }
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

      await db.update(usersTable)
        .set({
          balance: bidder.balance - auction.currentBid,
          squadCount: bidder.squadCount + 1,
        })
        .where(eq(usersTable.id, bidder.id));

      const room = await db.query.roomsTable.findFirst({ where: eq(roomsTable.id, roomId) });
      await db.update(roomsTable)
        .set({ playersAuctioned: (room?.playersAuctioned ?? 0) + 1 })
        .where(eq(roomsTable.id, roomId));

      if (ioInstance) {
        ioInstance.to(roomId).emit("player_sold", {
          player,
          winnerId: bidder.id,
          winnerName: bidder.name,
          pricePaid: auction.currentBid,
        });
      }

      logger.info({ roomId, playerId: player.id, winnerId: bidder.id }, "Player sold");
    }
  } else {
    if (ioInstance) {
      ioInstance.to(roomId).emit("player_unsold", { player });
    }
    logger.info({ roomId, playerId: player.id }, "Player went unsold");
  }

  currentAuctions.delete(roomId);

  setTimeout(async () => {
    await auctionNextPlayer(roomId);
  }, 3000);
}

export async function voteSkip(roomId: string, userId: number) {
  const users = await db.query.usersTable.findMany({
    where: eq(usersTable.roomId, roomId),
  });

  const auction = currentAuctions.get(roomId);
  if (!auction) throw new Error("No active auction");

  if (!skipVotes.has(roomId)) {
    skipVotes.set(roomId, new Set());
  }

  const votes = skipVotes.get(roomId)!;
  votes.add(userId);

  const votedIds = Array.from(votes);
  const total = users.length;
  const voteCount = votes.size;

  if (ioInstance) {
    ioInstance.to(roomId).emit("skip_votes_updated", {
      votes: voteCount,
      total,
      votedIds,
    });
  }

  if (voteCount >= total) {
    const existingTimer = activeTimers.get(roomId);
    if (existingTimer) {
      clearInterval(existingTimer.timer);
      activeTimers.delete(roomId);
    }
    skipVotes.delete(roomId);

    if (ioInstance) {
      ioInstance.to(roomId).emit("player_skipped", { playerId: auction.currentPlayerId });
    }

    currentAuctions.delete(roomId);

    setTimeout(async () => {
      await auctionNextPlayer(roomId);
    }, 1500);
  }

  return { votes: voteCount, total, votedIds };
}

export async function placeBid(roomId: string, userId: number, amount: number) {
  const auction = currentAuctions.get(roomId);
  if (!auction) throw new Error("No active auction");

  const player = await db.query.playersTable.findFirst({
    where: eq(playersTable.id, auction.currentPlayerId),
  });
  if (!player) throw new Error("Player not found");

  const increment = getBidIncrement(player.category);
  const minNextBid = auction.currentBid + increment;

  if (amount < minNextBid) {
    throw new Error(`Bid must be at least ${minNextBid}`);
  }

  const user = await db.query.usersTable.findFirst({
    where: and(eq(usersTable.id, userId), eq(usersTable.roomId, roomId)),
  });
  if (!user) throw new Error("User not found");

  if (user.balance < amount) throw new Error("Insufficient balance");
  if (user.squadCount >= 15) throw new Error("Squad is full (max 15 players)");

  const existingTimer = activeTimers.get(roomId);
  if (!existingTimer) throw new Error("Auction timer not active");

  const timeRemaining = Math.max(0, Math.round((existingTimer.endTime - Date.now()) / 1000));
  const newTime = timeRemaining + 2;

  auction.currentBid = amount;
  auction.highestBidderId = userId;
  currentAuctions.set(roomId, auction);

  clearInterval(existingTimer.timer);

  const newEndTime = Date.now() + newTime * 1000;
  const newTimer = setInterval(async () => {
    const timerData = activeTimers.get(roomId);
    if (!timerData) return;
    const remaining = Math.max(0, Math.round((timerData.endTime - Date.now()) / 1000));
    if (remaining <= 0) {
      clearInterval(timerData.timer);
      activeTimers.delete(roomId);
      await handleTimerEnd(roomId);
    } else {
      if (ioInstance) {
        ioInstance.to(roomId).emit("timer_tick", { roomId, timeRemaining: remaining });
      }
    }
  }, 1000);

  activeTimers.set(roomId, { timer: newTimer, endTime: newEndTime, roomId });

  const state = await getAuctionStateForRoom(roomId);

  if (ioInstance) {
    ioInstance.to(roomId).emit("bid_placed", {
      roomId,
      userId,
      bidderName: user.name,
      amount,
      timeRemaining: newTime,
    });
    ioInstance.to(roomId).emit("auction_state", state);
  }

  return {
    success: true,
    currentBid: amount,
    highestBidderId: userId,
    timeRemaining: newTime,
  };
}

async function finishAuction(roomId: string) {
  await db.update(roomsTable).set({ status: "finished" }).where(eq(roomsTable.id, roomId));
  currentAuctions.delete(roomId);
  skipVotes.delete(roomId);

  if (ioInstance) {
    const results = await getResultsForRoom(roomId);
    ioInstance.to(roomId).emit("auction_finished", results);
  }
}

export async function getResultsForRoom(roomId: string) {
  const users = await db.query.usersTable.findMany({
    where: eq(usersTable.roomId, roomId),
  });

  const results = [];
  for (const user of users) {
    const squadEntries = await db.select({
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

    const totalPowerScore = squadEntries.reduce((sum, p) => sum + p.powerScore, 0);

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
  const ranked = results.map((r, idx) => ({ ...r, rank: idx + 1 }));

  return { roomId, results: ranked };
}
