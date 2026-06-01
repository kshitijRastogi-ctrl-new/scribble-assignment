export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  joinedAt: string;
  role: string;
}

export interface RoomSnapshot {
  code: string;
  host: string;
  status: "lobby" | "playing" | "result";
  participants: Participant[];
  availableWords: string[];
  canvasData: string;
  guesses: Guess[];
  secretWord?: string;
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}

export interface Guess {
  playerName: string;
  text:       string;
  isCorrect:  boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({ error: "Request failed" }))) as {
      error?: string;
    };

    throw new Error(errorBody.error ?? "Request failed");
  }

  return (await response.json()) as T;
}

export const api = {
  createRoom(playerName: string) {
    return request<RoomSessionResponse>("/rooms", {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  joinRoom(code: string, playerName: string) {
    return request<RoomSessionResponse>(`/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  fetchRoom(code: string, playerName?: string) {
    const query = playerName ? `?player=${encodeURIComponent(playerName)}` : "";
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}${query}`);
  },
  startGame(code: string, playerName: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/start`, {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  updateCanvas(code: string, canvasData: string) {
    return request<{ ok: boolean }>(`/rooms/${encodeURIComponent(code)}/canvas`, {
      method: "POST",
      body: JSON.stringify({ canvasData })
    });
  },
  submitGuess(code: string, playerName: string, guess: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/guess`, {
      method: "POST",
      body: JSON.stringify({ playerName, guess })
    });
  }
};
