// ─────────────────────────────────────────────────────
// Central API service — all HTTP calls to the backend.
// Uses Vite proxy: /api → http://localhost:8080/api
// ─────────────────────────────────────────────────────

const BASE = "/api";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

// ── Types ─────────────────────────────────────────────

export interface RoomUser {
  id: number;
  name: string;
  teamName: string;
  balance: number;
  squadCount: number;
  isHost: boolean;
}

export interface Player {
  id: number;
  name: string;
  role: string;
  country: string;
  category: "goat" | "capped" | "uncapped";
  basePrice: number;
  powerScore: number;
}

export interface AuctionState {
  roomId: string;
  status: "waiting" | "active" | "finished";
  currentPlayer: Player | null;
  currentBid: number | null;
  highestBidderId: number | null;
  highestBidderName: string | null;
  timeRemaining: number | null;
  playersAuctioned: number;
  totalPlayers: number;
  users: RoomUser[];
}

export interface SquadPlayer extends Player {
  pricePaid: number;
}

export interface SquadResponse {
  userId: number;
  name: string;
  teamName: string;
  balance: number;
  squadCount: number;
  squad: SquadPlayer[];
  totalPowerScore: number;
}

export interface ResultEntry {
  rank: number;
  userId: number;
  name: string;
  teamName: string;
  totalPowerScore: number;
  squadCount: number;
  balance: number;
  squad: SquadPlayer[];
}

// ── API calls ─────────────────────────────────────────

export const api = {
  // Room management
  createRoom: (hostName: string, teamName: string) =>
    request<{ roomId: string; status: string; users: RoomUser[] }>(
      "POST", "/rooms", { hostName, teamName }
    ),

  getRoom: (roomId: string) =>
    request<{ roomId: string; status: string; users: RoomUser[] }>(
      "GET", `/rooms/${roomId}`
    ),

  joinRoom: (roomId: string, name: string, teamName: string) =>
    request<{ userId: number; roomId: string; name: string; teamName: string; isHost: boolean }>(
      "POST", `/rooms/${roomId}/join`, { name, teamName }
    ),

  // Auction actions
  startAuction: (roomId: string, userId: number) =>
    request<{ success: boolean; message: string }>(
      "POST", `/rooms/${roomId}/start`, { userId }
    ),

  placeBid: (roomId: string, userId: number, amount: number) =>
    request<{ success: boolean; currentBid: number; highestBidderId: number; timeRemaining: number }>(
      "POST", `/rooms/${roomId}/bid`, { userId, amount }
    ),

  // Auction state
  getAuctionState: (roomId: string) =>
    request<AuctionState>("GET", `/rooms/${roomId}/state`),

  getUserSquad: (roomId: string, userId: number) =>
    request<SquadResponse>("GET", `/rooms/${roomId}/users/${userId}/squad`),

  getResults: (roomId: string) =>
    request<{ roomId: string; results: ResultEntry[] }>(
      "GET", `/rooms/${roomId}/results`
    ),

  healthCheck: () =>
    request<{ status: string }>("GET", "/healthz"),
};