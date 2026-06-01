# Data Model: Gameplay Interaction

**Feature**: `003-gameplay-interaction` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

---

## Entity Changes

### `Guess` — NEW type

New type added to `backend/src/models/game.ts`. Represents a single guess submission.

```
{ playerName: string, text: string, isCorrect: boolean }
```

| Field | Type | Description |
|-------|------|-------------|
| `playerName` | `string` | Name of the player who submitted the guess (matches a `Participant.name`) |
| `text` | `string` | The trimmed guess text as stored (never contains leading/trailing whitespace) |
| `isCorrect` | `boolean` | `true` if `text.toLowerCase() === room.secretWord.toLowerCase()` |

**Ordering**: Appended to `room.guesses[]` in submission order. Array is never reordered or cleared.

---

### `Room` — extended

Two new fields added to the existing `Room` interface in `backend/src/models/game.ts`:

| Field | Type | Default | Set by |
|-------|------|---------|--------|
| `canvasData` | `string` | `""` | `createRoom`; updated by `updateCanvas` |
| `guesses` | `Guess[]` | `[]` | `createRoom`; appended by `submitGuess` |

**Invariants**:
- `canvasData` holds a PNG data URL (`data:image/png;base64,...`) or `""` (blank canvas).
- `guesses` is append-only. Neither field is cleared when `status` transitions to `"result"`.
- `canvasData` and `guesses` persist until the backend process restarts (in-memory only).

Before (Scenario 2):
```
Room { code, host, status, participants, createdAt, updatedAt, wordIndex, secretWord }
```

After (Scenario 3):
```
Room { code, host, status, participants, createdAt, updatedAt,
       wordIndex, secretWord,
       canvasData: string,    ← NEW
       guesses: Guess[]       ← NEW
     }
```

---

### `RoomSnapshot` — extended

Two new fields added to `RoomSnapshot` in `backend/src/models/game.ts`. Both are always
returned to all players (no role-based filtering — drawing is shared by design).

| Field | Type | Filtering |
|-------|------|-----------|
| `canvasData` | `string` | Returned for ALL players regardless of role |
| `guesses` | `Guess[]` | Returned for ALL players regardless of role |

Before (Scenario 2):
```
RoomSnapshot { code, host, status, participants, availableWords, secretWord? }
```

After (Scenario 3):
```
RoomSnapshot { code, host, status, participants, availableWords, secretWord?,
               canvasData: string,   ← NEW (always present, "" when blank)
               guesses: Guess[]      ← NEW (always present, [] when none)
             }
```

---

### `Participant` — unchanged

`score: number` already exists and is the field incremented by +100 on correct guess.
No new fields added to `Participant`.

---

## State Transitions

### `canvasData` lifecycle

```
createRoom()      → canvasData = ""
updateCanvas()    → canvasData = <base64 PNG data URL>   (called on every stroke end and clear)
status → "result" → canvasData preserved (not cleared)
backend restart   → canvasData lost (in-memory only)
```

### `guesses[]` lifecycle

```
createRoom()      → guesses = []
submitGuess()     → guesses.push({ playerName, text, isCorrect })
status → "result" → guesses preserved (not cleared)
backend restart   → guesses lost (in-memory only)
```

### `room.status` for Scenario 3

```
"lobby"   (Scenario 1)
  ↓ startGame()
"playing" (Scenario 2)
  ↓ submitGuess() with correct guess
"result"  (Scenario 3 trigger → Scenario 4 display)
```

No transition back from "result" in Scenario 3 (restart is Scenario 4).

---

## Frontend Mirror

`frontend/src/services/api.ts` mirrors the backend model:

```
Guess interface: { playerName: string, text: string, isCorrect: boolean }  ← NEW
RoomSnapshot: add canvasData: string                                        ← NEW
RoomSnapshot: add guesses: Guess[]                                          ← NEW
```
