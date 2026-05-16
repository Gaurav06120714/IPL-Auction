import type { Server as SocketServer } from "socket.io";
import { db } from "../db/index.js";
import { usersTable } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../config/logger.js";
import { setSocketServer, voteSkip } from "../services/auction-engine.js";

export function setupSockets(io: SocketServer) {
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
}
