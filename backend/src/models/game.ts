export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "playing";

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  joinedAt: string;
}

export interface Room {
  code: string;
  host: string;
  status: RoomStatus;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshot {
  code: string;
  host: string;
  status: RoomStatus;
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
