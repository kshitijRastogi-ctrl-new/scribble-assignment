---
description: "Task list for Room Setup & Lobby — Scenario 1"
---

# Tasks: Room Setup & Lobby

**Input**: Design documents from `specs/001-room-setup-lobby/`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/api.md ✅

## Format: `[ID] [P?] [Story?] Description — file — FR ref`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[US#]**: Maps to User Story in spec.md
- **depends**: Lists task IDs that must complete first

---

## Phase 1: Setup — Shared Backend Foundation

**Purpose**: Type definitions and schemas that every backend task depends on. Must complete before any Phase 2 work begins.

**⚠️ CRITICAL**: All backend user story tasks block on T001–T004.

- [x] T001 Update `RoomStatus`, `Participant`, `Room`, and `RoomSnapshot` interfaces in `backend/src/models/game.ts` — add `"playing"` to `RoomStatus`, add `isHost: boolean` and `score: number` to `Participant`, add `host: string` to `Room` and `RoomSnapshot` — FR-001, FR-002, FR-011 — depends: none

- [x] T002 Tighten `createRoomSchema` and `joinRoomSchema` in `backend/src/api/schemas.ts` — change `playerName` from `z.string().optional()` to `z.string().trim().min(1, { message: "Name cannot be empty" })` in both schemas — FR-003 — depends: none

- [x] T003 [P] Add `startGameSchema` to `backend/src/api/schemas.ts` — `z.object({ playerName: z.string().trim().min(1) })` — export it alongside existing schemas — FR-011, FR-012 — depends: none

- [x] T004 [P] Update `errorHandler` in `backend/src/api/router.ts` — change all response bodies from `{ message: ... }` to `{ error: ... }`, including the Zod branch which must return `{ error: "Invalid request payload" }` — FR-003, FR-004, FR-012, FR-013 — depends: none

**Checkpoint**: Types compile, schemas reject empty strings, error responses use `error` key.

---

## Phase 2: Backend Changes — US1 Host Tracking (Priority: P1)

**Goal**: Room creator is stored as host; GET /rooms/:code returns `host` and `isHost` on each participant.

**Independent Test**: Call `POST /rooms` with `{ "playerName": "Alice" }`, then `GET /rooms/:code` — response must contain `host: "Alice"` and `participants[0].isHost: true`.

- [x] T005 [US1] Update `createParticipant` in `backend/src/services/roomStore.ts` — add `isHost: boolean` parameter, add `score: 0` to returned object, remove the `displayName()` fallback helper and its call (name is now guaranteed non-empty by Zod) — FR-001 — depends: T001

- [x] T006 [US1] Update `createRoom` in `backend/src/services/roomStore.ts` — call `createParticipant(playerName, true)`, set `room.host = playerName` on the new room object — FR-001 — depends: T005

- [x] T007 [US1] Update `toRoomSnapshot` in `backend/src/services/roomStore.ts` — add `host: room.host` to the returned snapshot object so every GET response includes the host name — FR-002 — depends: T001, T006

- [x] T008 [US1] Verify `POST /rooms` handler in `backend/src/api/rooms.ts` — the Zod parse failure now produces `{ error: "Name cannot be empty" }` via T004's updated errorHandler; confirm no extra error-wrapping logic is needed in the route handler itself — FR-003 — depends: T002, T004, T006

**Checkpoint**: `POST /rooms { "playerName": "Alice" }` → 201 with `host: "Alice"`, `participants[0].isHost: true`, `participants[0].score: 0`. `POST /rooms {}` → 400 `{ "error": "Name cannot be empty" }`.

---

## Phase 3: Backend Changes — US2 Name Validation & US3 Code/Duplicate Validation (Priority: P1)

**Goal**: Empty/whitespace names rejected 400; empty codes rejected 400; non-existent codes rejected 404; duplicate names rejected 409.

**Independent Test**: Attempt join with empty name → 400. Attempt join with missing room code → 400. Attempt join unknown code → 404. Create room as Alice, attempt join as Alice → 409.

- [ ] T009 [US3] Update `joinRoom` in `backend/src/services/roomStore.ts` — (1) return string discriminant `"emptyCode"` if `code.trim()` is empty before the Map lookup; (2) return `"duplicateName"` if `room.participants.some(p => p.name === trimmedName)` after trim; (3) call `createParticipant(playerName, false)` (isHost false for all joiners) — FR-004, FR-014 — depends: T005

- [ ] T010 [US2] Update `POST /rooms/:code/join` handler in `backend/src/api/rooms.ts` — before calling `joinRoom`, check `code.trim() === ""` and throw `HttpError(400, "Room code cannot be empty")`; after `joinRoom` returns, map `"duplicateName"` discriminant → `HttpError(409, "Name already taken in this room")`; map `null` → `HttpError(404, "Room not found")` — FR-004, FR-013, FR-014 — depends: T004, T009

- [ ] T011 [US3] Fix `GET /rooms/:code` error message in `backend/src/api/rooms.ts` — change `"Unable to load room"` to `"Room not found"` in the HttpError throw — FR-004 — depends: T004

**Checkpoint**: `POST /rooms/:code/join` with empty code → 400. With unknown code → 404. With duplicate name → 409. All error bodies use `{ "error": "..." }`.

---

## Phase 4: Backend Changes — US5 Start Game (Priority: P2)

**Goal**: `POST /rooms/:code/start` transitions room to `"playing"`; only host can call it; requires ≥2 players.

**Independent Test**: Create room (Alice), join room (Bob), call start as Alice → 200 `{ room: { status: "playing" } }`. Call start as Bob → 403. Call start with 1 player → 400.

- [ ] T012 [US5] Add `startGame(code, playerName)` function to `backend/src/services/roomStore.ts` — return `null` if room not found; return string `"notHost"` if `playerName !== room.host`; return string `"notEnoughPlayers"` if `room.participants.length < 2`; otherwise set `room.status = "playing"`, call `saveRoom`, and return the updated `RoomSnapshot` via `toRoomSnapshot` — FR-011, FR-012 — depends: T007, T009

- [ ] T013 [US5] Add `POST /rooms/:code/start` route handler to `backend/src/api/rooms.ts` — parse body with `startGameSchema`, call `startGame(code, playerName)`, map `null` → `HttpError(404, "Room not found")`, `"notHost"` → `HttpError(403, "Only the host can start the game")`, `"notEnoughPlayers"` → `HttpError(400, "Need at least 2 players to start")`; on success respond 200 `{ room }` — FR-011, FR-012 — depends: T003, T004, T012

**Checkpoint**: Full start-game flow works via curl/Postman before touching the frontend.

---

## Phase 5: Frontend Changes — Shared Foundation

**Purpose**: Fix the starter URL bug, update shared types, wire error key. All frontend user story tasks depend on T014.

- [ ] T014 Fix `frontend/src/services/api.ts` — (1) change fallback URL from `"http://localhost:3001/bug"` to `"http://localhost:3001"`; (2) add `isHost: boolean` and `score: number` to `Participant` interface; (3) add `host: string` to `RoomSnapshot` interface; (4) update `status` union from `"lobby"` to `"lobby" | "playing"`; (5) change error parsing from `errorBody.message` to `errorBody.error` — FR-002 — depends: T001

- [ ] T015 [P] [US5] Add `startGame(code, playerName)` method to `frontend/src/services/api.ts` — `POST /rooms/${code}/start` with body `{ playerName }`, return type `{ room: RoomSnapshot }` — FR-011 — depends: T014

- [ ] T016 [US1] Add localStorage writes to `frontend/src/state/roomStore.ts` — after `this.setRoomSession(response)` in both `createRoom` and `joinRoom` methods, call `localStorage.setItem("playerName", playerName)` and `localStorage.setItem("roomCode", response.room.code)` — FR-001 — depends: T014

- [ ] T017 [P] [US5] Add `startGame(playerName)` method to `frontend/src/state/roomStore.ts` — call `api.startGame(this.state.room!.code, playerName)` inside `withLoading`, then call `this.setRoomSnapshot(response.room)` — FR-011 — depends: T015, T016

**Checkpoint**: Frontend compiles with no type errors against updated backend types. API base URL resolves correctly.

---

## Phase 6: Frontend Changes — US2 & US3 Form Validation (Priority: P1)

**Goal**: Empty/whitespace names and codes are caught client-side with inline errors; no API call made on invalid input.

**Independent Test**: On Create Room form, submit blank name → inline "Name cannot be empty" error, no navigation. On Join Room form, submit blank code → inline error. Submit blank name → inline error.

- [ ] T018 [US2] Update `frontend/src/pages/CreateRoomPage.tsx` — in `handleSubmit`, trim `playerName` before use; if trimmed value is empty, call `setError("Name cannot be empty")` and `return` without calling `roomStore.createRoom` — FR-003, FR-013 — depends: T016

- [ ] T019 [US3] Update `frontend/src/pages/JoinRoomPage.tsx` — in `handleSubmit`, trim both `playerName` and `roomCode`; guard: if trimmed name is empty → `setError("Name cannot be empty")` and return; if trimmed code is empty → `setError("Room code cannot be empty")` and return; pass trimmed values to `roomStore.joinRoom` — FR-003, FR-004, FR-013 — depends: T016

**Checkpoint**: Both forms show inline errors on empty submission with no navigation. Valid inputs still succeed.

---

## Phase 7: Frontend Changes — US4 Route & Navigation (Priority: P2)

**Goal**: Game screen is reachable at `/game/:code`; GamePage reads identity from route param and localStorage.

**Independent Test**: After navigating manually to `/game/ABCD`, the page renders without crashing and can read the room code from the URL.

- [ ] T020 [US4] Update `frontend/src/routes/index.tsx` — change `<Route path="/game" element={<GamePage />} />` to `<Route path="/game/:code" element={<GamePage />} />` — FR-006 — depends: T014

- [ ] T021 [US4] Update `frontend/src/pages/GamePage.tsx` — add `const { code } = useParams<{ code: string }>()` and `const playerName = localStorage.getItem("playerName")`; remove the redirect guard that navigates away if `!room` (room store may be empty after page refresh; game screen hydration from route is a Scenario 3 concern); use `code` and `playerName` for display — FR-006 — depends: T020

**Checkpoint**: Navigating to `/game/XXXX` renders the game screen without a crash or redirect.

---

## Phase 8: Frontend Changes — US1 Lobby Host Display (Priority: P1)

**Goal**: Host participant is labelled "(Host)" in the lobby list on every render.

**Independent Test**: After creating a room, the lobby shows "(Host)" next to the creator's name. The second player who joins does not have the label.

- [ ] T022 [US1] Update participant list in `frontend/src/pages/LobbyPage.tsx` — in the `map` over `room.participants`, add `{participant.isHost ? " (Host)" : ""}` as a `<span>` or inline text after the participant name — FR-008 — depends: T014

**Checkpoint**: Creator sees "(Host)" next to their name. Second tab (joiner) sees no "(Host)" label on their own name.

---

## Phase 9: Frontend Changes — US4 Lobby Polling (Priority: P2)

**Goal**: Lobby auto-polls every ~2s; detects `"playing"` status and navigates to `/game/:code`; stops on unmount.

**Independent Test**: Open two tabs. Without clicking anything in tab 1, join in tab 2 → tab 1 participant list updates within 2 seconds. Host clicks Start → both tabs navigate to game screen within 2 seconds.

- [ ] T023 [US4] Add localStorage read + `isHost` derivation to `frontend/src/pages/LobbyPage.tsx` — at component top, read `const playerName = localStorage.getItem("playerName") ?? ""`; derive `const isHost = playerName === room?.host` — FR-008, FR-009 — depends: T022

- [ ] T024 [US4] Add polling `useEffect` to `frontend/src/pages/LobbyPage.tsx` — `useEffect` depends on `[room?.code]`; inside, call `const id = setInterval(async () => { await roomStore.fetchRoom() }, 2000)`; return `() => clearInterval(id)` as cleanup — FR-005, FR-007 — depends: T023

- [ ] T025 [US4] Add status-check navigation to the poll callback in `frontend/src/pages/LobbyPage.tsx` — after `roomStore.fetchRoom()` resolves, read the updated room from `useRoomState()` (already subscribed); if `room?.status === "playing"` call `navigate(\`/game/${room.code}\`)` — FR-006 — depends: T024

**Checkpoint**: SC-001 passes (second player appears within ~2s). Both tabs navigate to game screen after host starts.

---

## Phase 10: Frontend Changes — US5 Start Game UI (Priority: P2)

**Goal**: Host sees an enabled/disabled "Start Game" button; non-hosts see a waiting message; clicking Start triggers the backend and all clients navigate via polling.

**Independent Test**: In host tab (1 player) — button present but disabled with message. After second player joins — button enabled. In non-host tab — button absent, waiting message shown. Host clicks Start — both tabs navigate to game within ~2s.

- [ ] T026 [US5] Add host-only "Start Game" button to `frontend/src/pages/LobbyPage.tsx` — replace the existing unconditional "Start Game" button with: if `isHost`, render `<button disabled={room.participants.length < 2} onClick={handleStart}>Start Game</button>`; if `room.participants.length < 2`, also render `<p>Need at least 2 players to start</p>` below the button — FR-009, FR-010 — depends: T023

- [ ] T027 [US5] Add non-host waiting message to `frontend/src/pages/LobbyPage.tsx` — in the else branch (not `isHost`), render `<p>Waiting for host to start…</p>` in place of the Start Game button — FR-009 — depends: T026

- [ ] T028 [US5] Wire `handleStart` in `frontend/src/pages/LobbyPage.tsx` — add `async function handleStart() { try { await roomStore.startGame(playerName) } catch (err) { /* show inline error via setRefreshError */ } }`; room status transitions to `"playing"` which the existing poll (T025) will detect and navigate — FR-011, FR-012 — depends: T025, T026

**Checkpoint**: SC-005 (Start Game inaccessible to non-hosts), SC-006 (both tabs navigate within one poll cycle after host starts).

---

## Phase 11: Integration & Polish

**Purpose**: End-to-end validation of all acceptance criteria across two browser tabs.

- [ ] T029 Run backend (`npm run dev` in `backend/`) and frontend (`npm run dev` in `frontend/`), open two browser tabs, and manually validate all 6 success criteria from spec.md: SC-001 (2s poll), SC-002 (name errors), SC-003 (code errors), SC-004 (host label), SC-005 (start button gating), SC-006 (both tabs navigate on start) — depends: T028

- [ ] T030 [P] Run `npm run build` in `backend/` and `npm run build` in `frontend/` to confirm TypeScript compiles with no errors after all changes — depends: T028

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — T001–T004 can all start immediately; T002, T003, T004 are parallel [P]
- **Phase 2 (Backend US1)**: Depends on T001, T002, T004
- **Phase 3 (Backend US2/US3)**: Depends on T005 (for isHost param); T010, T011 depend on T004 (error key)
- **Phase 4 (Backend US5)**: Depends on T007, T009; T013 also depends on T003
- **Phase 5 (Frontend Foundation)**: Depends on T001 (types); T015 and T016 are parallel after T014
- **Phase 6 (Frontend US2/US3)**: Depends on T016
- **Phase 7 (Frontend US4 Route)**: Depends on T014
- **Phase 8 (Frontend US1 Display)**: Depends on T014
- **Phase 9 (Frontend US4 Polling)**: Depends on T022; T024 depends on T023; T025 depends on T024
- **Phase 10 (Frontend US5 UI)**: Depends on T023 (isHost), T025 (polling in place); T027 depends on T026; T028 depends on T025, T026
- **Phase 11 (Integration)**: Depends on T028 (all implementation complete)

### Critical Path

```
T001 → T005 → T006 → T007 → T012 → T013  (backend host + start)
T002 → T008                                (name validation)
T004 → T010 → T011                         (error key + join handler)
T014 → T016 → T023 → T024 → T025 → T028 → T029  (frontend critical path)
```

### Parallel Opportunities

Within Phase 1 (all can start immediately):
```
T001  (types)
T002  (schemas playerName)
T003  (startGameSchema)       [P]
T004  (errorHandler)          [P]
```

Within Phase 5 (after T014):
```
T015  (api.ts startGame)      [P]
T016  (roomStore localStorage)
T017  (roomStore startGame)   [P] after T015, T016
```

Within Phase 11:
```
T029  (manual validation)
T030  (build check)           [P]
```

---

## Implementation Strategy

### MVP First (Backend + Core Validation)

1. Complete Phase 1: T001–T004
2. Complete Phase 2: T005–T008 (host tracking works end-to-end in backend)
3. Complete Phase 3: T009–T011 (join validation works)
4. Complete Phase 5 foundation: T014, T016
5. Complete Phase 6: T018, T019 (forms validate client-side)
6. **STOP and validate**: Create room, join room, see host label, confirm validation errors
7. Proceed to Phase 4 (start game backend), then Phases 9–10 (polling + start UI)

### Story Completion Targets

| Story | Backend tasks | Frontend tasks | Done when |
|-------|---------------|---------------|-----------|
| US1 (Host Tracking) | T005–T008 | T016, T022 | Lobby shows "(Host)" after create |
| US2 (Name Validation) | T002, T008 | T018 | Create form rejects empty names |
| US3 (Code Validation) | T009–T011 | T019 | Join form rejects empty/bad codes |
| US4 (Polling) | — | T020–T025 | Second tab updates within 2s |
| US5 (Start Game) | T012–T013 | T015, T017, T026–T028 | Both tabs navigate on start |

---

## Notes

- [P] = different files or provably independent — safe to work in parallel
- FR references link each task to an acceptance criterion in spec.md
- `depends:` lists hard predecessors — do not begin a task until its dependencies are checked off
- Commit after each task or logical group (T005+T006+T007 can be one commit: "feat(scenario-1): add host tracking to room store")
- Do not skip T029 — two-tab manual validation is the only way to verify SC-001 and SC-006
