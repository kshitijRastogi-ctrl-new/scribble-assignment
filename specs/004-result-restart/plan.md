# Implementation Plan: Result, Restart & Final Validation

**Branch**: `004-result-restart` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-result-restart/spec.md`

---

## Summary

Implement the result screen and host-triggered restart for the Scribble game. When a
correct guess is submitted, all players are already navigated to `/result` (Scenario 3).
This plan activates the `ResultPage.tsx` placeholder to display the secret word, sorted
final scoreboard, and full guess history; adds a host-only "Play Again" button that
calls a new `POST /rooms/:code/restart` endpoint; and resets all round state on the
backend so players return to the lobby for another round.

The implementation touches **6 files** across backend and frontend. No new interfaces,
no new routes, no new npm dependencies.

---

## Technical Context

**Language/Version**: TypeScript 5.x (backend Node.js 18+, frontend Vite/React 18)

**Primary Dependencies**: Express, Zod (backend) · React, React Router v6, Vite (frontend)

**Storage**: In-memory `Map<string, Room>` — no database (constitution Principle III)

**Testing**: Manual two-tab end-to-end validation (no automated test suite in starter)

**Target Platform**: Local development — backend `http://localhost:3001`, frontend `http://localhost:5173`

**Project Type**: Brownfield web application (frontend + REST backend)

**Performance Goals**: All cross-client state updates visible within one poll cycle (~2 seconds)

**Constraints**: No WebSockets, no persistence, no new npm dependencies, no new routes

**Scale/Scope**: 2–6 players per room; single in-memory session

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Brownfield-First — Extend, Don't Replace | ✅ PASS | All 5 changed files are extensions. ResultPage.tsx is extended, not replaced wholesale. No new routing libraries. |
| II. REST Polling Only — No Real-Time Protocols | ✅ PASS | ResultPage uses `setInterval` + `fetchRoomByCode` at ~2s — identical to GamePage and LobbyPage. No WebSockets introduced. |
| III. In-Memory State Only — No Persistence Layer | ✅ PASS | `restartRoom` mutates the in-memory `rooms` Map. `saveRoom` clones to the Map. No file writes, no DB. |
| IV. Spec-Driven Development — Trace Every Change | ✅ PASS | Every file change below traces to a FR in spec.md. FR-020 → `toRoomSnapshot`. FR-012/FR-015/FR-016/FR-017/FR-018/FR-019 → `restartRoom` + handler. FR-001–FR-014 → `ResultPage`. |
| V. TypeScript Strict — No Silent Failures | ✅ PASS | All new code is fully typed. `restartRoom` returns a union discriminant. Zod validates the request body. `secretWord?: string` is already optional in `RoomSnapshot`. |

**Complexity Tracking**: No violations. No new abstractions required.

---

## Project Structure

### Documentation (this feature)

```text
specs/004-result-restart/
├── plan.md          ← This file
├── research.md      ← Phase 0 output (all unknowns resolved)
├── data-model.md    ← Phase 1 output (state transitions, snapshot visibility)
├── contracts/
│   └── api.md       ← Phase 1 output (POST /restart contract, GET change)
├── checklists/
│   └── requirements.md
└── tasks.md         ← Phase 2 output (created by /speckit-tasks)
```

### Source Code — Files Changed

```text
backend/
└── src/
    ├── api/
    │   ├── schemas.ts          ← Add restartSchema
    │   └── rooms.ts            ← Add POST /:code/restart handler
    └── services/
        └── roomStore.ts        ← (1) Update toRoomSnapshot condition
                                   (2) Add restartRoom function

frontend/
└── src/
    ├── services/
    │   └── api.ts              ← Add restartRoom method
    ├── state/
    │   └── roomStore.ts        ← Add restartRoom method
    └── pages/
        └── ResultPage.tsx      ← Replace placeholder with full implementation
```

**Files NOT changed**: `backend/src/models/game.ts`, `frontend/src/routes/index.tsx`,
`LobbyPage.tsx`, `GamePage.tsx`, `CreateRoomPage.tsx`, `JoinRoomPage.tsx`, `App.tsx`,
all component files.

---

## State Model

### Room lifecycle at result/restart boundary

```
POST /rooms/:code/guess (correct)  [Scenario 3]
  └─▶ room.status = "result"
       room.guesses preserved
       room.canvasData preserved
       participant.score += 100
       ↓ (all clients poll, navigate to /result)

GET /rooms/:code  [Scenario 4 — FR-020 change]
  └─▶ secretWord now visible to ALL players when status === "result"

POST /rooms/:code/restart  { playerName: host }  [Scenario 4 — new]
  └─▶ room.status = "lobby"
       room.secretWord = ""
       room.canvasData = ""
       room.guesses = []
       room.wordIndex += 1
       participants[*].score = 0
       participants[*].role = ""
       participants array preserved
       room.host preserved
       ↓ (polling detects "lobby", all clients navigate to /lobby)
```

---

## Data Flow

### Result screen (non-host polling loop)

```
ResultPage mounts
  │
  ├─[FR-005a] fetchRoomByCode(roomCode, playerName) — immediate
  │             └─▶ GET /rooms/:code?player=playerName
  │                  └─▶ RoomSnapshot { status:"result", secretWord, guesses, participants }
  │                       └─▶ setRoomSnapshot(snapshot) → re-render
  │
  └─[FR-005]  setInterval(2000)
               └─▶ fetchRoomByCode(roomCode, playerName)
                    ├─ status === "lobby"  → navigate("/lobby")
                    └─ status === "result" → update store, re-render
```

### Play Again (host)

```
Host clicks "Play Again"
  │
  ├─ setRestartError(null); setRestarting(true)
  │
  └─[FR-012] roomStore.restartRoom(playerName)
              └─▶ POST /rooms/:code/restart { playerName }
                   ├─ 403 → setRestartError("Only the host can restart")
                   │         setRestarting(false)  [retry enabled — FR-014]
                   ├─ 400 → setRestartError("Round not over")
                   │         setRestarting(false)
                   └─ 200 → setRoomSnapshot(result.room)
                             navigate("/lobby")   [FR-013: immediate, no poll wait]
```

---

## File-by-File Change Plan

### 1. `backend/src/api/schemas.ts`

**Change**: Add `restartSchema` after `startGameSchema`.

```typescript
export const restartSchema = z.object({
  playerName: z.string().trim().min(1, { message: "Name cannot be empty" })
});
```

Mirrors `startGameSchema` exactly — same field, same validation message. No other
changes to this file.

**FR reference**: FR-012 (body validation for restart)

---

### 2. `backend/src/services/roomStore.ts` — `toRoomSnapshot`

**Change**: One-line condition update inside the existing `secretWord` spread.

Before:
```typescript
...(isDrawer && room.status === "playing" ? { secretWord: room.secretWord } : {})
```

After:
```typescript
...((isDrawer && room.status === "playing") || room.status === "result"
  ? { secretWord: room.secretWord }
  : {})
```

No new parameters, no new imports, no other changes to `toRoomSnapshot`.

**FR reference**: FR-020

---

### 3. `backend/src/services/roomStore.ts` — `restartRoom` (new export)

**Change**: Add `export function restartRoom` after `submitGuess`.

Return type union: `RoomSnapshot | null | "notHost" | "roundNotOver"`

Guard sequence (same order as `startGame`):
1. `const room = rooms.get(code)` → `return null` if not found
2. `if (playerName !== room.host) return "notHost" as const`
3. `if (room.status !== "result") return "roundNotOver" as const`

Reset sequence (all before `saveRoom`):
4. `room.status = "lobby"`
5. `room.secretWord = ""`
6. `room.canvasData = ""`
7. `room.guesses = []`
8. `room.wordIndex += 1`
9. `room.participants.forEach(p => { p.score = 0; p.role = ""; })`
10. `saveRoom(room)`
11. `return toRoomSnapshot(room)`

`wordIndex` increments in both `restartRoom` (here) and `startGame` (on word pick).
Each full restart cycle advances `wordIndex` by 2 total — once on restart, once on
next start. This produces a different word each round per SC-006.

**FR reference**: FR-015, FR-016, FR-017, FR-018, FR-019

---

### 4. `backend/src/api/rooms.ts`

**Change**: Add `POST /:code/restart` handler before `return router`. Add `restartSchema`
to the schemas import and `restartRoom` to the roomStore import.

Handler structure (mirrors `POST /:code/start` exactly):
```
safeParse(request.params, roomCodeParamsSchema)  → next(HttpError(400)) on failure
safeParse(request.body, restartSchema)           → next(HttpError(400)) on failure
restartRoom(code.toUpperCase(), playerName)      → discriminant map:
  null           → next(HttpError(404, "Room not found"))
  "notHost"      → next(HttpError(403, "Only the host can restart"))
  "roundNotOver" → next(HttpError(400, "Round not over"))
  RoomSnapshot   → response.json({ room: result })
```

**FR reference**: FR-012, FR-015, FR-018, FR-019

---

### 5. `frontend/src/services/api.ts`

**Change**: Add `restartRoom` method to the `api` object after `submitGuess`.

```typescript
restartRoom(code: string, playerName: string) {
  return request<{ room: RoomSnapshot }>(
    `/rooms/${encodeURIComponent(code)}/restart`,
    { method: "POST", body: JSON.stringify({ playerName }) }
  );
}
```

Mirrors `startGame` method exactly. No type changes needed (`RoomSnapshot.secretWord`
is already `?: string`).

**FR reference**: FR-012

---

### 6. `frontend/src/state/roomStore.ts`

**Change**: Add `restartRoom` method to `RoomStore` class after `startGame`.

```typescript
async restartRoom(playerName: string) {
  await this.withLoading(async () => {
    const response = await api.restartRoom(this.state.room!.code, playerName);
    this.setRoomSnapshot(response.room);
  });
}
```

Mirrors `startGame` exactly. Uses `withLoading` for consistent loading/error state.
On success, `setRoomSnapshot` updates `state.room` so `navigate("/lobby")` in
ResultPage finds a valid room already in the store.

**FR reference**: FR-012, FR-013

---

### 7. `frontend/src/pages/ResultPage.tsx`

**Change**: Replace the two-line placeholder with the full result screen implementation.
All display and restart logic lives inside this single existing file — no new component
files created.

**Imports** (all already in the project):
- `useEffect`, `useState` from `"react"`
- `useNavigate` from `"react-router-dom"`
- `useRoomState`, `useRoomStore` from `"../state/roomStore"`

**Local state**:
- `refreshError: string | null` — polling/fetch error display
- `restartError: string | null` — restart-specific error display
- `restarting: boolean` — disables "Play Again" during in-flight POST

**Effect 1 — guard + mount fetch (FR-009, FR-005a)**:
- Read `roomCode` and `playerName` from `localStorage`
- If `roomCode` absent → `navigate("/")` (guard)
- Call `roomStore.fetchRoomByCode(roomCode, playerName)` immediately
- `.catch(err → setRefreshError(err.message))`
- If `playerName` is null or empty, the non-host render path is used (FR-011 covers
  this case — null `playerName` cannot match `room.host`).

**Effect 2 — polling interval (FR-005, FR-006, FR-007)**:
- Dependencies: `[roomCode, playerName, roomStore, navigate]`
- `setInterval(2000)`: call `roomStore.fetchRoomByCode(roomCode, playerName)`
- If `updated.status === "lobby"` → `navigate("/lobby")`
- `.catch(err → setRefreshError(err.message))`
- Return `() => clearInterval(id)` on unmount

**`handleRestart` (FR-012, FR-013, FR-014)**:
- `setRestartError(null); setRestarting(true)`
- `try { await roomStore.restartRoom(playerName); navigate("/lobby") }`
- `catch err { setRestartError(err.message) }`
- `finally { setRestarting(false) }`

**Render structure**:
- Guard: `if (!room) return null` (prevents render before mount fetch resolves)
- Secret word card (FR-001): `room.secretWord` displayed prominently
- Scoreboard card (FR-002): `[...room.participants].sort((a,b) => b.score - a.score)` — name + score per row
- Guess history card (FR-003, FR-004): `room.guesses.map(g → playerName + text + ✓/✗)`; "No guesses submitted." when empty
- Host action (FR-010): `playerName === room.host` → "Play Again" button (disabled when `restarting`)
- Non-host (FR-011): `"Waiting for host to restart…"` message
- Errors (FR-008, FR-014): `{refreshError && <p>…</p>}` and `{restartError && <p>…</p>}`

**Sorting note**: `[...room.participants]` spread avoids mutating the array from the store.

**FR reference**: FR-001 through FR-014 (all ResultPage requirements)

---

## Implementation Order & Dependencies

```
Phase 1 — Backend types (parallel, no dependencies):
  [A] schemas.ts       → add restartSchema

Phase 2 — Backend service (depends on A):
  [B] roomStore.ts     → update toRoomSnapshot (independent of A, but same file)
  [C] roomStore.ts     → add restartRoom        (depends on A for schema type awareness)

Phase 3 — Backend handler (depends on A + C):
  [D] rooms.ts         → add POST /:code/restart handler

Phase 4 — Frontend API method (no backend dependency for types):
  [E] api.ts           → add restartRoom method

Phase 5 — Frontend store method (depends on E):
  [F] frontend/roomStore.ts → add restartRoom method

Phase 6 — Frontend page (depends on E + F):
  [G] ResultPage.tsx   → full implementation

Phase 7 — Validation:
  [H] npx tsc --noEmit in backend/ and frontend/
  [I] Manual two-tab end-to-end flow
```

**⚠️ Atomic pairs**: Apply [B] and [D] together (toRoomSnapshot change + handler). The
endpoint is incomplete until both the snapshot and the handler are in place.

---

## Quickstart Reference

```bash
# Backend
cd backend && npm run dev    # http://localhost:3001

# Frontend
cd frontend && npm run dev   # http://localhost:5173

# TypeScript check
cd backend  && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

### Manual Validation Checkpoints

| Checkpoint | What to verify |
|------------|----------------|
| After toRoomSnapshot change | `GET /rooms/:code?player=Alice` on a `"result"` room returns `secretWord` in response |
| After restartRoom + handler | `POST /rooms/:code/restart { playerName:"Alice" }` returns `{ room: { status:"lobby", guesses:[], canvasData:"" } }` |
| After ResultPage | `/result` shows secret word, sorted scoreboard (100 then 0), guess history with ✓/✗ |
| Host vs non-host | Alice's tab shows "Play Again"; Bob's tab shows "Waiting for host…" |
| After Play Again | Both tabs navigate to `/lobby` within ~2s; scores show 0; room is ready to start again |
| After second round start | Secret word is the next word in the list (not the same as round 1) |
| Page refresh recovery | Refresh `/result` tab — result data restores without manual action |
