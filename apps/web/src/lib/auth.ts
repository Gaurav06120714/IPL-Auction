export interface SessionData {
  userId: number;
  roomId: string;
  name: string;
  teamName: string;
  isHost: boolean;
}

const SESSION_KEY = 'ipl_auction_session';

export function saveSession(data: SessionData) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function getSession(): SessionData | null {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as SessionData;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
