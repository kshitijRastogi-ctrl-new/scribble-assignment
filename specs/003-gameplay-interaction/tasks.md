---
description: "Task list for Gameplay Interaction — Scenario 3"
---

# Tasks: Gameplay Interaction

**Input**: Design documents from `specs/003-gameplay-interaction/`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/api.md ✅

## Format: `[ID] [P?] [Story?] Description — file — FR ref`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[US#]**: Maps to User Story in spec.md
- **depends**: Lists task IDs that must complete first

---

## Phase 1: Setup — Shared Backend Type Foundation

**Purpose**: All Scenario 3 backend and frontend changes depend on the updated TypeScript
interfaces in `game.ts`. The `Guess` type and new `Room`/`RoomSnapshot` fields compile-block
every subsequent phase. The two Zod schemas are independent and can be written in parallel.

**⚠️ CRITICAL**: All Phase 2 tasks block on T001. T002 can run in parallel with T001.

- [x] T001 [P] Add `Guess` interface and extend `Room` and `RoomSnapshot` in `backend/src/models/game.ts` — (1) add `export interface Guess { playerName: string; text: string; isCorrect: boolean }` before the `Participant` interface; (2) add `canvasData: string` and `guesses: Guess[]` to the `Room` interface (after `secretWord: string`); (3) add `canvasData: string` and `guesses: Guess[]` to the `RoomSnapshot` interface (after `availableWords: string[]`) — FR-006, FR-014, FR-017 — depends: none

- [x] T002 [P] Add `canvasSchema` and `guessSchema` to `backend/src/api/schemas.ts` — (1) add `export const canvasSchema = z.object({ canvasData: z.string() })` after `startGameSchema`; (2) add `export const guessSchema = z.object({ playerName: z.string().trim().min(1, { message: "Name cannot be empty" }), guess: z.string() })` after `canvasSchema` — FR-006, FR-010 — depends: none

**Checkpoint**: `npx tsc --noEmit` in `backend/` passes 0 errors. `game.ts` exports `Guess` type. `schemas.ts` exports `canvasSchema` and `guessSchema`.

---

## Phase 2: Backend Service — Room Initialisation & Snapshot

**Purpose**: `createRoom` must initialise the two new Room fields so every room starts
with empty canvas and guess history. `toRoomSnapshot` must include both fields in every
GET response. Both can be applied in parallel after T001.

- [x] T003 [P] Update `createRoom` in `backend/src/services/roomStore.ts` — add `canvasData: ""` and `guesses: []` to the `room` object literal inside `createRoom`, after `secretWord: ""` — FR-006, FR-014 — depends: T001

- [x] T004 [P] Update `toRoomSnapshot` in `backend/src/services/roomStore.ts` — add `canvasData: room.canvasData` and `guesses: room.guesses.map(g => ({ ...g }))` to the returned object (insert after the `availableWords: listWords()` line and before the `secretWord` conditional spread) — FR-007, FR-017 — depends: T001

**Checkpoint**: `npx tsc --noEmit` in `backend/` passes 0 errors. `GET /rooms/:code` response now contains `canvasData: ""` and `guesses: []` for a newly created room.

---

## Phase 3: Backend Service — Canvas and Guess Logic

**Purpose**: Adds the two new service functions that power the new endpoints. Both depend
on T003 and T004 (room must have the new fields; snapshot must include them). They can be
written in parallel.

**⚠️ ATOMIC PAIRS**: Apply T005 before T007; apply T006 before T008. Between adding a
service function and its handler the endpoint does not exist, so these pairs must not be
split across separate commits.

- [x] T005 [P] [US1] Add `updateCanvas` function to `backend/src/services/roomStore.ts` — add `export function updateCanvas(code: string, canvasData: string): RoomSnapshot | null` after `startGame`: (1) `const room = rooms.get(code)`; return `null` if not found; (2) `room.canvasData = canvasData`; (3) `saveRoom(room)`; (4) `return toRoomSnapshot(room)` — FR-006 — depends: T001, T003, T004

- [x] T006 [P] [US3] Add `submitGuess` function to `backend/src/services/roomStore.ts` — add `export function submitGuess(code: string, playerName: string, guess: string): RoomSnapshot | null | "roundOver"` after `updateCanvas`: (1) get room, return `null` if not found; (2) `if (room.status === "result") return "roundOver" as const`; (3) `const trimmed = guess.trim()`; (4) `const isCorrect = trimmed.toLowerCase() === room.secretWord.toLowerCase()`; (5) if `isCorrect`: find participant by name, if found add 100 to score, then set `room.status = "result"` and immediately add the inline comment `// INVARIANT: do not clear guesses or canvasData — Scenario 4 result screen depends on both`; (6) `room.guesses.push({ playerName, text: trimmed, isCorrect })`; (7) `saveRoom(room)`; (8) `return toRoomSnapshot(room)` — FR-011, FR-012, FR-013, FR-014, FR-015, FR-016 — depends: T001, T003, T004

**Checkpoint**: `npx tsc --noEmit` in `backend/` passes 0 errors. `updateCanvas` and `submitGuess` are exported from `roomStore.ts`.

---

## Phase 4: Backend API — New Endpoint Handlers

**Purpose**: Registers the two new REST endpoints. Both handlers are added to `rooms.ts`
before the `return router` line and can be written in parallel.

- [x] T007 [P] [US1] Add `POST /:code/canvas` handler to `backend/src/api/rooms.ts` — (1) add `canvasSchema` to the import from `./schemas.js` and `updateCanvas` to the import from `../services/roomStore.js`; (2) add handler before `return router`: use `roomCodeParamsSchema.safeParse(request.params)` for the code param → `next(new HttpError(400, "Invalid room code"))` on failure (use safeParse, not parse/throw — consistent with T008 and the existing REST 400 convention throughout the codebase); safeParse body with `canvasSchema` → `next(new HttpError(400, "Invalid canvas data"))` on failure; call `updateCanvas(code.toUpperCase(), parsed.data.canvasData)` → `next(new HttpError(404, "Room not found"))` if null; `response.json({ ok: true })` on success — FR-004, FR-005, FR-006 — depends: T002, T005

- [x] T008 [P] [US3] Add `POST /:code/guess` handler to `backend/src/api/rooms.ts` — (1) add `guessSchema` to the import from `./schemas.js` and `submitGuess` to the import from `../services/roomStore.js`; (2) add handler after `/:code/canvas`: safeParse code with `roomCodeParamsSchema.safeParse(request.params)` → 400 on failure; safeParse body with `guessSchema` → 400 with Zod message on failure; call `submitGuess(code.toUpperCase(), playerName, guess)`; map discriminants: `null` → 404 "Room not found", `"roundOver"` → 400 "Round already over"; `response.json({ room: result })` on success — FR-010, FR-011, FR-014, FR-015, FR-016 — depends: T002, T006

**Checkpoint**: `npx tsc --noEmit` in `backend/` passes 0 errors. Manual test: `POST /rooms/:code/canvas` stores canvas data and returns `{ ok: true }`; `POST /rooms/:code/guess` returns updated room with correct score; second correct guess returns `{ "error": "Round already over" }` with 400.

---

## Phase 5: Frontend Type Foundation

**Purpose**: Updates the frontend TypeScript types to mirror the backend model changes
and adds the two new API methods. T009 must precede T010 since the new methods reference
the updated `RoomSnapshot` type.

- [x] T009 [P] Update `frontend/src/services/api.ts` type interfaces — (1) add `export interface Guess { playerName: string; text: string; isCorrect: boolean }` after the `RoomSessionResponse` interface; (2) add `canvasData: string` and `guesses: Guess[]` to the `RoomSnapshot` interface (after `availableWords: string[]`) — FR-007, FR-017 — depends: T001 — ⚠️ NOTE: Adding `canvasData` and `guesses` as required fields to `RoomSnapshot` will break any existing `RoomSnapshot` mock in `api.test.ts`. When applying T009, also update `api.test.ts` to add `canvasData: ""` and `guesses: []` to any `RoomSnapshot` fixture objects to keep TypeScript compile clean.

- [x] T010 [US1] Add `api.updateCanvas` and `api.submitGuess` methods to `frontend/src/services/api.ts` — add after `startGame` in the `api` object: (1) `updateCanvas(code: string, canvasData: string)` calls `request<{ ok: boolean }>(\`/rooms/\${encodeURIComponent(code)}/canvas\`, { method: "POST", body: JSON.stringify({ canvasData }) })`; (2) `submitGuess(code: string, playerName: string, guess: string)` calls `request<{ room: RoomSnapshot }>(\`/rooms/\${encodeURIComponent(code)}/guess\`, { method: "POST", body: JSON.stringify({ playerName, guess }) })` — FR-004, FR-010 — depends: T009

**Checkpoint**: `npx tsc --noEmit` in `frontend/` passes 0 errors. `api.ts` exports `Guess` interface. `RoomSnapshot` has `canvasData` and `guesses` fields.

---

## Phase 6: Frontend Components

**Purpose**: Activates the four existing placeholder/stub components. All four can be
written in parallel — each touches a different file and the only shared dependency is
the updated `api.ts` types from T009.

- [x] T011 [P] [US1] Create `frontend/src/components/DrawingCanvas.tsx` (new file) — implement with: (1) props interface `{ role: string; canvasData: string; onStrokeEnd: (dataUrl: string) => void }`; (2) `canvasRef = useRef<HTMLCanvasElement>(null)` and `[isDrawing, setIsDrawing] = useState(false)`; (3) helper `getXY(e)` that extracts `offsetX`/`offsetY` from the event; (4) mouse handlers attached only when `role === "drawer"`: `onMouseDown` — `setIsDrawing(true)`, `ctx.beginPath()`, `ctx.moveTo(x,y)`; `onMouseMove` — if drawing: `ctx.lineTo(x,y)`, `ctx.stroke()` (lineWidth `4`, strokeStyle `"#000000"`, lineCap `"round"`); `onMouseUp` and `onMouseLeave` — if drawing: `setIsDrawing(false)`, call `onStrokeEnd(canvas.toDataURL("image/png"))`; (5) `useEffect([canvasData])`: if `canvasData === ""` call `ctx.clearRect(…)`, else create `new Image()`, set `img.onload = () => { ctx.clearRect(…); ctx.drawImage(img, 0, 0) }`, set `img.src = canvasData`; (6) `handleClear`: `ctx.clearRect(…)`, call `onStrokeEnd(canvas.toDataURL("image/png"))`; (7) render a `<canvas>` (800×500, cursor `"crosshair"` for drawer / `"default"` otherwise) with the mouse handlers, and a "Clear" button in a `button-row button-row--compact` div shown only when `role === "drawer"` — FR-001, FR-002, FR-003, FR-004, FR-005 — depends: T009

- [x] T012 [P] [US3] Update `frontend/src/components/GuessForm.tsx` — (1) extend `GuessFormProps` with `onSubmit?: (guess: string) => Promise<void>`; (2) add `const [error, setError] = useState<string | null>(null)` and `const [submitting, setSubmitting] = useState(false)`; (3) replace the no-op `handleSubmit` body with: `event.preventDefault()`, `const trimmed = guessText.trim()`, if `trimmed === ""` → `setError("Guess cannot be empty")` and `return`, else `setError(null)`, `setSubmitting(true)`, `try { await onSubmit?.(trimmed); setGuessText("") } catch (err) { setError(err instanceof Error ? err.message : "Submission failed") } finally { setSubmitting(false) }`; (4) add `{error && <p className="form__error">{error}</p>}` below the label/input element; (5) disable both the input and submit button when `submitting || disabled` — FR-008, FR-009, FR-010 — depends: T009

- [x] T013 [P] [US5] Update `frontend/src/components/Scoreboard.tsx` — (1) add `import type { Participant } from "../services/api"`; (2) add `interface ScoreboardProps { participants?: Participant[] }` and destructure it in the function signature; (3) inside the Card body replace the hardcoded placeholder block with: if `participants?.length` render one `<div className="placeholder-row">` per participant showing `p.name` (left) and `p.score` (right, `<strong>`), else render the existing placeholder row ("Waiting for players..." / 0) — FR-018 — depends: T009

- [x] T014 [P] [US5] Update `frontend/src/components/ResultPanel.tsx` — (1) add `import type { Guess } from "../services/api"`; (2) add `interface ResultPanelProps { guesses?: Guess[] }` and destructure it in the function signature; (3) inside the Card body replace the placeholder paragraph with: if `guesses?.length` render one row per guess showing `g.playerName`, `g.text`, and `✓` (correct) or `✗` (incorrect), else render the existing placeholder paragraph ("Game activity and guesses will appear here.") — FR-019 — depends: T009

**Checkpoint**: `npx tsc --noEmit` in `frontend/` passes 0 errors. `DrawingCanvas` renders a canvas element and a Clear button for drawer. `GuessForm` shows "Guess cannot be empty" on empty submit without sending a network request. `Scoreboard` and `ResultPanel` render live data when props provided.

---

## Phase 7: Frontend Page Integration

**Purpose**: Wires all components together in `GamePage.tsx`. Split into two tasks:
T015 adds the imports and callback functions (pure JS, no JSX changes), T016 performs
the JSX substitutions. T016 depends on T015 and all four component tasks.

- [x] T015 [US1] Update `frontend/src/pages/GamePage.tsx` — add imports and callbacks: (1) add `import { api } from "../services/api"` to the import block (GamePage.tsx currently does not import `api` directly — this is needed for `handleCanvasUpdate` and `handleGuessSubmit`); (2) add `import { DrawingCanvas } from "../components/DrawingCanvas"`; (3) add before `return`: `async function handleCanvasUpdate(dataUrl: string) { if (!code) return; api.updateCanvas(code, dataUrl).catch(err => setRefreshError(err instanceof Error ? err.message : "Canvas upload failed")); }`; (4) add before `return`: `async function handleGuessSubmit(guess: string) { if (!code || !playerName) return; const result = await api.submitGuess(code, playerName, guess); roomStore.setRoomSnapshot(result.room); if (result.room.status === "result") navigate("/result"); }` — FR-004, FR-010, FR-015 — depends: T010, T011

- [x] T016 [US1] Update `frontend/src/pages/GamePage.tsx` — apply all JSX changes: (1) in the Canvas `<Card>`, replace the `<div className="canvas-placeholder" style={{ minHeight: '500px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>Waiting for drawer...</div>` with `<DrawingCanvas role={myRole} canvasData={room?.canvasData ?? ""} onStrokeEnd={handleCanvasUpdate} />`; (2) in the left sidebar, change `<Scoreboard />` to `<Scoreboard participants={room?.participants ?? []} />`; (3) in the left sidebar, change `<ResultPanel />` to `<ResultPanel guesses={room?.guesses ?? []} />`; (4) inside the `{myRole === "guesser" && ...}` block for `Your Guess`, change `<GuessForm />` to `<GuessForm onSubmit={handleGuessSubmit} />` — FR-001, FR-018, FR-019 — depends: T015, T012, T013, T014

**Checkpoint**: `npx tsc --noEmit` in `frontend/` passes 0 errors. Start frontend dev server: navigate to `/game/XXXX` as drawer — canvas element visible, Clear button visible, canvas placeholder div gone. Navigate as guesser — canvas read-only (no Clear button), GuessForm interactive.

---

## Phase 8: Integration & Polish

**Goal**: TypeScript compile passes clean across both workspaces; all five success criteria
verified with two browser tabs.

- [x] T017 [P] Run `npm run build` (or `npx tsc --noEmit`) in both `backend/` and `frontend/` — confirm 0 TypeScript errors across all changed files — depends: T008, T016

- [x] T018 Manual two-tab end-to-end validation — Tab 1 (Alice, drawer): create room, Bob joins, Alice starts game; Alice draws a stroke on canvas; confirm `POST /rooms/:code/canvas` appears in Network tab; confirm Bob's tab (Tab 2) shows the drawing within ~2s; Bob types `"  Rocket  "` and submits → confirm request body has `{ "playerName": "Bob", "guess": "Rocket" }`; confirm Bob's score stays 0 (wrong guess); Bob submits `"rocket"` (correct) → confirm score becomes 100, history shows both guesses (✗ then ✓), both tabs navigate to `/result` within ~2s; attempt a third guess → confirm 400 `"Round already over"` in Network tab; Alice clicks Clear → confirm Bob's tab shows blank canvas within ~2s — SC-001, SC-002, SC-003, SC-004, SC-005 — depends: T017
