import { createServer } from "http";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { Server as SocketServer } from "socket.io";
import { setSocketServer, voteSkip } from "./lib/auction-engine.js";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io",
});

setSocketServer(io);

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Socket connected");

  socket.on("join_room", async ({ roomId, userId }: { roomId: string; userId: number }) => {
    socket.join(roomId);
    logger.info({ socketId: socket.id, roomId, userId }, "User joined socket room");
    try {
      await db.update(usersTable).set({ socketId: socket.id }).where(eq(usersTable.id, userId));
    } catch (err) {
      logger.error({ err }, "Failed to update socket ID");
    }
    io.to(roomId).emit("room_updated", { roomId });
  });

  socket.on("vote_skip", async ({ roomId, userId }: { roomId: string; userId: number }) => {
    try {
      await voteSkip(roomId, userId);
      logger.info({ roomId, userId }, "Skip vote cast");
    } catch (err: any) {
      socket.emit("skip_error", { error: err.message });
    }
  });

  socket.on("send_chat", ({ roomId, userId, name, message }: {
    roomId: string;
    userId: number;
    name: string;
    message: string;
  }) => {
    if (!message?.trim()) return;
    const trimmed = message.trim().slice(0, 200);
    io.to(roomId).emit("chat_message", {
      id: `${Date.now()}-${userId}`,
      userId,
      name,
      message: trimmed,
      timestamp: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Socket disconnected");
  });
});

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});
