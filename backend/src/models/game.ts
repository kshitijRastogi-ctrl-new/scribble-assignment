export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "playing" | "result";

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  joinedAt: string;
  role: string;
}

export interface Room {
  code: string;
  host: string;
  status: RoomStatus;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
  wordIndex: number;
  secretWord: string;
}

export interface RoomSnapshot {
  code: string;
  host: string;
  status: RoomStatus;
  participants: Participant[];
  availableWords: string[];
  secretWord?: string;
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
