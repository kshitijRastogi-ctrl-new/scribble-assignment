import { Router } from "express";
import {
  canvasSchema,
  createRoomSchema,
  guessSchema,
  HttpError,
  joinRoomSchema,
  restartSchema,
  roomCodeParamsSchema,
  roomViewerQuerySchema,
  startGameSchema
} from "./schemas.js";
import { createRoom, getRoom, joinRoom, restartRoom, startGame, submitGuess, toRoomSnapshot, updateCanvas } from "../services/roomStore.js";

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
      const { player } = roomViewerQuerySchema.parse(request.query);
      const room = getRoom(code.toUpperCase());

      if (!room) {
        throw new HttpError(404, "Room not found");
      }

      response.json({
        room: toRoomSnapshot(room, player)
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
      if (result === "alreadyStarted") {
        return next(new HttpError(400, "Game already started"));
      }

      response.json({ room: result });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/canvas", (request, response, next) => {
    try {
      const parsedCode = roomCodeParamsSchema.safeParse(request.params);
      if (!parsedCode.success) {
        return next(new HttpError(400, "Room code cannot be empty"));
      }

      const parsedBody = canvasSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return next(new HttpError(400, "Invalid canvas data"));
      }

      const code = parsedCode.data.code.toUpperCase();
      const { canvasData } = parsedBody.data;

      const result = updateCanvas(code, canvasData);

      if (result === null) {
        return next(new HttpError(404, "Room not found"));
      }

      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/guess", (request, response, next) => {
    try {
      const parsedCode = roomCodeParamsSchema.safeParse(request.params);
      if (!parsedCode.success) {
        return next(new HttpError(400, "Room code cannot be empty"));
      }

      const parsedBody = guessSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return next(new HttpError(400, parsedBody.error.issues[0]?.message ?? "Invalid request payload"));
      }

      const code = parsedCode.data.code.toUpperCase();
      const { playerName, guess } = parsedBody.data;

      const result = submitGuess(code, playerName, guess.trim());

      if (result === null) {
        return next(new HttpError(404, "Room not found"));
      }
      if (result === "roundOver") {
        return next(new HttpError(400, "Round already over"));
      }

      response.json({ room: result });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/restart", (request, response, next) => {
    try {
      const parsedCode = roomCodeParamsSchema.safeParse(request.params);
      if (!parsedCode.success) {
        return next(new HttpError(400, "Room code cannot be empty"));
      }

      const parsedBody = restartSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return next(new HttpError(400, parsedBody.error.issues[0]?.message ?? "Invalid request payload"));
      }

      const code = parsedCode.data.code.toUpperCase();
      const { playerName } = parsedBody.data;

      const result = restartRoom(code, playerName);

      if (result === null) {
        return next(new HttpError(404, "Room not found"));
      }
      if (result === "notHost") {
        return next(new HttpError(403, "Only the host can restart"));
      }
      if (result === "roundNotOver") {
        return next(new HttpError(400, "Round not over"));
      }

      response.json({ room: result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
