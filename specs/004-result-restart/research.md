# Research: Result, Restart & Final Validation

**Branch**: `004-result-restart` | **Date**: 2026-06-01

All unknowns resolved from the Scenario 4 clarification session and direct codebase
inspection. No external research required — all answers are derivable from the existing
Scenarios 1–3 implementation.

---

## Decision 1 — `secretWord` exposure mechanism

**Decision**: Backend change to `toRoomSnapshot` is required.

**Rationale**: `toRoomSnapshot` (backend/src/services/roomStore.ts) currently applies
`...(isDrawer && room.status === "playing" ? { secretWord: room.secretWord } : {})`.
When `room.status === "result"`, the field is not spread into the snapshot at all — it
is absent from `GET /rooms/:code` responses at round end. A frontend-only fix cannot
work because the API never sends the field. The fix is a single targeted condition
change: add `|| room.status === "result"` to the spread guard. This is the minimum
change that satisfies FR-020 without breaking the Scenario 2 behaviour (word still
hidden from guessers during play).

**Alternatives considered**: Exposing `secretWord` unconditionally on every GET — rejected
because it leaks the word to guessers during an active round.

---

## Decision 2 — ResultPage identity (no `:code` URL param)

**Decision**: Read `roomCode` from `localStorage.getItem("roomCode")` and `playerName`
from `localStorage.getItem("playerName")`. Route stays `/result`.

**Rationale**: Both keys are written by `roomStore.createRoom` and `roomStore.joinRoom`
(frontend/src/state/roomStore.ts:84). They persist across client-side navigations and
page refreshes. The existing `/result` route has no `:code` param and no route change
is needed. Using `localStorage` is consistent with GamePage (reads `playerName`) and
avoids adding URL state that the router doesn't already model.

**Alternatives considered**: Adding a `/:code` param to `/result` — rejected as it
would require a route definition change and re-navigation from GamePage, adding
unnecessary scope.

---

## Decision 3 — Mount-time fetch before polling interval (FR-005a)

**Decision**: ResultPage performs one immediate `roomStore.fetchRoomByCode(code, playerName)`
call on mount, before the `setInterval` is started.

**Rationale**: Without this, a page refresh leaves `roomStore.state.room` as null
(React state resets). `roomStore.fetchRoom()` guards with `if (!this.state.room) return null`
(roomStore.ts:97), so the polling interval would silently no-op until state is restored.
GamePage already uses this two-effect pattern: one `useEffect` for the mount fetch
(GamePage.tsx:21-25) and a separate `useEffect` for the interval (GamePage.tsx:27-38).
ResultPage must follow the same pattern.

**Alternatives considered**: Using `roomStore.fetchRoom()` inside the interval — rejected
because it would fail silently when `state.room` is null after a page refresh.

---

## Decision 4 — `POST /rooms/:code/restart` host verification

**Decision**: Accept `{ playerName }` in the request body, validate against `room.host`,
return 403 "Only the host can restart" on mismatch.

**Rationale**: Exactly mirrors `POST /rooms/:code/start` (rooms.ts handler + `startGame`
service). The startGame pattern already validates `playerName !== room.host` and maps to
403. This is name-string matching, not auth/sessions, so it is within constitution
Principle III. Using the same guard makes the two lifecycle endpoints structurally
identical — a reviewer can diff them and immediately understand the pattern.

**Alternatives considered**: UI-only gating (no body validation) — rejected because
inconsistent with the `startGame` precedent already in production; a direct API call
bypasses the guard entirely.

---

## Decision 5 — Navigate to `/lobby` after restart; response shape

**Decision**: `navigate("/lobby")` (no code in URL). Response shape: `{ room: RoomSnapshot }`.

**Rationale**: The React `RoomStore` singleton (wrapped by `RoomStoreProvider` in App.tsx)
persists across client-side navigations. When the polling tick calls
`roomStore.fetchRoomByCode(code, playerName)` and updates `state.room`, LobbyPage reads
the room via `useRoomState()` — it does not need a `:code` URL param. This is identical
to how GamePage navigates to `/result` (no `:code` either). The `{ room: RoomSnapshot }`
response shape is consistent with `POST /rooms/:code/start` and `POST /rooms/:code/guess`.

---

## No-change confirmations

The following files MUST NOT be modified for Scenario 4:

| File | Reason |
|------|--------|
| `backend/src/models/game.ts` | No new fields — all restart fields already exist |
| `frontend/src/services/api.ts` (types) | `RoomSnapshot.secretWord?: string` already optional |
| `frontend/src/routes/index.tsx` | `/result` route already registered |
| `frontend/src/pages/LobbyPage.tsx` | No changes — polling already handles status transition |
| `frontend/src/pages/GamePage.tsx` | No changes — navigate("/result") already correct |
| `frontend/src/pages/CreateRoomPage.tsx` | Out of scope |
| `frontend/src/pages/JoinRoomPage.tsx` | Out of scope |
