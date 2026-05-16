import { Router } from "express";
import { db } from "@workspace/db";
import { roomsTable, usersTable, squadTable, playersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  CreateRoomBody,
  JoinRoomBody,
  JoinRoomParams,
  GetRoomParams,
  StartAuctionBody,
  StartAuctionParams,
  PlaceBidBody,
  PlaceBidParams,
  GetAuctionStateParams,
  GetUserSquadParams,
  GetResultsParams,
} from "@workspace/api-zod";
import {
  startAuction,
  placeBid,
  getAuctionStateForRoom,
  getResultsForRoom,
} from "../lib/auction-engine.js";

const router = Router();

router.post("/rooms", async (req, res) => {
  const body = CreateRoomBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { hostName, teamName } = body.data;
  const roomId = nanoid(8).toUpperCase();

  await db.insert(roomsTable).values({ id: roomId });

  const [user] = await db.insert(usersTable).values({
    name: hostName,
    roomId,
    teamName,
    balance: 10000,
    squadCount: 0,
    isHost: true,
  }).returning();

  res.status(201).json({
    roomId,
    status: "waiting",
    users: [{
      id: user.id,
      name: user.name,
      teamName: user.teamName,
      balance: user.balance,
      squadCount: user.squadCount,
      isHost: user.isHost,
    }],
  });
});

router.get("/rooms/:roomId", async (req, res) => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid room ID" });
    return;
  }

  const room = await db.query.roomsTable.findFirst({
    where: eq(roomsTable.id, params.data.roomId),
  });

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const users = await db.query.usersTable.findMany({
    where: eq(usersTable.roomId, room.id),
  });

  res.json({
    roomId: room.id,
    status: room.status,
    users: users.map(u => ({
      id: u.id,
      name: u.name,
      teamName: u.teamName,
      balance: u.balance,
      squadCount: u.squadCount,
      isHost: u.isHost,
    })),
  });
});

router.post("/rooms/:roomId/join", async (req, res) => {
  const params = JoinRoomParams.safeParse(req.params);
  const body = JoinRoomBody.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { roomId } = params.data;
  const { name, teamName } = body.data;

  const room = await db.query.roomsTable.findFirst({
    where: eq(roomsTable.id, roomId),
  });

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  if (room.status !== "waiting") {
    res.status(400).json({ error: "Auction has already started" });
    return;
  }

  const existingUsers = await db.query.usersTable.findMany({
    where: eq(usersTable.roomId, roomId),
  });

  if (existingUsers.length >= 10) {
    res.status(400).json({ error: "Room is full (max 10 players)" });
    return;
  }

  const teamTaken = existingUsers.some(u => u.teamName === teamName);
  if (teamTaken) {
    res.status(400).json({ error: `Team ${teamName} is already taken` });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    name,
    roomId,
    teamName,
    balance: 10000,
    squadCount: 0,
    isHost: false,
  }).returning();

  res.json({
    userId: user.id,
    roomId,
    name: user.name,
    teamName: user.teamName,
    isHost: false,
  });
});

router.post("/rooms/:roomId/start", async (req, res) => {
  const params = StartAuctionParams.safeParse(req.params);
  const body = StartAuctionBody.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { roomId } = params.data;
  const { userId } = body.data;

  const room = await db.query.roomsTable.findFirst({
    where: eq(roomsTable.id, roomId),
  });

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  if (room.status !== "waiting") {
    res.status(400).json({ error: "Auction already started" });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: and(eq(usersTable.id, userId), eq(usersTable.roomId, roomId)),
  });

  if (!user || !user.isHost) {
    res.status(403).json({ error: "Only the host can start the auction" });
    return;
  }

  await startAuction(roomId);

  res.json({ success: true, message: "Auction started" });
});

router.post("/rooms/:roomId/bid", async (req, res) => {
  const params = PlaceBidParams.safeParse(req.params);
  const body = PlaceBidBody.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { roomId } = params.data;
  const { userId, amount } = body.data;

  try {
    const result = await placeBid(roomId, userId, amount);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/rooms/:roomId/state", async (req, res) => {
  const params = GetAuctionStateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid room ID" });
    return;
  }

  const state = await getAuctionStateForRoom(params.data.roomId);
  if (!state) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json(state);
});

router.get("/rooms/:roomId/users/:userId/squad", async (req, res) => {
  const params = GetUserSquadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const { roomId, userId } = params.data;

  const user = await db.query.usersTable.findFirst({
    where: and(eq(usersTable.id, userId), eq(usersTable.roomId, roomId)),
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

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

  res.json({
    userId: user.id,
    name: user.name,
    teamName: user.teamName,
    balance: user.balance,
    squadCount: user.squadCount,
    squad: squadEntries,
    totalPowerScore,
  });
});

router.get("/rooms/:roomId/results", async (req, res) => {
  const params = GetResultsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid room ID" });
    return;
  }

  const results = await getResultsForRoom(params.data.roomId);
  res.json(results);
});

export default router;
