import { z } from "zod";

export const createRoomSchema = z.object({
  playerName: z.string().trim().min(1, { message: "Name cannot be empty" })
});

export const joinRoomSchema = z.object({
  playerName: z.string().trim().min(1, { message: "Name cannot be empty" })
});

export const roomCodeParamsSchema = z.object({
  code: z.string().trim().min(1, { message: "Room code cannot be empty" })
});

export const roomViewerQuerySchema = z.object({
  participantId: z.string().optional()
});

export const startGameSchema = z.object({
  playerName: z.string().trim().min(1, { message: "Name cannot be empty" })
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
