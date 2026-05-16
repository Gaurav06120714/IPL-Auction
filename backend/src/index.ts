// Load env vars first — before anything else
import "./config/env.js";
import { env } from "./config/env.js";

import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import app from "./app.js";
import { logger } from "./config/logger.js";
import { setupSockets } from "./sockets/socket-handler.js";

const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io",
});

setupSockets(io);

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "🚀 Server listening");
});
