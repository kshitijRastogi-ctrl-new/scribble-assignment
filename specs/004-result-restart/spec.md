# Feature Specification: Result, Restart & Final Validation

**Feature Branch**: `004-result-restart`

**Created**: 2026-06-01

**Status**: Clarified

**Input**: Scenario 4 — Result, Restart & Final Validation (Brownfield enhancement to Scribble starter)

## Clarifications

### Session 2026-06-01

- Q: Does FR-020's `secretWord` exposure on the result screen require a backend change to `toRoomSnapshot`, or can it be handled frontend-only? → A: Backend change required. `toRoomSnapshot` currently only includes `secretWord` when `isDrawer && status === "playing"`. At `status === "result"` the field is absent from the response entirely. The condition in `toRoomSnapshot` must be updated to `(isDrawer && room.status === "playing") || room.status === "result"` to expose `secretWord` unconditionally at round end. Frontend-only is not possible since the field is never sent.
- Q: How does ResultPage know `playerName` and `roomCode` given the route is `/result` with no `:code` param? → A: Both are read from `localStorage` (`roomCode` and `playerName` keys set during `createRoom`/`joinRoom`). On mount, ResultPage calls `roomStore.fetchRoomByCode(roomCode, playerName)` to restore state — same pattern as GamePage. Route stays `/result`; no `:code` URL param needed.
- Q: Does `POST /rooms/:code/restart` enforce host-only via `playerName` in the request body, or is gating UI-only? → A: Server-side enforcement using the same name-matching pattern as `POST /rooms/:code/start`. The body contains `{ playerName }`; the backend validates it against `room.host` and returns 403 "Only the host can restart" on mismatch. This is not an auth/session mechanism and is within constitution boundaries.
- Q: Does `navigate("/lobby")` work after restart, or does LobbyPage need the code in the URL? → A: `navigate("/lobby")` works. ResultPage's poll calls `roomStore.fetchRoomByCode(code, playerName)` which updates `roomStore.state.room` before `navigate` fires. LobbyPage reads the room from the shared store via `useRoomState()` — it does not read from URL params. No URL code param needed.
- Q: Is a page-refresh recovery requirement covered for the host on the result screen? → A: Not covered in the original spec. Added FR-005a requiring an immediate mount-time fetch using `roomStore.fetchRoomByCode(roomCode, playerName)` before the polling interval starts. This ensures the result screen restores correctly after a browser refresh without waiting 2 seconds for the first poll.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Result Screen Shared State (Priority: P1)

When a round ends (a correct guess is submitted), all players are navigated to the
`/result` page. The result screen displays the secret word that was being drawn, the
final scoreboard sorted by score descending, and the full guess history showing who
guessed what and whether each guess was correct or incorrect.

**Why this priority**: This is the primary payoff of the game loop. Without a result
screen that shows what the word was, who scored, and the full guess trail, the round
has no meaningful conclusion. Every other feature in this scenario depends on the
result screen rendering before the restart can be triggered.

**Independent Test**: Alice (drawer) and Bob (guesser) complete a round. Bob submits
the correct word. Both tabs navigate to `/result`. Confirm the result page shows the
secret word (e.g., "rocket"), Bob's score of 100 at the top of the scoreboard, Alice's
score of 0 below, and both of Bob's guesses (one incorrect, one correct) in the history
panel with correct/incorrect indicators.

**Acceptance Scenarios**:

1. **Given** the room status is `"result"`, **When** any player's ResultPage renders,
   **Then** the correct secret word is displayed prominently on the screen.
2. **Given** the room status is `"result"`, **When** the scoreboard renders, **Then**
   participants are listed in descending score order (highest scorer first).
3. **Given** the room status is `"result"`, **When** the guess history renders, **Then**
   every entry in `room.guesses` is shown with the player name, guess text, and a
   correct/incorrect indicator (✓ or ✗).
4. **Given** the room has no guesses (edge case: round ends without guesses stored),
   **When** the guess history renders, **Then** a "No guesses submitted." placeholder
   is shown instead of an empty list.
5. **Given** two players have the same score, **When** the scoreboard renders, **Then**
   both are listed at the same position without error (tie-breaking order is undefined
   but stable).

---

### User Story 2 — Result Screen Polling (Priority: P1)

ResultPage polls `GET /rooms/:code` every ~2 seconds so it can detect when the host
triggers a restart. When the polled room status transitions from `"result"` to
`"lobby"`, all players are automatically navigated to `/lobby` without any manual
action.

**Why this priority**: Without polling on the result screen, non-host players have no
way to know when the host has restarted the game. The REST-polling contract (constitution
Principle II) requires this pattern for all cross-client state synchronisation.

**Independent Test**: Alice and Bob are on the result screen. Alice (host) clicks "Play
Again". Confirm Bob's tab navigates to `/lobby` within ~2 seconds without any
manual refresh.

**Acceptance Scenarios**:

1. **Given** a player is on the ResultPage, **When** the component mounts, **Then**
   polling of `GET /rooms/:code` begins at ~2-second intervals.
2. **Given** polling is active on ResultPage, **When** the response contains
   `status: "lobby"`, **Then** the client navigates to `/lobby`.
3. **Given** a player navigates away from ResultPage, **When** the component unmounts,
   **Then** the polling interval is cleared and no further requests are sent.
4. **Given** polling returns a network error, **When** the error occurs, **Then** the
   error is surfaced to the player (inline error message) and polling continues.

---

### User Story 3 — Host-Only Restart (Priority: P2)

On the result screen, only the host sees a "Play Again" button. Non-host players see a
"Waiting for host to restart…" message instead. When the host clicks "Play Again", the
game resets and all players are returned to the lobby.

**Why this priority**: The restart gating mirrors the host-only start-game gate from
Scenario 1/2. It ensures only one player (the host) can control the game lifecycle,
preventing concurrent restart races.

**Independent Test**: Open two tabs — Alice (host) and Bob (guesser). Both are on the
result screen. Confirm Alice sees a "Play Again" button and Bob does not. Confirm Bob
sees "Waiting for host to restart…". Alice clicks "Play Again". Confirm both tabs
navigate to `/lobby` within ~2 seconds.

**Acceptance Scenarios**:

1. **Given** the current player is the host, **When** the ResultPage renders, **Then**
   a "Play Again" button is visible.
2. **Given** the current player is not the host, **When** the ResultPage renders, **Then**
   no "Play Again" button is visible, and a "Waiting for host to restart…" message is
   shown instead.
3. **Given** the host clicks "Play Again", **When** the action fires, **Then**
   `POST /rooms/:code/restart` is called.
4. **Given** `POST /rooms/:code/restart` succeeds, **When** the response is received,
   **Then** the host's client navigates to `/lobby` immediately (does not wait
   for the next poll cycle).
5. **Given** `POST /rooms/:code/restart` fails, **When** the error occurs, **Then** an
   inline error message is shown and the "Play Again" button remains active for retry.

---

### User Story 4 — Restart Endpoint & State Reset (Priority: P2)

`POST /rooms/:code/restart` resets all round-specific state: status returns to
`"lobby"`, all scores reset to 0, canvas data is cleared, guess history is emptied,
secret word is cleared, and all player roles are reset to `""`. Players and the host
are preserved. The word index increments so the next round uses a different word
deterministically.

**Why this priority**: Without a correct reset, a restarted round inherits stale state
(wrong scores, stale guesses, old canvas) breaking the next game entirely. Clean reset
is the minimum correctness requirement for restart to be playable.

**Independent Test**: After a completed round (Bob scored 100), Alice clicks "Play
Again". Confirm GET /rooms/:code in the lobby shows: status `"lobby"`, Bob's score 0,
canvasData `""`, guesses `[]`, secretWord `""` in the snapshot (or absent if not
exposed), and all player roles `""`. Start a new round and confirm the secret word is
different from the previous round (next word in the deterministic list).

**Acceptance Scenarios**:

1. **Given** `POST /rooms/:code/restart` is called, **When** processed, **Then**
   `room.status` becomes `"lobby"`.
2. **Given** `POST /rooms/:code/restart` is called, **When** processed, **Then** every
   participant's `score` is reset to `0`.
3. **Given** `POST /rooms/:code/restart` is called, **When** processed, **Then**
   `room.canvasData` is reset to `""`.
4. **Given** `POST /rooms/:code/restart` is called, **When** processed, **Then**
   `room.guesses` is reset to `[]`.
5. **Given** `POST /rooms/:code/restart` is called, **When** processed, **Then**
   `room.secretWord` is reset to `""`.
6. **Given** `POST /rooms/:code/restart` is called, **When** processed, **Then** every
   participant's `role` is reset to `""`.
7. **Given** `POST /rooms/:code/restart` is called, **When** processed, **Then** the
   participant list (names, host flag) is preserved unchanged.
8. **Given** a new round starts after restart, **When** the host triggers start again,
   **Then** the secret word is the next word in the deterministic list (wordIndex
   increments on restart so the same word is not reused).
9. **Given** `POST /rooms/:code/restart` is called on a room that does not exist,
   **When** processed, **Then** the endpoint returns 404 "Room not found".
10. **Given** `POST /rooms/:code/restart` is called on a room whose status is not
    `"result"` (e.g., still `"playing"`), **When** processed, **Then** the endpoint
    returns 400 "Round not over" — restart is only valid from result state.

---

### Edge Cases

- What happens if a non-host player somehow calls `POST /rooms/:code/restart` directly?
  The backend validates `playerName` (from the request body) against `room.host` and
  returns 403 "Only the host can restart". This is the same name-matching guard used
  by `POST /rooms/:code/start` — it is server-side enforcement without auth/sessions.
- What if the host closes their tab before restarting? Non-host players remain on the
  result screen indefinitely, polling until the room is restarted or the backend
  restarts. No timeout or automatic redirect is implemented (timers are out of scope).
- What if `localStorage` does not contain `roomCode` when ResultPage mounts? The page
  cannot determine which room to poll. It should show an error and navigate to `/`
  (same guard pattern used in GamePage).
- What if `localStorage` does not contain `playerName` when ResultPage mounts? The
  host check (`playerName === room.host`) cannot be evaluated — the "Play Again" button
  must not render, and the "Waiting for host…" message is shown as the safe default.
- What if two tabs (both belonging to the host) click "Play Again" simultaneously?
  The first POST resets the room to `"lobby"`. The second POST finds
  `room.status === "lobby"` and receives 400 "Round not over" — idempotent from the
  player's perspective since they are already navigating to the lobby.
- What if the word list is exhausted (all 5 words used and wordIndex wraps)? The index
  wraps modulo the word list length, cycling back to the first word. This is acceptable
  for a single-session lab scope.
- What if a player joins after the restart (while status is `"lobby"`)? They join
  normally via `POST /rooms/:code/join` as in Scenario 1. Round state is already clean.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The ResultPage MUST display the value of `room.secretWord` prominently
  when `room.status === "result"`.
- **FR-002**: The ResultPage MUST render a scoreboard listing every participant's name
  and final score, sorted in descending order by score.
- **FR-003**: The ResultPage MUST render the full guess history from `room.guesses`,
  showing each entry's `playerName`, `text`, and `isCorrect` indicator (✓ for correct,
  ✗ for incorrect).
- **FR-004**: When `room.guesses` is empty, the ResultPage MUST render a
  "No guesses submitted." placeholder instead of an empty list.
- **FR-005a**: On mount, BEFORE the polling interval starts, the ResultPage MUST perform
  an immediate one-off fetch using `roomStore.fetchRoomByCode(roomCode, playerName)`
  (both read from `localStorage`). This restores result state immediately after a
  page refresh without waiting for the first poll cycle (~2 seconds).
- **FR-005**: After the mount-time fetch (FR-005a), the ResultPage MUST poll
  `GET /rooms/:code` at ~2-second intervals using `roomStore.fetchRoomByCode`, following
  the same pattern as GamePage.
- **FR-006**: When the polled room snapshot has `status === "lobby"`, the ResultPage
  MUST navigate to `/lobby`.
- **FR-007**: The ResultPage MUST clear its polling interval on component unmount.
- **FR-008**: The ResultPage MUST display an error message if polling fails, without
  stopping the poll (mirrors the `refreshError` pattern from other pages).
- **FR-009**: The ResultPage MUST read `roomCode` and `playerName` from `localStorage`
  (the same keys set during `createRoom`/`joinRoom`). The route is `/result` with no
  `:code` URL parameter — room identity comes entirely from `localStorage`. If
  `roomCode` is absent, ResultPage MUST navigate to `/` (same guard as GamePage).
- **FR-010**: The ResultPage MUST show a "Play Again" button only when
  `playerName === room.host` (the local player is the host).
- **FR-011**: The ResultPage MUST show "Waiting for host to restart…" for all non-host
  players (including when `playerName` cannot be determined from localStorage).
- **FR-012**: When the host clicks "Play Again", the client MUST call
  `POST /rooms/:code/restart` with body `{ playerName }` (read from `localStorage`).
  The backend MUST validate `playerName` against `room.host` and return 403
  "Only the host can restart" on mismatch. This is the same name-matching pattern
  used by `POST /rooms/:code/start` — not an auth/session mechanism.
- **FR-013**: On a successful `POST /rooms/:code/restart` response, the host's client
  MUST navigate to `/lobby` immediately.
- **FR-014**: On a failed `POST /rooms/:code/restart`, the ResultPage MUST display an
  inline error and keep the "Play Again" button enabled for retry.
- **FR-015**: The backend `POST /rooms/:code/restart` endpoint MUST reset the following
  fields atomically: `status → "lobby"`, `guesses → []`, `canvasData → ""`,
  `secretWord → ""`, all participant `score → 0`, all participant `role → ""`.
- **FR-016**: `POST /rooms/:code/restart` MUST preserve the `participants` array
  (names, host flag) and the room `host` field unchanged.
- **FR-017**: `POST /rooms/:code/restart` MUST increment `room.wordIndex` by 1 — the
  modulo is applied at read time in `startGame` when selecting the word, not at write
  time here — so the next round selects a different word deterministically.
- **FR-018**: `POST /rooms/:code/restart` MUST return 404 "Room not found" if the room
  code does not exist.
- **FR-019**: `POST /rooms/:code/restart` MUST return 400 "Round not over" if
  `room.status !== "result"`.
- **FR-020**: `GET /rooms/:code` MUST include `secretWord` in the snapshot for all
  players when `room.status === "result"`. The backend `toRoomSnapshot` function
  currently exposes `secretWord` only when `isDrawer && room.status === "playing"`.
  This condition MUST be extended to:
  `(isDrawer && room.status === "playing") || room.status === "result"`
  so that the field is included unconditionally at round end. This is a targeted
  backend-only change to `roomStore.ts:toRoomSnapshot` — no new endpoint is needed.

### Key Entities

- **Room**: updated by restart — `status`, `guesses`, `canvasData`, `secretWord`,
  `wordIndex`, and per-participant `score` and `role` are reset; `participants` and
  `host` are preserved.
- **RoomSnapshot**: `secretWord` becomes visible to all players when
  `room.status === "result"` (previously only visible to the drawer).
- **Participant**: `score` and `role` are reset to `0` and `""` respectively on
  restart.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All players see the correct secret word on the result screen within one
  poll cycle (~2 seconds) of navigating to `/result` — no manual refresh required.
- **SC-002**: The scoreboard on the result screen lists players in descending score
  order and the scores match the final values from the completed round.
- **SC-003**: The full guess history (correct and incorrect guesses) is visible to all
  players on the result screen, with a correct/incorrect indicator for each entry.
- **SC-004**: After the host clicks "Play Again", all players (host and non-host) are
  on the lobby screen within one poll cycle (~2 seconds) — no manual refresh required.
- **SC-005**: After restart, a new round's scoreboard shows all scores at 0, confirming
  round state was fully cleared.
- **SC-006**: After restart, the next round uses a different secret word from the
  previous round, confirming the word index advanced.

## Assumptions

- `roomCode` and `playerName` are read from `localStorage` on ResultPage mount, using
  the same pattern as GamePage and LobbyPage. No additional router state is needed.
- The `useRoomState` hook (or equivalent polling utility) used in GamePage and LobbyPage
  is reused for ResultPage polling. No new polling abstraction is introduced
  (constitution Principle I: brownfield-first).
- Host identity is determined by comparing `localStorage.getItem("playerName")` to
  `room.host` from the polled snapshot. No session token or auth is used (constitution
  Principle III: no auth/sessions in scope).
- `POST /rooms/:code/restart` enforces host-only access via `{ playerName }` in the
  request body, validated against `room.host` on the server (returns 403 on mismatch).
  This is the same name-matching pattern as `POST /rooms/:code/start` — not an
  auth/session mechanism, and within constitution boundaries.
- `room.secretWord` is already stored on the in-memory Room object. When
  `room.status === "result"`, `toRoomSnapshot` exposes it to all players (not just the
  drawer) so the result screen can display it.
- The word list has 5 entries (rocket, pizza, castle, guitar, sunflower). `wordIndex`
  wraps modulo 5 so a 6th restart cycles back to the first word. This is acceptable
  for a single-session lab game.
- `POST /rooms/:code/restart` is a new endpoint. It accepts `{ playerName }` in the
  request body for host verification. It returns `{ room: RoomSnapshot }` (consistent
  with the `POST /:code/start` response shape). The existing polling loop on ResultPage
  detects `status === "lobby"` and navigates non-host players to `/lobby` automatically.
- The ResultPage is currently a placeholder component (`ResultPage.tsx`). All result
  display and restart logic is added inside this existing file — no new page component
  is created (constitution Principle I).
- No new npm dependencies are introduced. Sorting the scoreboard uses the native
  `Array.prototype.sort` (constitution Principle III: no new libraries for core game
  mechanics).
