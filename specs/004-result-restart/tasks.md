---
description: "Task list for Result, Restart & Final Validation — Scenario 4"
---

# Tasks: Result, Restart & Final Validation

**Input**: Design documents from `specs/004-result-restart/`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/api.md ✅

## Format: `[ID] [P?] [Story?] Description — file — FR ref`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[US#]**: Maps to User Story in spec.md
- **depends**: Lists task IDs that must complete first

---

## Phase 1: Backend Schema Foundation

**Purpose**: Adds the Zod schema that validates the `POST /rooms/:code/restart` request
body. This single schema unblocks the Phase 3 handler. It is independent of all other
phases and can be written in parallel with Phase 2.

- [x] T001 [P] Add `restartSchema` to `backend/src/api/schemas.ts` — add
  `export const restartSchema = z.object({ playerName: z.string().trim().min(1, { message: "Name cannot be empty" }) })`
  after `startGameSchema` — FR-012 — depends: none

**Checkpoint**: `npx tsc --noEmit` in `backend/` passes 0 errors. `schemas.ts` exports
`restartSchema`.

---

## Phase 2: Backend Service — Snapshot Update & Restart Logic

**Purpose**: Two changes to `backend/src/services/roomStore.ts`. T002 extends the
existing `toRoomSnapshot` function with one condition change (secretWord visible at
result). T003 adds the new `restartRoom` function after `submitGuess`. Both touch
different functions in the same file and can be written together, but T003 must be
applied after T002 to avoid edit conflicts on the same file.

**⚠️ ATOMIC PAIR**: Apply T002 first, then T003 in the same file. Commit both together —
the file is in an intermediate state between the two edits.

- [x] T002 [P] [US1] Update the `secretWord` conditional spread in `toRoomSnapshot` in
  `backend/src/services/roomStore.ts` — find the existing line:
  `...(isDrawer && room.status === "playing" ? { secretWord: room.secretWord } : {})`
  and replace it with:
  `...((isDrawer && room.status === "playing") || room.status === "result" ? { secretWord: room.secretWord } : {})`
  No other changes to `toRoomSnapshot` — FR-020 — depends: none

- [x] T003 [US1] [US3] [US4] Add `export function restartRoom` to
  `backend/src/services/roomStore.ts` — insert after the closing brace of `submitGuess`:
  (1) signature: `export function restartRoom(code: string, playerName: string): RoomSnapshot | null | "notHost" | "roundNotOver"`;
  (2) `const room = rooms.get(code);` — `if (!room) return null;`;
  (3) `if (playerName !== room.host) return "notHost" as const;`;
  (4) `if (room.status !== "result") return "roundNotOver" as const;`;
  (5) `room.status = "lobby";`;
  (6) `room.secretWord = "";`;
  (7) `room.canvasData = "";`;
  (8) `room.guesses = [];`;
  (9) `room.wordIndex += 1;`;
  (10) `room.participants.forEach(p => { p.score = 0; p.role = ""; });`;
  (11) `saveRoom(room);`;
  (12) `return toRoomSnapshot(room);` — FR-015, FR-016, FR-017, FR-018, FR-019 — depends: T002

**Checkpoint**: `npx tsc --noEmit` in `backend/` passes 0 errors. `roomStore.ts` exports
`restartRoom`. Manual test: call `GET /rooms/:code` on a room with `status:"result"` —
confirm `secretWord` appears in the response for all players.

---

## Phase 3: Backend API — Restart Endpoint Handler

**Purpose**: Registers `POST /:code/restart` in the Express router. Follows the exact
same structure as `POST /:code/start` — safeParse params, safeParse body, call service,
map discriminants to HTTP responses. Blocks on T001 (needs `restartSchema`) and T003
(needs `restartRoom`).

- [x] T004 [US3] [US4] Add `POST /:code/restart` handler to `backend/src/api/rooms.ts` —
  (1) add `restartSchema` to the existing import from `./schemas.js` and `restartRoom` to
  the existing import from `../services/roomStore.js`;
  (2) add the handler before `return router`:
  ```
  router.post("/:code/restart", (request, response, next) => {
    try {
      const parsedCode = roomCodeParamsSchema.safeParse(request.params);
      if (!parsedCode.success) return next(new HttpError(400, "Room code cannot be empty"));
      const parsedBody = restartSchema.safeParse(request.body);
      if (!parsedBody.success) return next(new HttpError(400, parsedBody.error.issues[0]?.message ?? "Invalid request payload"));
      const code = parsedCode.data.code.toUpperCase();
      const { playerName } = parsedBody.data;
      const result = restartRoom(code, playerName);
      if (result === null) return next(new HttpError(404, "Room not found"));
      if (result === "notHost") return next(new HttpError(403, "Only the host can restart"));
      if (result === "roundNotOver") return next(new HttpError(400, "Round not over"));
      response.json({ room: result });
    } catch (error) { next(error); }
  });
  ```
  — FR-012, FR-015, FR-018, FR-019 — depends: T001, T003

**Checkpoint**: `npx tsc --noEmit` in `backend/` passes 0 errors. Manual test:
`POST /rooms/:code/restart { "playerName": "Alice" }` on a `"result"` room returns
`{ room: { status:"lobby", guesses:[], canvasData:"", participants with score:0 } }`.
`POST` with wrong `playerName` returns 403. `POST` on a `"playing"` room returns 400.

---

## Phase 4: Frontend API Method

**Purpose**: Adds `api.restartRoom` to the frontend API service. This is independent of
all backend phases for TypeScript purposes (the `RoomSnapshot` type already has
`secretWord?: string`) and can start in parallel with Phases 1–3.

- [x] T005 [P] [US3] Add `restartRoom` method to the `api` object in
  `frontend/src/services/api.ts` — add after `submitGuess`:
  `restartRoom(code: string, playerName: string) { return request<{ room: RoomSnapshot }>(\`/rooms/\${encodeURIComponent(code)}/restart\`, { method: "POST", body: JSON.stringify({ playerName }) }); }`
  No type interface changes needed (`RoomSnapshot.secretWord` is already `?: string`) —
  FR-012 — depends: none

**Checkpoint**: `npx tsc --noEmit` in `frontend/` passes 0 errors. `api.ts` exports
`restartRoom` method in the `api` object.

---

## Phase 5: Frontend Store Method

**Purpose**: Adds `restartRoom` to the `RoomStore` class in `frontend/src/state/roomStore.ts`.
Mirrors the existing `startGame` method — uses `withLoading` for consistent loading/error
state, calls `api.restartRoom`, and updates `state.room` via `setRoomSnapshot` so
`navigate("/lobby")` in `ResultPage` finds a valid room in the store.

- [x] T006 [US3] Add `restartRoom` method to the `RoomStore` class in
  `frontend/src/state/roomStore.ts` — add after `startGame`:
  `async restartRoom(playerName: string) { await this.withLoading(async () => { const response = await api.restartRoom(this.state.room!.code, playerName); this.setRoomSnapshot(response.room); }); }`
  — FR-012, FR-013 — depends: T005

**Checkpoint**: `npx tsc --noEmit` in `frontend/` passes 0 errors. `RoomStore` class
has `restartRoom` method alongside `startGame`.

---

## Phase 6: Frontend Page — ResultPage Implementation

**Purpose**: Replaces the two-line `ResultPage.tsx` placeholder with the full
result screen. Split into two tasks matching the GamePage pattern from Scenario 3:
T007 adds all state, effects, and handlers (pure JS — no JSX changes); T008 replaces
the placeholder JSX with the complete render tree.

**⚠️ ATOMIC PAIR**: T007 and T008 must be applied to the same file in sequence and
committed together — T007 alone leaves the file with unused state variables.

- [x] T007 [US1] [US2] [US3] Update `frontend/src/pages/ResultPage.tsx` — add imports
  and logic (no JSX changes yet):
  (1) replace the two current import lines with:
  `import { useEffect, useState } from "react"; import { useNavigate } from "react-router-dom"; import { useRoomState, useRoomStore } from "../state/roomStore";`;
  (2) inside `ResultPage()`, add local variables before `return`:
  `const navigate = useNavigate(); const roomStore = useRoomStore(); const { room } = useRoomState(); const roomCode = localStorage.getItem("roomCode"); const playerName = localStorage.getItem("playerName"); const [refreshError, setRefreshError] = useState<string | null>(null); const [restartError, setRestartError] = useState<string | null>(null); const [restarting, setRestarting] = useState(false);`;
  (3) add Effect 1 — guard + mount fetch (FR-009, FR-005a):
  `useEffect(() => { if (!roomCode) { navigate("/", { replace: true }); return; } roomStore.fetchRoomByCode(roomCode, playerName ?? undefined).catch(err => setRefreshError(err instanceof Error ? err.message : "Unable to load result")); }, [roomCode, playerName, roomStore, navigate]);`;
  (4) add Effect 2 — polling interval (FR-005, FR-006, FR-007):
  `useEffect(() => { if (!roomCode) return; const id = setInterval(async () => { try { const updated = await roomStore.fetchRoomByCode(roomCode, playerName ?? undefined); if (updated?.status === "lobby") navigate("/lobby"); } catch (err) { setRefreshError(err instanceof Error ? err.message : "Unable to refresh"); } }, 2000); return () => clearInterval(id); }, [roomCode, playerName, roomStore, navigate]);`;
  (5) add `handleRestart` function (FR-012, FR-013, FR-014):
  `async function handleRestart() { setRestartError(null); setRestarting(true); try { await roomStore.restartRoom(playerName ?? ""); navigate("/lobby"); } catch (err) { setRestartError(err instanceof Error ? err.message : "Restart failed"); } finally { setRestarting(false); } }`
  — FR-005, FR-005a, FR-006, FR-007, FR-009, FR-012, FR-013, FR-014 — depends: T006

- [x] T008 [US1] [US2] [US3] Update `frontend/src/pages/ResultPage.tsx` — replace the
  JSX `return` block:
  (1) guard: `if (!room) return null;`;
  (2) sorted scoreboard variable:
  `const sortedParticipants = [...room.participants].sort((a, b) => b.score - a.score);`;
  (3) return a `<section className="panel result-page">` containing:
    - a header `<h1>Round Over!</h1>`;
    - a "Secret Word" card: `<div><h2>Secret Word</h2><p className="section-kicker">{room.secretWord}</p></div>`;
    - a "Final Scores" card: `<div><h2>Final Scores</h2><ul>{sortedParticipants.map(p => <li key={p.id}><span>{p.name}</span><strong>{p.score}</strong></li>)}</ul></div>`;
    - a "Guess History" card: `<div><h2>Guess History</h2>{room.guesses.length === 0 ? <p>No guesses submitted.</p> : <ul>{room.guesses.map((g, i) => <li key={i}><span>{g.playerName}</span><span>{g.text}</span><span>{g.isCorrect ? "✓" : "✗"}</span></li>)}</ul>}</div>`;
    - host action row: `<div>{playerName === room.host ? (<button className="button button--primary" onClick={handleRestart} disabled={restarting}>{restarting ? "Restarting..." : "Play Again"}</button>) : (<p>Waiting for host to restart…</p>)}</div>`;
    - error display: `{refreshError && <p className="form__error">{refreshError}</p>}{restartError && <p className="form__error">{restartError}</p>}`
  — FR-001, FR-002, FR-003, FR-004, FR-010, FR-011 — depends: T007

**Checkpoint**: `npx tsc --noEmit` in `frontend/` passes 0 errors. Navigate to `/result`
as the drawer (Alice): secret word shown, scoreboard sorted desc, guess history with ✓/✗,
"Play Again" button visible. Navigate as guesser (Bob): same data, "Waiting for host to
restart…" shown instead of button.

---

## Phase 7: Integration & Validation

**Goal**: TypeScript compile passes clean across both workspaces; all six success criteria
verified with two browser tabs open side by side.

- [ ] T009 [P] Run `npx tsc --noEmit` in both `backend/` and `frontend/` — confirm 0
  TypeScript errors across all changed files (schemas.ts, roomStore.ts, rooms.ts,
  api.ts, state/roomStore.ts, ResultPage.tsx) — depends: T004, T008

- [ ] T010 Manual two-tab end-to-end validation — Tab 1 (Alice, host/drawer) and
  Tab 2 (Bob, guesser): (a) create room, Bob joins, Alice starts game; Bob submits a
  wrong guess then the correct word → confirm both tabs navigate to `/result` within ~2s
  (SC-004); (b) on `/result`: confirm secret word visible to both (SC-001, FR-001);
  confirm scoreboard shows Bob 100 / Alice 0 in descending order (SC-002, FR-002);
  confirm guess history shows both guesses with ✗ then ✓ (SC-003, FR-003); confirm
  Alice sees "Play Again" and Bob sees "Waiting…" (FR-010, FR-011); (c) Alice clicks
  "Play Again" → confirm both tabs navigate to `/lobby` within ~2s (SC-004); confirm
  GET /rooms/:code shows status:"lobby", all scores 0, guesses:[], canvasData:"" (SC-005,
  FR-015); (d) Alice starts a second round → confirm secret word differs from round 1
  (SC-006, FR-017); (e) refresh Bob's `/result` tab mid-test → confirm result data
  restores without manual action (FR-005a); (f) open browser DevTools Network tab and
  confirm `POST /rooms/:code/restart` with non-host playerName returns 403 (FR-012)
  — SC-001, SC-002, SC-003, SC-004, SC-005, SC-006 — depends: T009
