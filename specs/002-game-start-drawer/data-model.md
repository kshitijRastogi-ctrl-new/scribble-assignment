# Data Model: Game Start & Drawer Flow

**Feature**: 002-game-start-drawer | **Date**: 2026-05-31

All changes are extensions to existing interfaces. No entity is removed or renamed.

---

## `RoomStatus` (backend: `game.ts`)

```typescript
// Before (Scenario 1)
type RoomStatus = "lobby" | "playing";

// After (Scenario 2)
type RoomStatus = "lobby" | "playing" | "result";
```

`"result"` is added as a forward-compatibility value. The mechanism that sets it
(`POST /rooms/:code/guess` or similar) is Scenario 3's work. Scenario 2 only
adds the navigation trigger in `GamePage` when the polled status equals `"result"`.

---

## `Participant` (backend: `game.ts`)

```typescript
// Before (Scenario 1)
interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  joinedAt: string;
}

// After (Scenario 2)
interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  joinedAt: string;
  role: string;          // "" before game starts; "drawer" or "guesser" after startGame
}
```

`role` is typed as `string` (not `ParticipantRole`) to allow the empty-string default
in lobby state without adding `""` to the `ParticipantRole` union. The existing
`ParticipantRole = "drawer" | "guesser"` type remains the canonical set of assigned values.

**Initial value**: `""` — set in `createParticipant()`.
**Assigned in**: `startGame()` — host gets `"drawer"`, all others get `"guesser"`.

---

## `Room` (backend: `game.ts`)

```typescript
// Before (Scenario 1)
interface Room {
  code: string;
  host: string;
  status: RoomStatus;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}

// After (Scenario 2)
interface Room {
  code: string;
  host: string;
  status: RoomStatus;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
  wordIndex: number;     // starts at 0; increments on each startGame call
  secretWord: string;    // "" until startGame; set to STARTER_WORDS[wordIndex % 5]
}
```

**`wordIndex`**: Initialised to `0` in `createRoom`. Incremented by 1 in `startGame`
*after* the word is selected (so first game uses index 0, second uses index 1, etc.).
Wraps via modulo — no overflow risk in practice.

**`secretWord`**: Initialised to `""` in `createRoom`. Set on every `startGame` call.
The formula: `STARTER_WORDS[room.wordIndex % STARTER_WORDS.length]`.
Word list (fixed, from `seed/starterData.ts`): `["rocket","pizza","castle","guitar","sunflower"]`.

---

## `RoomSnapshot` (backend: `game.ts` — API response shape)

```typescript
// Before (Scenario 1)
interface RoomSnapshot {
  code: string;
  host: string;
  status: RoomStatus;
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];   // parallel array — REMOVED
}

// After (Scenario 2)
interface RoomSnapshot {
  code: string;
  host: string;
  status: RoomStatus;
  participants: Participant[];   // each entry now carries role: string
  availableWords: string[];
  secretWord?: string;          // present ONLY for drawer when status === "playing"
}
```

`roles: ParticipantRole[]` is removed. Role is now co-located on each `Participant`
entry (consistent with `isHost` precedent).

`secretWord?` is included in the snapshot via spread in `toRoomSnapshot`:
```
{ ...(isDrawer && status === "playing" ? { secretWord: room.secretWord } : {}) }
```

---

## Frontend mirror (`frontend/src/services/api.ts`)

```typescript
// Participant — add role
interface Participant {
  id: string; name: string; isHost: boolean; score: number;
  joinedAt: string;
  role: string;            // ← new
}

// RoomSnapshot — remove roles[], add secretWord?, extend status
interface RoomSnapshot {
  code: string; host: string;
  status: "lobby" | "playing" | "result";   // "result" added
  participants: Participant[];
  availableWords: string[];
  secretWord?: string;     // ← new (optional)
  // roles: ParticipantRole[]  ← REMOVED
}
```

`ParticipantRole` type is also removed from `api.ts` (was only used for `roles[]`).

---

## State transitions

```
Room lifecycle:
  createRoom()  →  status: "lobby",  wordIndex: 0, secretWord: ""
                   all participants: role: ""

  startGame()   →  status: "playing", wordIndex: wordIndex + 1
                   secretWord: STARTER_WORDS[old_wordIndex % 5]
                   host participant: role: "drawer"
                   all other participants: role: "guesser"

  [Scenario 3]  →  status: "result"   (mechanism TBD in Scenario 3)
```
