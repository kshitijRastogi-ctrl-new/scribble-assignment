# API Contracts: Room Setup & Lobby

**Branch**: `001-room-setup-lobby` | **Date**: 2026-05-30

All endpoints are mounted at the backend root (no `/api` prefix).
All request and response bodies are `application/json`.
All error responses use the `{ "error": "..." }` shape.

---

## POST /rooms (updated)

Creates a new room. Creator is automatically the host.

### Request

```json
{ "playerName": "Alice" }
```

- `playerName` — required string; trimmed server-side; rejected if empty after trim.

### Response 201 — Success

```json
{
  "participantId": "uuid-v4",
  "room": {
    "code": "ABCD",
    "host": "Alice",
    "status": "lobby",
    "participants": [
      { "id": "uuid-v4", "name": "Alice", "isHost": true, "score": 0, "joinedAt": "ISO8601" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

### Response 400 — Empty name

```json
{ "error": "Name cannot be empty" }
```

---

## POST /rooms/:code/join (updated)

Joins an existing room by code.

### Request

```json
{ "playerName": "Bob" }
```

- `playerName` — required string; trimmed server-side; rejected if empty after trim.
- `:code` — path param; trimmed and uppercased server-side before lookup.

### Response 200 — Success

```json
{
  "participantId": "uuid-v4",
  "room": {
    "code": "ABCD",
    "host": "Alice",
    "status": "lobby",
    "participants": [
      { "id": "uuid-v4", "name": "Alice", "isHost": true,  "score": 0, "joinedAt": "ISO8601" },
      { "id": "uuid-v4", "name": "Bob",   "isHost": false, "score": 0, "joinedAt": "ISO8601" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

### Response 400 — Empty name

```json
{ "error": "Name cannot be empty" }
```

### Response 400 — Empty code

```json
{ "error": "Room code cannot be empty" }
```

### Response 404 — Room not found

```json
{ "error": "Room not found" }
```

### Response 409 — Duplicate name

```json
{ "error": "Name already taken in this room" }
```

---

## GET /rooms/:code (updated — error key change only)

Returns the current room snapshot for polling.

### Response 200 — Success

```json
{
  "room": {
    "code": "ABCD",
    "host": "Alice",
    "status": "lobby",
    "participants": [
      { "id": "uuid-v4", "name": "Alice", "isHost": true,  "score": 0, "joinedAt": "ISO8601" },
      { "id": "uuid-v4", "name": "Bob",   "isHost": false, "score": 0, "joinedAt": "ISO8601" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

### Response 404 — Room not found

```json
{ "error": "Room not found" }
```

---

## POST /rooms/:code/start (new)

Starts the game. Host-only. Requires ≥2 participants.

### Request

```json
{ "playerName": "Alice" }
```

- `playerName` — must match `room.host`; checked server-side.

### Response 200 — Success

```json
{
  "room": {
    "code": "ABCD",
    "host": "Alice",
    "status": "playing",
    "participants": [
      { "id": "uuid-v4", "name": "Alice", "isHost": true,  "score": 0, "joinedAt": "ISO8601" },
      { "id": "uuid-v4", "name": "Bob",   "isHost": false, "score": 0, "joinedAt": "ISO8601" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

### Response 400 — Not enough players

```json
{ "error": "Need at least 2 players to start" }
```

### Response 403 — Not the host

```json
{ "error": "Only the host can start the game" }
```

### Response 404 — Room not found

```json
{ "error": "Room not found" }
```

---

## Error Handler (global — updated)

The global `errorHandler` in `backend/src/api/router.ts` is updated to return
`{ "error": "..." }` instead of `{ "message": "..." }` for consistency.

Zod validation errors return:

```json
{ "error": "Invalid request payload" }
```
