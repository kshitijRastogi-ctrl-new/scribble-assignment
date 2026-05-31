# Data Model: Room Setup & Lobby

**Branch**: `001-room-setup-lobby` | **Date**: 2026-05-30

## Entities

### RoomStatus (enum)

```typescript
// backend/src/models/game.ts
// "lobby" retained from starter — only "playing" is added
type RoomStatus = "lobby" | "playing";
// "lobby"   — room created, game not yet started (matches starter + assignment language)
// "playing" — host started the game; all clients navigate to game screen
```

### Participant (updated)

```typescript
// backend/src/models/game.ts
interface Participant {
  id: string;        // UUID — unchanged
  name: string;      // trimmed player name — unchanged
  isHost: boolean;   // NEW: true only for the room creator
  score: number;     // NEW: starts at 0; used in Scenario 3
  joinedAt: string;  // ISO timestamp — unchanged
}
```

**Validation rules**:
- `name` MUST be non-empty after trimming (enforced by Zod schema pre-construction)
- `name` MUST be unique within the room (checked before adding)
- `isHost` is `true` only for the first participant in the room (creator)
- `score` is always initialized to `0`

### Room (updated)

```typescript
// backend/src/models/game.ts
interface Room {
  code: string;          // 4-char uppercase alphanumeric — unchanged
  host: string;          // NEW: playerName of the creator (denormalized for fast lookup)
  status: RoomStatus;    // "lobby" | "playing" — "lobby" retained from starter
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}
```

**State transitions**:

```
[create]       [start]
  ───►  lobby  ───►  playing
```

- `lobby` → `playing`: triggered by `POST /rooms/:code/start` (host only, ≥2 players)
- No transition back (restart is a Scenario 4 concern)

### RoomSnapshot (updated — what GET returns)

```typescript
// backend/src/models/game.ts  (also mirrored in frontend/src/services/api.ts)
interface RoomSnapshot {
  code: string;
  host: string;           // NEW: playerName of host
  status: RoomStatus;     // "lobby" | "playing"
  participants: Participant[];  // now includes isHost and score
  availableWords: string[];    // unchanged
  roles: ParticipantRole[];    // unchanged
}
```

### Client-side localStorage

| Key | Value | Set when |
|-----|-------|----------|
| `"playerName"` | Trimmed string (e.g., `"Alice"`) | After create/join succeeds |
| `"roomCode"` | Uppercase room code (e.g., `"ABCD"`) | After create/join succeeds |

Both keys are read by `LobbyPage` (to determine isHost) and `GamePage` (player identity).

## In-memory Store Shape (backend)

```
Map<code, Room>
  "ABCD" → {
    code: "ABCD",
    host: "Alice",
    status: "lobby",
    participants: [
      { id: "uuid-1", name: "Alice", isHost: true,  score: 0, joinedAt: "..." },
      { id: "uuid-2", name: "Bob",   isHost: false, score: 0, joinedAt: "..." }
    ],
    createdAt: "...",
    updatedAt: "..."
  }
```

## Zod Schema Changes

### `createRoomSchema` (updated)

```typescript
// backend/src/api/schemas.ts
const createRoomSchema = z.object({
  playerName: z.string().trim().min(1, { message: "Name cannot be empty" })
});
```

### `joinRoomSchema` (updated)

```typescript
const joinRoomSchema = z.object({
  playerName: z.string().trim().min(1, { message: "Name cannot be empty" })
});
```

### `startGameSchema` (new)

```typescript
const startGameSchema = z.object({
  playerName: z.string().trim().min(1)
});
```

### Error response shape (updated everywhere)

```typescript
// All error responses use "error" key (not "message")
// backend/src/api/router.ts errorHandler updated accordingly
{ "error": "<human-readable message>" }
```
