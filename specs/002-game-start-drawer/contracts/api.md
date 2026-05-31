# API Contract: Game Start & Drawer Flow

**Feature**: 002-game-start-drawer | **Date**: 2026-05-31

Changes to existing endpoints only. No new endpoints are added in Scenario 2.

---

## GET /rooms/:code

### Change from Scenario 1

Query parameter renamed from `participantId` (unused/dead-code) to `player` (active
role-filtering). The old parameter had no effect on the response; the new one controls
whether `secretWord` is included.

### Request

```
GET /rooms/:code?player=<playerName>
```

- `:code` — uppercase 4-character room code (required, path param)
- `?player=` — player name (optional, query param); if absent or unrecognised, response
  is identical to the guesser shape

### Response shapes

#### Lobby state (any `?player=` value, status `"lobby"`)

```json
{
  "room": {
    "code": "ABCD",
    "host": "Alice",
    "status": "lobby",
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "participants": [
      { "id": "uuid-1", "name": "Alice", "isHost": true,  "role": "", "score": 0, "joinedAt": "2026-05-31T…" },
      { "id": "uuid-2", "name": "Bob",   "isHost": false, "role": "", "score": 0, "joinedAt": "2026-05-31T…" }
    ]
  }
}
```

No `secretWord` field (game not started, word not yet selected).
All `role` values are `""`.

#### Playing state — drawer caller (`?player=Alice`, Alice has `role: "drawer"`)

```json
{
  "room": {
    "code": "ABCD",
    "host": "Alice",
    "status": "playing",
    "secretWord": "rocket",
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "participants": [
      { "id": "uuid-1", "name": "Alice", "isHost": true,  "role": "drawer",  "score": 0, "joinedAt": "2026-05-31T…" },
      { "id": "uuid-2", "name": "Bob",   "isHost": false, "role": "guesser", "score": 0, "joinedAt": "2026-05-31T…" }
    ]
  }
}
```

`secretWord` is present only in this shape. The value cycles through the word list as
`wordIndex` increments on each `startGame` call.

#### Playing state — guesser caller (`?player=Bob`, Bob has `role: "guesser"`)

```json
{
  "room": {
    "code": "ABCD",
    "host": "Alice",
    "status": "playing",
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "participants": [
      { "id": "uuid-1", "name": "Alice", "isHost": true,  "role": "drawer",  "score": 0, "joinedAt": "2026-05-31T…" },
      { "id": "uuid-2", "name": "Bob",   "isHost": false, "role": "guesser", "score": 0, "joinedAt": "2026-05-31T…" }
    ]
  }
}
```

`secretWord` is absent. All other fields identical to the drawer shape.

#### Playing state — missing or unrecognised `?player=`

Same as guesser shape above. `secretWord` is never included.

### Error responses (unchanged from Scenario 1)

| Condition | Status | Body |
|-----------|--------|------|
| Room not found | 404 | `{ "error": "Room not found" }` |

---

## POST /rooms/:code/start

### Change from Scenario 1

One new error case added (FR-014). All existing request/response shapes unchanged.

### Request (unchanged)

```json
{ "playerName": "Alice" }
```

### Success response (unchanged structure; role and secretWord now set on room)

> **Note (G3)**: `POST /rooms/:code/start` never includes `secretWord` in its response.
> The drawer receives `secretWord` on the first `GET /rooms/:code?player=<name>` poll.
> This is intentional and consistent with FR-003/FR-004 role-based filtering — the start
> response has no `viewerName` context, so the guesser-safe (no-secretWord) shape is
> always returned.

```json
{
  "room": {
    "code": "ABCD",
    "host": "Alice",
    "status": "playing",
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "participants": [
      { "id": "uuid-1", "name": "Alice", "isHost": true,  "role": "drawer",  "score": 0, "joinedAt": "…" },
      { "id": "uuid-2", "name": "Bob",   "isHost": false, "role": "guesser", "score": 0, "joinedAt": "…" }
    ]
  }
}
```

Note: `secretWord` is **not** in the start response (no `?player=` context at this
call site). The drawer fetches their word via the first `GET ?player=Alice` poll.

### Error responses

| Condition | Status | Body |
|-----------|--------|------|
| Room not found | 404 | `{ "error": "Room not found" }` |
| Caller is not host | 403 | `{ "error": "Only the host can start the game" }` |
| Fewer than 2 players | 400 | `{ "error": "Need at least 2 players to start" }` |
| Room already playing | 400 | `{ "error": "Game already started" }` ← **new** |
