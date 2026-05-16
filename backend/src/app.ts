import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./config/logger.js";
import router from "./routes/index.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Global error handler — must be LAST
app.use(errorMiddleware);

export default app;
