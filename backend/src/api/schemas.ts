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
  player: z.string().optional()
});

export const startGameSchema = z.object({
  playerName: z.string().trim().min(1, { message: "Name cannot be empty" })
});

export const canvasSchema = z.object({
  canvasData: z.string()
});

export const guessSchema = z.object({
  playerName: z.string().trim().min(1, { message: "Name cannot be empty" }),
  guess: z.string()
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
