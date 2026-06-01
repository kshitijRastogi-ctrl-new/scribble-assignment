# API Contract: Result, Restart & Final Validation

**Branch**: `004-result-restart` | **Date**: 2026-06-01

---

## New Endpoint

### POST /rooms/:code/restart

Resets all round-specific state and returns the room to `"lobby"` status. Only the
host may trigger this; the round must be in `"result"` status.

**Request**

```http
POST /rooms/:code/restart
Content-Type: application/json

{
  "playerName": "Alice"
}
```

| Field | Type | Validation |
|-------|------|------------|
| `playerName` | `string` | Required. Trimmed. Min length 1. (Zod: `restartSchema`) |
| `:code` | URL param | Required. Non-empty. (Zod: `roomCodeParamsSchema`) |

**Responses**

| Status | Body | Condition |
|--------|------|-----------|
| 200 OK | `{ "room": RoomSnapshot }` | Restart succeeded; room is now `"lobby"` |
| 400 Bad Request | `{ "error": "Round not over" }` | `room.status !== "result"` |
| 403 Forbidden | `{ "error": "Only the host can restart" }` | `playerName !== room.host` |
| 404 Not Found | `{ "error": "Room not found" }` | Room code does not exist |

**Response body — 200 OK (example)**

```json
{
  "room": {
    "code": "ABCD",
    "host": "Alice",
    "status": "lobby",
    "participants": [
      { "id": "...", "name": "Alice", "isHost": true, "score": 0, "joinedAt": "...", "role": "" },
      { "id": "...", "name": "Bob",   "isHost": false, "score": 0, "joinedAt": "...", "role": "" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "canvasData": "",
    "guesses": [],
    "secretWord": ""
  }
}
```

Note: `secretWord` is `""` (reset) and status is `"lobby"`, so the visibility rule
means `secretWord` is absent from the snapshot despite being in the response body.
The field is absent in the JSON when status is `"lobby"` — the spread guard in
`toRoomSnapshot` omits it.

**Implementation pattern** — mirrors `POST /rooms/:code/start`:

```
safeParse(params, roomCodeParamsSchema) → 400 on failure
safeParse(body, restartSchema)          → 400 on failure
restartRoom(code, playerName)           → map discriminants:
  null         → 404 "Room not found"
  "notHost"    → 403 "Only the host can restart"
  "roundNotOver" → 400 "Round not over"
  RoomSnapshot → 200 { room: result }
```

---

## Modified Endpoint

### GET /rooms/:code (at `status === "result"`)

No new endpoint. The existing `GET /rooms/:code` handler is unchanged. Only
`toRoomSnapshot` is updated to expose `secretWord` for all players when the room
is in `"result"` status.

**Before (Scenario 2 behaviour):**

`secretWord` included only when caller is the drawer AND status is `"playing"`.

**After (Scenario 4 change — FR-020):**

`secretWord` included when:
- caller is the drawer AND status is `"playing"`, **OR**
- status is `"result"` (any caller, any role)

**Response at `status === "result"` (example)**

```json
{
  "room": {
    "code": "ABCD",
    "host": "Alice",
    "status": "result",
    "participants": [
      { "id": "...", "name": "Alice", "isHost": true,  "score": 0,   "role": "drawer" },
      { "id": "...", "name": "Bob",   "isHost": false, "score": 100, "role": "guesser" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "canvasData": "data:image/png;base64,...",
    "guesses": [
      { "playerName": "Bob", "text": "pizza",  "isCorrect": false },
      { "playerName": "Bob", "text": "rocket", "isCorrect": true  }
    ],
    "secretWord": "rocket"
  }
}
```

**`GET /rooms/:code` query parameter** — `?player=<playerName>` is passed by the
frontend to identify the viewer's role. This is unchanged; the result-screen exposure
is unconditional on role, so the player param is still forwarded but has no effect on
`secretWord` visibility when status is `"result"`.

---

## Unchanged Endpoints

All other endpoints (`POST /rooms`, `POST /rooms/:code/join`, `POST /rooms/:code/start`,
`POST /rooms/:code/canvas`, `POST /rooms/:code/guess`) are unchanged by Scenario 4.
