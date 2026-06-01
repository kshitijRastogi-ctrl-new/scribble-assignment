# Data Model: Result, Restart & Final Validation

**Branch**: `004-result-restart` | **Date**: 2026-06-01

---

## No New Fields Required

Scenario 4 introduces no new fields to either `Room` or `RoomSnapshot`. All data
required by the result screen and restart flow already exists from Scenarios 2 and 3.

---

## Room (backend in-memory, `backend/src/models/game.ts`)

```
Room {
  code:         string          // 4-char unique code — UNCHANGED
  host:         string          // player name of host — UNCHANGED (preserved through restart)
  status:       RoomStatus      // "lobby" | "playing" | "result" — reset to "lobby" on restart
  participants: Participant[]    // array — preserved through restart; score + role reset
  createdAt:    string          // ISO timestamp — UNCHANGED
  updatedAt:    string          // ISO timestamp — updated by saveRoom on each mutation
  wordIndex:    number          // increments on restart (modulo word list length)
  secretWord:   string          // reset to "" on restart
  canvasData:   string          // reset to "" on restart
  guesses:      Guess[]         // reset to [] on restart
}
```

**State transitions relevant to Scenario 4:**

```
"result"  ──[POST /rooms/:code/restart]──▶  "lobby"
```

**Restart mutation (atomic field changes):**

| Field | Before restart | After restart |
|-------|----------------|---------------|
| `status` | `"result"` | `"lobby"` |
| `secretWord` | `"rocket"` (example) | `""` |
| `canvasData` | `"data:image/png;base64,..."` | `""` |
| `guesses` | `[{ playerName, text, isCorrect }, ...]` | `[]` |
| `wordIndex` | N | N + 1 |
| `participants[*].score` | 0–100 | `0` |
| `participants[*].role` | `"drawer"` \| `"guesser"` | `""` |
| `participants` (array) | preserved | preserved |
| `host` | preserved | preserved |

---

## Participant (nested in Room)

```
Participant {
  id:       string   // UUID — UNCHANGED through restart
  name:     string   // player name — UNCHANGED through restart
  isHost:   boolean  // UNCHANGED through restart
  score:    number   // reset to 0 on restart
  joinedAt: string   // ISO timestamp — UNCHANGED
  role:     string   // reset to "" on restart
}
```

---

## Guess (nested in Room.guesses)

```
Guess {
  playerName: string   // player who submitted
  text:       string   // trimmed guess text
  isCorrect:  boolean  // true if matched secretWord case-insensitively
}
```

No changes to this interface. `guesses` is preserved through status → "result" and
cleared to `[]` on restart.

---

## RoomSnapshot (API response shape, `backend/src/models/game.ts`)

```
RoomSnapshot {
  code:           string        // always present
  host:           string        // always present
  status:         RoomStatus    // always present
  participants:   Participant[] // always present
  availableWords: string[]      // always present
  canvasData:     string        // always present
  guesses:        Guess[]       // always present
  secretWord?:    string        // CONDITIONALLY present (see below)
}
```

**`secretWord` visibility rule (updated by FR-020):**

| Room status | Viewer role | `secretWord` in snapshot? |
|-------------|-------------|--------------------------|
| `"lobby"` | any | absent |
| `"playing"` | `"drawer"` | present |
| `"playing"` | `"guesser"` / `""` | absent |
| `"result"` | any | present (unconditional) |

The condition in `toRoomSnapshot` changes from:
```
(isDrawer && room.status === "playing")
```
to:
```
(isDrawer && room.status === "playing") || room.status === "result"
```

The `secretWord?: string` (optional) type in `RoomSnapshot` is already correct — no
interface change needed.

---

## Frontend State (`frontend/src/state/roomStore.ts`)

No new state fields. The `RoomStore.state` shape is unchanged:

```
RoomState {
  room:          RoomSnapshot | null
  participantId: string | null
  error:         string | null
  isLoading:     boolean
}
```

`restartRoom` mutates `state.room` via `setRoomSnapshot` after a successful restart —
the same pattern as `startGame`.

---

## localStorage keys (frontend)

ResultPage reads but does NOT write these keys. They are written by `roomStore.createRoom`
and `roomStore.joinRoom` and persist across page refreshes.

| Key | Value | Written by |
|-----|-------|------------|
| `playerName` | player's display name | `roomStore.createRoom` / `roomStore.joinRoom` |
| `roomCode` | 4-char room code | `roomStore.createRoom` / `roomStore.joinRoom` |
