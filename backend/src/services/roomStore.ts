import { randomUUID } from "node:crypto";
import type { Participant, Room, RoomSnapshot } from "../models/game.js";
import { STARTER_WORDS } from "../seed/starterData.js";

const rooms = new Map<string, Room>();

function now() {
  return new Date().toISOString();
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function generateUniqueCode() {
  let code = generateCode();

  while (rooms.has(code)) {
    code = generateCode();
  }

  return code;
}

function createParticipant(name: string, isHost: boolean): Participant {
  return {
    id: randomUUID(),
    name,
    isHost,
    score: 0,
    joinedAt: now(),
    role: ""
  };
}

function cloneRoom(room: Room) {
  return structuredClone(room);
}

export function listWords() {
  return [...STARTER_WORDS];
}

export function createRoom(playerName: string) {
  const participant = createParticipant(playerName, true);
  const room: Room = {
    code: generateUniqueCode(),
    host: playerName,
    status: "lobby",
    participants: [participant],
    createdAt: now(),
    updatedAt: now(),
    wordIndex: 0,
    secretWord: "",
    canvasData: "",
    guesses: []
  };

  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function joinRoom(code: string, playerName: string) {
  if (code.trim() === "") {
    return "emptyCode" as const;
  }

  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  if (room.participants.some((p) => p.name === playerName)) {
    return "duplicateName" as const;
  }

  const participant = createParticipant(playerName, false);
  room.participants.push(participant);
  room.updatedAt = now();
  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function getRoom(code: string) {
  const room = rooms.get(code);
  return room ? cloneRoom(room) : null;
}

export function saveRoom(room: Room) {
  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
  return getRoom(room.code);
}

export function toRoomSnapshot(room: Room, viewerName?: string): RoomSnapshot {
  const isDrawer = !!viewerName &&
    room.participants.some(p => p.name === viewerName && p.role === "drawer");

  return {
    code: room.code,
    host: room.host,
    status: room.status,
    participants: room.participants.map((participant) => ({ ...participant })),
    availableWords: listWords(),
    canvasData: room.canvasData,
    guesses: room.guesses.map(g => ({ ...g })),
    ...(isDrawer && room.status === "playing" ? { secretWord: room.secretWord } : {})
  };
}

export function startGame(code: string, playerName: string): null | "notHost" | "notEnoughPlayers" | "alreadyStarted" | RoomSnapshot {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  if (playerName !== room.host) {
    return "notHost" as const;
  }

  if (room.participants.length < 2) {
    return "notEnoughPlayers" as const;
  }

  if (room.status === "playing") {
    return "alreadyStarted" as const;
  }

  room.status = "playing";
  room.participants.forEach(p => { p.role = p.isHost ? "drawer" : "guesser"; });
  room.secretWord = STARTER_WORDS[room.wordIndex % STARTER_WORDS.length];
  room.wordIndex += 1;
  saveRoom(room);

  return toRoomSnapshot(room);
}

export function updateCanvas(code: string, canvasData: string): RoomSnapshot | null {
  const room = rooms.get(code);
  if (!room) return null;
  room.canvasData = canvasData;
  saveRoom(room);
  return toRoomSnapshot(room);
}

export function submitGuess(
  code: string,
  playerName: string,
  guess: string
): RoomSnapshot | null | "roundOver" {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.status === "result") return "roundOver" as const;
  const trimmed = guess.trim();
  const isCorrect = trimmed.toLowerCase() === room.secretWord.toLowerCase();
  if (isCorrect) {
    const participant = room.participants.find(p => p.name === playerName);
    if (participant) participant.score += 100;
    room.status = "result";
    // INVARIANT: do not clear guesses or canvasData — Scenario 4 result screen depends on both
  }
  room.guesses.push({ playerName, text: trimmed, isCorrect });
  saveRoom(room);
  return toRoomSnapshot(room);
}
