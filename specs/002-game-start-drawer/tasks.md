---
description: "Task list for Game Start & Drawer Flow — Scenario 2"
---

# Tasks: Game Start & Drawer Flow

**Input**: Design documents from `specs/002-game-start-drawer/`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/api.md ✅

## Format: `[ID] [P?] [Story?] Description — file — FR ref`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[US#]**: Maps to User Story in spec.md
- **depends**: Lists task IDs that must complete first

---

## Phase 1: Setup — Shared Backend Type Foundation

**Purpose**: All Scenario 2 backend changes depend on the updated TypeScript interfaces
in `game.ts` and the renamed Zod schema field in `schemas.ts`. Both tasks compile-block
every subsequent backend phase.

**⚠️ CRITICAL**: All Phase 2 tasks block on T001–T002.

- [x] T001 [P] Update `RoomStatus`, `Participant`, `Room`, and `RoomSnapshot` interfaces in `backend/src/models/game.ts` — (1) add `"result"` to `RoomStatus` union; (2) add `role: string` to `Participant` (note: typed as `string` not `ParticipantRole` to allow `""` for lobby state — the only runtime values written are `"drawer"`, `"guesser"`, and `""`); (3) add `wordIndex: number` and `secretWord: string` to `Room`; (4) remove `roles: ParticipantRole[]` from `RoomSnapshot`; (5) add `secretWord?: string` to `RoomSnapshot` — FR-001, FR-002, FR-003, FR-012 — depends: none

- [x] T002 [P] Update `roomViewerQuerySchema` in `backend/src/api/schemas.ts` — rename the single field from `participantId: z.string().optional()` to `player: z.string().optional()` — FR-003 — depends: none

**Checkpoint**: `npx tsc --noEmit` in `backend/` passes with 0 errors. `roomViewerQuerySchema` now parses `player` not `participantId`.

---

## Phase 2: Backend Changes — US1 & US2 Role Assignment, Word Selection, Filtering

**Goal**: `startGame` assigns roles and selects a word; `toRoomSnapshot` filters `secretWord` by viewer role; GET handler passes `?player=` to the snapshot builder; POST start handler guards against double-start.

**Independent Test**: `POST /rooms` → `POST /rooms/:code/join` → `POST /rooms/:code/start` — then `GET /rooms/:code?player=Alice` must include `secretWord`; `GET /rooms/:code?player=Bob` must not. Second call to start must return 400 "Game already started".

- [x] T003 [US1] Update `createParticipant` in `backend/src/services/roomStore.ts` — add `role: ""` to the returned object literal so every new participant starts with an empty role in lobby state — FR-001 — depends: T001

- [x] T004 [US1] Update `createRoom` in `backend/src/services/roomStore.ts` — add `wordIndex: 0` and `secretWord: ""` to the `room` object literal so every new room starts with both fields initialised — FR-002 — depends: T001

- [x] T005 [US2] Update `toRoomSnapshot` in `backend/src/services/roomStore.ts` — (1) rename parameter `viewerParticipantId` → `viewerName: string | undefined`; (2) add `const isDrawer = !!viewerName && room.participants.some(p => p.name === viewerName && p.role === "drawer")`; (3) replace the `roles: [...STARTER_ROLES]` line with `...(isDrawer && room.status === "playing" ? { secretWord: room.secretWord } : {})`; (4) remove the `STARTER_ROLES` import from the import statement at the top of the file (it becomes unused) — Note: `POST /rooms` and `POST /rooms/:code/join` handlers may continue passing `result.participantId` (a UUID) as the `viewerName` arg; this is safe — UUIDs never match player names so `isDrawer` is always `false` and `secretWord` is never exposed on create/join responses — FR-003, FR-004, FR-005 — depends: T001

- [x] T006 [US1] Extend `startGame` in `backend/src/services/roomStore.ts` — insert three new blocks into the existing function body in this order: (a) after the `notEnoughPlayers` guard, add `if (room.status === "playing") return "alreadyStarted" as const`; (b) after `room.status = "playing"`, add `room.participants.forEach(p => { p.role = p.isHost ? "drawer" : "guesser"; })`; (c) after role assignment, add `room.secretWord = STARTER_WORDS[room.wordIndex % STARTER_WORDS.length]; room.wordIndex += 1;`; update the return type to `null | "notHost" | "notEnoughPlayers" | "alreadyStarted" | RoomSnapshot` — ⚠️ ATOMIC PAIR: Apply T008 immediately after T006. Between T006 and T008 the route handler returns `{ room: "alreadyStarted" }` (broken response). Do not commit T006 without T008 — FR-001, FR-002, FR-014 — depends: T001, T003, T004

- [x] T007 [US2] Update `GET /:code` handler in `backend/src/api/rooms.ts` — change `const { participantId } = roomViewerQuerySchema.parse(request.query)` to `const { player } = roomViewerQuerySchema.parse(request.query)` and update the `toRoomSnapshot` call to `toRoomSnapshot(room, player)` — FR-003, FR-004 — depends: T002, T005

- [x] T008 [US1] Update `POST /:code/start` handler in `backend/src/api/rooms.ts` — add a new discriminant check after the existing `"notEnoughPlayers"` mapping: `if (result === "alreadyStarted") { return next(new HttpError(400, "Game already started")); }` — FR-014 — depends: T006

**Checkpoint**: `POST /rooms` + `POST /:code/join` + `POST /:code/start` as Alice → 200 with `participants[0].role: "drawer"` and `participants[1].role: "guesser"`. `GET /:code?player=Alice` → response includes `secretWord`. `GET /:code?player=Bob` → no `secretWord`. Second `POST /:code/start` → 400 `{ "error": "Game already started" }`.

---

## Phase 3: Frontend Changes — Shared Foundation (Types + Store)

**Purpose**: Update frontend TypeScript types to mirror backend model, rename `fetchRoom` query param, and add `fetchRoomByCode` to the store. All GamePage tasks depend on this phase.

**Independent Test**: Frontend compiles with 0 TypeScript errors. `api.fetchRoom` network call uses `?player=` in the query string. LobbyPage polling still works (passes localStorage playerName automatically).

- [x] T009 [P] Update `frontend/src/services/api.ts` type interfaces — (1) remove `ParticipantRole` type definition entirely; (2) add `role: string` to `Participant` interface; (3) remove `roles: ParticipantRole[]` from `RoomSnapshot`; (4) add `secretWord?: string` to `RoomSnapshot`; (5) extend `status` in `RoomSnapshot` from `"lobby" | "playing"` to `"lobby" | "playing" | "result"` — FR-001, FR-002, FR-012 — depends: T001

- [x] T010 [US2] Update `api.fetchRoom` in `frontend/src/services/api.ts` — rename parameter `participantId` → `playerName` and change the query string key from `participantId` to `player`: `const query = playerName ? \`?player=${encodeURIComponent(playerName)}\` : ""` — FR-003 — depends: T009

- [x] T011 [US2] Update `fetchRoom()` in `frontend/src/state/roomStore.ts` — replace `this.state.participantId ?? undefined` with `localStorage.getItem("playerName") ?? undefined` in the `api.fetchRoom` call, so the lobby polling automatically passes the player name as the `?player=` query param — FR-003 — depends: T010

- [x] T012 [US5] Add `fetchRoomByCode(code: string, playerName: string)` method to the `RoomStore` class in `frontend/src/state/roomStore.ts` — the method calls `api.fetchRoom(code, playerName)` directly (bypassing the `this.state.room` null guard), then calls `this.setRoomSnapshot(response.room)` and returns `response.room` — FR-013 — depends: T011

**Checkpoint**: `npx tsc --noEmit` in `frontend/` passes 0 errors. LobbyPage polling still updates the participant list (no visible regression). `api.fetchRoom` network tab shows `?player=<name>` in query string.

---

## Phase 4: Frontend Changes — US3, US4, US5 Game Screen

**Goal**: `/result` placeholder route exists; GamePage redirects on null identity, fetches on mount, polls every 2s, and renders role-appropriate drawer or guesser UI.

**Independent Test**: Navigate to `/game/XXXX` as Alice (drawer) — see "You are drawing!" and the secret word, no guess form. Open in Bob's tab — see "You are guessing!", Alice's name, guess form visible. Both tabs show `?player=<name>` in network requests every ~2s.

- [x] T013 [P] Create `frontend/src/pages/ResultPage.tsx` — minimal placeholder component: `export function ResultPage() { return (<section className="panel placeholder-page"><h1>Results</h1><p>Result screen coming in Scenario 4.</p></section>); }` — no state, no imports beyond React — FR-012 — depends: none

- [x] T014 [P] Add `/result` route to `frontend/src/routes/index.tsx` — import `ResultPage` and add `<Route path="/result" element={<ResultPage />} />` before the `path="*"` catch-all wildcard — FR-012 — depends: T013

- [x] T015 [US5] Add hooks and effects to `frontend/src/pages/GamePage.tsx` — (1) add imports: `useEffect`, `useState` from react; `useRoomState`, `useRoomStore` from `../state/roomStore`; (2) add hook calls: `const roomStore = useRoomStore()`, `const { room } = useRoomState()`, `const [refreshError, setRefreshError] = useState<string | null>(null)`; (3) add redirect guard: `useEffect(() => { if (!playerName) navigate("/", { replace: true }); }, [playerName, navigate])`; (4) add mount-time fetch: `useEffect(() => { if (!code || !playerName) return; roomStore.fetchRoomByCode(code, playerName).catch(err => setRefreshError(err instanceof Error ? err.message : "Unable to load game")); }, [code, playerName, roomStore])` — FR-013, FR-015 — depends: T012, T014

- [x] T016 [US5] Add polling `useEffect` to `frontend/src/pages/GamePage.tsx` — after the mount-time fetch effect, add: `useEffect(() => { if (!code || !playerName) return; const id = setInterval(async () => { try { const updated = await roomStore.fetchRoomByCode(code, playerName); if (updated?.status === "result") navigate("/result"); } catch (err) { setRefreshError(err instanceof Error ? err.message : "Unable to refresh game"); } }, 2000); return () => clearInterval(id); }, [code, playerName, roomStore, navigate])` — FR-006, FR-007, FR-012 — depends: T015

- [x] T017 [US3] Add role derivation and drawer view to `frontend/src/pages/GamePage.tsx` — (1) add before return: `const myRole = room?.participants.find(p => p.name === playerName)?.role ?? ""`; `const drawerName = room?.participants.find(p => p.role === "drawer")?.name ?? ""`; (2) in the right sidebar, replace the existing `<Card title="Player Info">` status `<dd>Playing</dd>` with a role label: `myRole === "drawer" ? "You are drawing!" : myRole === "guesser" ? "You are guessing!" : "Waiting..."`; (3) add below the Player Info card, rendered only when `myRole === "drawer"`: `<Card title="Secret Word"><p className="section-kicker">{room?.secretWord ?? "…"}</p></Card>`; (4) wrap the existing `<Card title="Your Guess"><GuessForm /></Card>` in `{myRole === "guesser" && ...}` so the guess input is hidden from the drawer — FR-008, FR-009 — depends: T016

- [x] T018 [US4] Add guesser-specific drawer identification to `frontend/src/pages/GamePage.tsx` — inside the `<Card title="Player Info">` detail list, add a new `<div>` row rendered only when `myRole === "guesser"`: `<dt>Drawer</dt><dd>{drawerName} is drawing</dd>`; also add `{refreshError && <p className="form__error">{refreshError}</p>}` below the Exit Game button in the button row — FR-010, FR-011 — depends: T017

**Checkpoint**: SC-001 (drawer sees secretWord within one poll); SC-002 (Bob's network responses contain no `secretWord`); SC-003 (both screens show role UI without manual refresh); SC-005 (polling stops on unmount — confirm no console intervals after navigating away).

---

## Phase 5: Integration & Polish

**Goal**: TypeScript compile passes clean across both workspaces; all five success criteria verified with two browser tabs.

- [ ] T019 [P] Run `npm run build` (or `npx tsc --noEmit`) in both `backend/` and `frontend/` — confirm 0 TypeScript errors across all changed files — depends: T008, T018

- [ ] T020 Manual two-tab end-to-end validation — Tab 1 (Alice, host/drawer): create room, verify lobby shows "(Host)" and "Start Game" button; add Bob in Tab 2; Alice clicks Start; verify Tab 1 shows "You are drawing!" + secret word + no guess form; verify Tab 2 shows "You are guessing!" + "Alice is drawing" + guess form; refresh Tab 1 (test FR-013 mount fetch); verify secret word reappears; confirm `GET /rooms/:code?player=Alice` in network tab includes `secretWord` and `GET /rooms/:code?player=Bob` does not — SC-001, SC-002, SC-003, SC-004, SC-005 — depends: T019

**Checkpoint**: All five success criteria pass in two-tab manual test. `roles[]` is absent from all network responses. LobbyPage polling (Scenario 1) still works without regression.
