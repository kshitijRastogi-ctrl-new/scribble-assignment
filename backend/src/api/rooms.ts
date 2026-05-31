import { Router } from "express";
import {
  createRoomSchema,
  HttpError,
  joinRoomSchema,
  roomCodeParamsSchema,
  roomViewerQuerySchema,
  startGameSchema
} from "./schemas.js";
import { createRoom, getRoom, joinRoom, startGame, toRoomSnapshot } from "../services/roomStore.js";

export function createRoomsRouter() {
  const router = Router();

  router.post("/", (request, response, next) => {
    try {
      const parsed = createRoomSchema.safeParse(request.body);
      if (!parsed.success) {
        return next(new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request payload"));
      }
      const result = createRoom(parsed.data.playerName);

      response.status(201).json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room, result.participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/join", (request, response, next) => {
    try {
      const parsedCode = roomCodeParamsSchema.safeParse(request.params);
      if (!parsedCode.success) {
        return next(new HttpError(400, "Room code cannot be empty"));
      }

      const parsedBody = joinRoomSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return next(new HttpError(400, parsedBody.error.issues[0]?.message ?? "Invalid request payload"));
      }

      const code = parsedCode.data.code.toUpperCase();
      const { playerName } = parsedBody.data;

      const result = joinRoom(code, playerName);

      if (result === "emptyCode") {
        return next(new HttpError(400, "Room code cannot be empty"));
      }
      if (result === "duplicateName") {
        return next(new HttpError(409, "Name already taken in this room"));
      }
      if (result === null) {
        return next(new HttpError(404, "Room not found"));
      }

      response.json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room, result.participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:code", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = roomViewerQuerySchema.parse(request.query);
      const room = getRoom(code.toUpperCase());

      if (!room) {
        throw new HttpError(404, "Room not found");
      }

      response.json({
        room: toRoomSnapshot(room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/start", (request, response, next) => {
    try {
      const parsedCode = roomCodeParamsSchema.safeParse(request.params);
      if (!parsedCode.success) {
        return next(new HttpError(400, "Room code cannot be empty"));
      }

      const parsedBody = startGameSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return next(new HttpError(400, parsedBody.error.issues[0]?.message ?? "Invalid request payload"));
      }

      const code = parsedCode.data.code.toUpperCase();
      const { playerName } = parsedBody.data;

      const result = startGame(code, playerName);

      if (result === null) {
        return next(new HttpError(404, "Room not found"));
      }
      if (result === "notHost") {
        return next(new HttpError(403, "Only the host can start the game"));
      }
      if (result === "notEnoughPlayers") {
        return next(new HttpError(400, "Need at least 2 players to start"));
      }

      response.json({ room: result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
