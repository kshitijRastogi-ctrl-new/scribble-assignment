# API Contracts: Gameplay Interaction

**Feature**: `003-gameplay-interaction` | **Date**: 2026-05-31

---

## Existing Endpoint Extended

### GET /rooms/:code

Extended to include `canvasData` and `guesses` for all players.
No role-based filtering on either field (contrast with `secretWord` which is drawer-only).

**Response** (after Scenario 3 changes):
```json
{
  "room": {
    "code": "ABCD",
    "host": "Alice",
    "status": "playing",
    "secretWord": "rocket",
    "canvasData": "data:image/png;base64,iVBOR...",
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "guesses": [
      { "playerName": "Bob", "text": "pizza", "isCorrect": false },
      { "playerName": "Charlie", "text": "rocket", "isCorrect": true }
    ],
    "participants": [
      { "id": "…", "name": "Alice", "isHost": true, "role": "drawer", "score": 0, "joinedAt": "…" },
      { "id": "…", "name": "Bob",   "isHost": false, "role": "guesser", "score": 0, "joinedAt": "…" },
      { "id": "…", "name": "Charlie", "isHost": false, "role": "guesser", "score": 100, "joinedAt": "…" }
    ]
  }
}
```

**Notes**:
- `canvasData` is always present. Value is `""` when no drawing has been uploaded yet.
- `guesses` is always present. Value is `[]` when no guesses have been submitted.
- `secretWord` remains drawer-only (Scenario 2 filtering unchanged).
- Guesser response omits `secretWord`; includes `canvasData` and `guesses`.

---

## New Endpoints

### POST /rooms/:code/canvas

Stores the current canvas state. Called by the drawer on every stroke end (mouseup
or mouseleave while drawing) and on Clear.

**Request**:
```
POST /rooms/ABCD/canvas
Content-Type: application/json

{
  "canvasData": "data:image/png;base64,iVBOR..."
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `canvasData` | `string` | Required. PNG data URL or `""` (blank canvas after clear). |

**Success response** — `200 OK`:
```json
{ "ok": true }
```

**Error responses**:

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid canvas data" }` | Body fails Zod parse |
| 404 | `{ "error": "Room not found" }` | `code` not in store |

**Notes**:
- No authentication check — any client who knows the room code can update the canvas.
  This is acceptable for the lab scope; the game UI only calls this endpoint for the
  drawer (enforced client-side by `role === "drawer"` guard in DrawingCanvas).
- The endpoint does NOT validate `room.status`. Canvas uploads are accepted in any
  status to keep the implementation simple.
- Does NOT return the updated room snapshot — callers use the existing polling to
  retrieve the latest state.

---

### POST /rooms/:code/guess

Submits a guess. Validates the guess case-insensitively against `room.secretWord`.
Increments the guesser's score by 100 on correct. Appends to `room.guesses`. Transitions
status to `"result"` on first correct guess.

**Request**:
```
POST /rooms/ABCD/guess
Content-Type: application/json

{
  "playerName": "Bob",
  "guess": "rocket"
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `playerName` | `string` | Required, non-empty (trimmed by Zod schema). |
| `guess` | `string` | Required. Backend trims before comparison (defence in depth). |

**Success response** — `200 OK`:
```json
{
  "room": {
    "code": "ABCD",
    "host": "Alice",
    "status": "result",
    "canvasData": "data:image/png;base64,...",
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "guesses": [
      { "playerName": "Bob", "text": "rocket", "isCorrect": true }
    ],
    "participants": [
      { "id": "…", "name": "Alice", "isHost": true,  "role": "drawer",  "score": 0,   "joinedAt": "…" },
      { "id": "…", "name": "Bob",   "isHost": false, "role": "guesser", "score": 100, "joinedAt": "…" }
    ]
  }
}
```

**Error responses**:

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Round already over" }` | `room.status === "result"` |
| 400 | `{ "error": "Name cannot be empty" }` | `playerName` fails Zod `.min(1)` |
| 404 | `{ "error": "Room not found" }` | `code` not in store |

**Concurrent correct guess behaviour**:
Node.js processes requests serially. The first correct guess transitions status to
`"result"` and scores 100. Any subsequent guess — correct or not — arrives when
`room.status === "result"` and receives 400 `"Round already over"` immediately.
No locking is needed.

**Notes**:
- `secretWord` is **not** included in the response (no `viewerName` context; consistent
  with Scenario 2 approach where start response also omits `secretWord`).
- Callers use the existing polling (`GET /rooms/:code?player=<name>`) to receive
  `secretWord` if they are the drawer.
- The backend trims `guess` before comparison (defence in depth), even though the
  frontend already trims before sending.

---

## Zod Schemas (new additions to `backend/src/api/schemas.ts`)

```typescript
export const canvasSchema = z.object({
  canvasData: z.string()
});

export const guessSchema = z.object({
  playerName: z.string().trim().min(1, { message: "Name cannot be empty" }),
  guess: z.string()
});
```
