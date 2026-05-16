// Session management — stores user identity in localStorage
// Replaces @workspace lib/auth.ts

export interface SessionData {
  userId: number;
  roomId: string;
  name: string;
  teamName: string;
  isHost: boolean;
}

const SESSION_KEY = "ipl_auction_session";

export function saveSession(data: SessionData): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function getSession(): SessionData | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
