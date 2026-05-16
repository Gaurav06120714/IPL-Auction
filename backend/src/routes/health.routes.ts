import { Router } from "express";
import { z } from "zod";

const router = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;

// ────────────────────────────────────────────────────────────
// Shared Zod validation schemas (inlined from @workspace/api-zod)
// ────────────────────────────────────────────────────────────

export const CreateRoomBody = z.object({ hostName: z.string().min(1), teamName: z.string().min(1) });
export const GetRoomParams = z.object({ roomId: z.coerce.string() });
export const JoinRoomParams = z.object({ roomId: z.coerce.string() });
export const JoinRoomBody = z.object({ name: z.string().min(1), teamName: z.string().min(1) });
export const StartAuctionParams = z.object({ roomId: z.coerce.string() });
export const StartAuctionBody = z.object({ userId: z.number() });
export const PlaceBidParams = z.object({ roomId: z.coerce.string() });
export const PlaceBidBody = z.object({ userId: z.number(), amount: z.number() });
export const GetAuctionStateParams = z.object({ roomId: z.coerce.string() });
export const GetUserSquadParams = z.object({ roomId: z.coerce.string(), userId: z.coerce.number() });
export const GetResultsParams = z.object({ roomId: z.coerce.string() });
