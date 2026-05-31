# Research: Room Setup & Lobby

**Branch**: `001-room-setup-lobby` | **Date**: 2026-05-30

## Starter Codebase Findings

### Decision: Error response key — `error` not `message`
- **Observation**: The existing `errorHandler` in `backend/src/api/router.ts` returns
  `{ message }`. The Zod error path also returns `{ message: "Invalid request payload" }`.
  The spec requires `{ "error": "..." }` for all new validation errors.
- **Decision**: Align all error responses to `{ "error": "..." }`. Update `errorHandler`
  and the Zod branch, and update the frontend `api.ts` to read `error` not `message`.
- **Alternatives considered**: Keep `message` for existing errors, add `error` for new
  ones — rejected because inconsistent response shape confuses frontend error handling.

### Decision: `API_BASE_URL` bug in `frontend/src/services/api.ts`
- **Observation**: `import.meta.env.VITE_API_URL ?? "http://localhost:3001/bug"` — the
  `/bug` suffix would make all API calls fail in local dev without a `.env` file. The
  backend mounts routes at root (no `/api` prefix), so the correct fallback is
  `http://localhost:3001`.
- **Decision**: Fix the fallback to `http://localhost:3001` as part of this scenario.
- **Alternatives considered**: Add a `.env` file — rejected as a config workaround for
  a code typo; fixing the source is simpler and correct.

### Decision: `RoomStatus` — retain `"lobby"`, add `"playing"`
- **Observation**: `backend/src/models/game.ts` defines `type RoomStatus = "lobby"`.
  The spec requires a `"playing"` state for when the game is active. The lobby screen
  uses `status` to gate polling navigation.
- **Decision**: Retain `"lobby"` (brownfield-first; avoids unnecessary rename; matches
  assignment language throughout). Add `"playing"`. Type becomes `"lobby" | "playing"`.
  The frontend type mirrors this.
- **Alternatives considered**: Rename `"lobby"` → `"waiting"` — rejected. The starter
  already uses `"lobby"`, the assignment doc uses "lobby" language consistently, and
  the constitution forbids unnecessary rewrites. The semantic argument for `"waiting"`
  (screen name vs. state name) does not outweigh the cost of breaking the existing
  type definition without a spec requirement to do so.

### Decision: Host identity via `playerName` — no session token
- **Observation**: Constitution forbids authentication. The existing `participantId`
  (UUID) stored in `roomStore` is not needed for host verification; the spec uses
  `playerName` matched against `room.host`.
- **Decision**: `playerName` + `roomCode` persisted to `localStorage` by the frontend
  after create/join success. All host-gated requests send `{ playerName }` in the body.
  `participantId` continues to exist in the store for backward compatibility with
  existing `fetchRoom` calls.
- **Alternatives considered**: Use `participantId` as host token — rejected because
  it would require passing the UUID on every start request, increasing surface area
  without adding real security (constitution forbids auth anyway).

### Decision: Duplicate name check — case-sensitive, post-trim
- **Observation**: `roomStore.joinRoom` currently does no name collision check. The
  spec requires 409 when the trimmed name matches any existing participant name.
- **Decision**: Check `room.participants.some(p => p.name === trimmedName)` after
  trimming. Case-sensitive. If match found, return a specific error result from
  `joinRoom` (not throw, to keep error handling explicit in the route handler).
- **Alternatives considered**: Case-insensitive check — deferred to a later scenario;
  not in spec for this scenario.

### Decision: Polling with `useEffect` + `setInterval` — cleanup in return
- **Observation**: `LobbyPage.tsx` has a manual refresh button only. React's `useEffect`
  cleanup function is the correct place to call `clearInterval` to prevent leaks.
- **Decision**: Add a second `useEffect` that calls `setInterval(poll, 2000)` and
  returns `() => clearInterval(id)`. The poll function calls `roomStore.fetchRoom()` and
  checks `room.status === "playing"` to navigate.
- **Alternatives considered**: `setInterval` outside `useEffect` — rejected because
  it would not clean up on unmount.

### Decision: `/game/:code` route — update from `/game`
- **Observation**: `routes/index.tsx` defines `<Route path="/game" element={...} />`.
  The spec requires `/game/:code`. `GamePage` currently reads `room` from `roomStore`
  state (which survives navigation), but after a page refresh the store is empty.
  Using the route param makes the URL self-describing and allows future direct linking.
- **Decision**: Change route to `/game/:code`. `GamePage` reads `code` from
  `useParams()` and `playerName` from localStorage.
- **Alternatives considered**: Keep `/game` and pass state via router — rejected per
  spec clarification (Q4 answer: route path preferred).

### Starter Bug — `createParticipant` fallback
- **Observation**: `displayName(name?: string)` returns `"Player"` when name is
  undefined/empty. This silently creates a player named "Player" for empty submissions.
  The spec requires a 400 rejection.
- **Decision**: Remove `displayName` fallback. Validate at the schema layer (Zod `min(1)`)
  and reject with 400 before `createParticipant` is ever called.
