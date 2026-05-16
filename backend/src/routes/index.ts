import { Router } from "express";
import healthRouter from "./health.routes.js";
import roomsRouter from "./rooms.routes.js";

const router = Router();

router.use(healthRouter);
router.use(roomsRouter);

export default router;
