# Feature Specification: Room Setup & Lobby

**Feature Branch**: `001-room-setup-lobby`

**Created**: 2026-05-30

**Status**: Clarified

**Input**: Scenario 1 — Room Setup & Lobby (Brownfield enhancement to Scribble starter)

## Clarifications

### Session 2026-05-30

- Q: How does the client prove host identity after a page refresh? → A: `playerName` + `roomCode` stored in localStorage; both sent on every host-gated request. No session token (constitution forbids auth).
- Q: How does POST /rooms/:code/start verify the caller is the host? → A: `playerName` in the JSON request body, matched server-side against `room.host`. Query params are not used.
- Q: Can two players in the same room share the same name? → A: No — joining with a name already present in the room is rejected with 409 `{ "error": "Name already taken in this room" }`. Empty and whitespace-only names are also rejected with 400 `{ "error": "Name cannot be empty" }`.
- Q: What data does the client carry when navigating to the Game screen? → A: `roomCode` is in the route path (`/game/:code`); `playerName` is read from localStorage on the Game screen. No extra state is passed through the router.
- Q: Can simultaneous join requests cause a race condition in the in-memory store? → A: No — Node.js executes on a single event-loop thread; synchronous in-memory mutations are inherently serialized. No locking is required.
- Q: Should RoomStatus use `"waiting"` or `"lobby"` for the pre-game state? → A: `"lobby"` — the starter already defines `RoomStatus = "lobby"` and the constitution forbids unnecessary rewrites. Keeps alignment with assignment language and existing codebase. Status values are `"lobby" | "playing"`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Host Tracking on Room Creation (Priority: P1)

A player who creates a room is automatically the host of that room. The host identity
is stored server-side and visible to all players in the lobby. No manual host-assignment
step exists.

**Why this priority**: Host status gates the "Start Game" button (Scenario 1.5). Without
it, no other host-gated behavior can be built or tested.

**Independent Test**: Open one browser tab, create a room, and observe "(Host)" label
next to the creator's name in the lobby participant list.

**Acceptance Scenarios**:

1. **Given** a player submits a valid name via Create Room, **When** the room is created,
   **Then** the backend stores `host: playerName` at room level and `isHost: true` on
   that player object, and GET /rooms/:code returns a `host` field.
2. **Given** a room exists with a host, **When** any player fetches the room,
   **Then** the host's entry in the participant list is labelled "(Host)" in the lobby UI.
3. **Given** a second player joins the room, **When** the lobby renders,
   **Then** the second player has no "(Host)" label; only the creator does.

---

### User Story 2 — Player Name Validation (Priority: P1)

Player names are trimmed of leading/trailing whitespace before use. Names that are
empty or whitespace-only after trimming are rejected with a clear inline error; the
user stays on the current screen and does not navigate.

**Why this priority**: Silent empty-name behaviour ("Player") produces confusing
duplicate names and breaks host identification. Validation must be in place before
multi-player flows can be reliably tested.

**Independent Test**: On the Create Room or Join Room screen, submit a blank or
whitespace-only name and observe an inline error message with no navigation.

**Acceptance Scenarios**:

1. **Given** a user submits an empty name on Create Room, **When** the form is
   submitted, **Then** the backend returns 400 `{ "error": "Name cannot be empty" }`
   and the frontend shows that message inline without navigating.
2. **Given** a user submits a name of only spaces on Join Room, **When** the form is
   submitted, **Then** the backend returns 400 `{ "error": "Name cannot be empty" }`
   and the frontend shows that message inline without navigating.
3. **Given** a user submits `"  Alice  "`, **When** the form is submitted,
   **Then** the stored name is `"Alice"` (trimmed) and the player is accepted normally.

---

### User Story 3 — Room Code Validation on Join (Priority: P1)

Room codes are trimmed and uppercased before lookup. Empty codes and codes for
non-existent rooms are rejected with specific, actionable error messages displayed
inline on the Join Room screen.

**Why this priority**: Without code validation, users receive cryptic errors or
silently land in an undefined state when they mistype a code.

**Independent Test**: On the Join Room screen, submit an empty code and observe the
inline error; then submit a valid but non-existent code and observe a different error.

**Acceptance Scenarios**:

1. **Given** a user submits an empty room code on Join Room, **When** the form is
   submitted, **Then** the backend returns 400 `{ "error": "Room code cannot be empty" }`
   and the frontend shows that message inline without navigating.
2. **Given** a user submits a non-existent room code, **When** the form is submitted,
   **Then** the backend returns 404 `{ "error": "Room not found" }` and the frontend
   shows that message inline without navigating.
3. **Given** a user submits `"  abcd  "`, **When** the form is submitted,
   **Then** the code is treated as `"ABCD"` (trimmed and uppercased) before lookup.

---

### User Story 4 — Automatic Lobby Polling (Priority: P2)

The Lobby screen automatically polls GET /rooms/:code every ~2 seconds. New players
appear within approximately 2 seconds without any manual action. If the room status
transitions to `"playing"`, the client navigates automatically to the Game screen.

**Why this priority**: Manual refresh is not a viable UX for a real-time game lobby.
Polling is the agreed synchronization mechanism for this project.

**Independent Test**: Open two browser tabs in the same room. In tab 2, join the room.
Without clicking anything in tab 1, tab 1's participant list updates within ~2 seconds.

**Acceptance Scenarios**:

1. **Given** a player is on the Lobby screen, **When** 2 seconds pass,
   **Then** the client has issued at least one GET /rooms/:code request automatically.
2. **Given** a second player joins a room, **When** up to 2 seconds pass,
   **Then** their name appears in the existing player's lobby participant list without
   any manual interaction.
3. **Given** the room status changes to `"playing"` (host started the game),
   **When** the next poll resolves, **Then** the lobby client navigates to the Game screen.
4. **Given** the lobby is polling, **When** the component unmounts,
   **Then** polling stops (no memory leaks or dangling intervals).

---

### User Story 5 — Host-Only Start Game (Priority: P2)

Only the host sees a "Start Game" button. The button is disabled when fewer than 2
players are in the room, with an explanatory message. Non-hosts see a "Waiting for
host to start…" notice. Clicking Start calls POST /rooms/:code/start, which transitions
the room to `"playing"` status.

**Why this priority**: The start-game gate is the boundary between the lobby and the
game proper. Without it, no transition to gameplay can be implemented.

**Independent Test**: In tab 1 (host), confirm "Start Game" button is present and
disabled with 1 player. In tab 2, join; confirm tab 1 button becomes enabled. Confirm
tab 2 shows "Waiting for host to start…" only.

**Acceptance Scenarios**:

1. **Given** the host is alone in the lobby, **When** the lobby renders,
   **Then** the "Start Game" button is visible but disabled, with a message such as
   "Need at least 2 players to start".
2. **Given** at least 2 players are in the lobby, **When** the host's lobby renders,
   **Then** the "Start Game" button is enabled and clickable.
3. **Given** a non-host player is in the lobby, **When** the lobby renders,
   **Then** "Start Game" button is NOT visible; instead "Waiting for host to start…"
   is shown.
4. **Given** the host clicks "Start Game" with ≥2 players, **When** POST /rooms/:code/start
   is called, **Then** the backend sets room status to `"playing"` and returns 200.
5. **Given** a non-host makes a direct POST /rooms/:code/start request,
   **When** the backend processes it, **Then** the backend returns 403
   `{ "error": "Only the host can start the game" }`.

---

### Edge Cases

- What happens when a player joins with the same name as an existing participant?
  Duplicate names within the same room are rejected with 409
  `{ "error": "Name already taken in this room" }`. The frontend shows this inline.
- What happens if the backend is restarted while players are in the lobby? In-memory
  state is cleared; subsequent polls return 404 and the frontend shows an error.
- What happens if two tabs create rooms simultaneously with the same code? Room codes
  are unique by design (the existing generator already ensures uniqueness).
- What happens if the host navigates away from the lobby before starting? The host
  player remains in the room; the room is not automatically closed.
- What if the poll returns a network error? The lobby MUST surface the error (e.g., a
  brief error notice) but MUST NOT crash; polling continues on the next interval.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: POST /rooms MUST store the creating player as host (`isHost: true`) and
  record `host: playerName` at the room level.
- **FR-002**: GET /rooms/:code MUST return the `host` field and each player's `isHost`
  flag in the response body.
- **FR-003**: POST /rooms and POST /rooms/:code/join MUST trim the player name and
  return 400 `{ "error": "Name cannot be empty" }` when the trimmed name is empty.
- **FR-004**: POST /rooms/:code/join MUST trim and uppercase the room code; return 400
  `{ "error": "Room code cannot be empty" }` for empty codes; return 404
  `{ "error": "Room not found" }` for non-existent codes.
- **FR-005**: The Lobby screen MUST poll GET /rooms/:code at approximately 2-second
  intervals and update the participant list without user interaction.
- **FR-006**: The Lobby screen MUST navigate to `/game/:code` when the polled room
  status equals `"playing"`. The Game screen reads `playerName` from localStorage on mount.
- **FR-007**: Polling MUST stop when the Lobby component unmounts.
- **FR-008**: The Lobby screen MUST display "(Host)" next to the host player's name.
- **FR-009**: The host MUST see a "Start Game" button; non-hosts MUST NOT.
- **FR-010**: "Start Game" MUST be disabled with an explanatory message when fewer than
  2 players are present; enabled when 2 or more players are present.
- **FR-011**: POST /rooms/:code/start MUST set room status to `"playing"` and return 200.
- **FR-012**: POST /rooms/:code/start MUST accept `{ "playerName": "<name>" }` in the
  JSON request body and return 403 `{ "error": "Only the host can start the game" }`
  when `playerName` does not match `room.host`.
- **FR-013**: Frontend forms MUST display backend error messages inline and MUST NOT
  navigate on error.
- **FR-014**: POST /rooms/:code/join MUST return 409 `{ "error": "Name already taken
  in this room" }` when the trimmed player name matches any existing participant name
  (case-sensitive). Empty names (FR-003) are still checked first.

### Key Entities

- **Room**: `{ code, host, status, players }` — `status` is `"lobby"` (pre-game) or `"playing"` (game active). `"lobby"` matches the starter's existing `RoomStatus` type and the assignment's language.
- **Player**: `{ name, isHost, score }` — `score` defaults to 0, used in later scenarios.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A second player appears in the first player's lobby participant list within
  2 seconds of joining, without any manual action by the first player.
- **SC-002**: Submitting an empty or whitespace-only name on any form produces a visible
  inline error message; no screen transition occurs.
- **SC-003**: Submitting an invalid room code produces a specific inline error message;
  no screen transition occurs.
- **SC-004**: The host's name is distinguishable from non-host names in the lobby on
  every poll cycle.
- **SC-005**: The "Start Game" button is inaccessible to non-host players in all lobby
  states.
- **SC-006**: Two browser tabs playing the same room both navigate to the Game screen
  within one poll cycle of the host clicking "Start Game".

## Assumptions

- The player who created the room is identified by their name only; there is no session
  or token (constitution forbids authentication). The frontend persists `playerName` and
  `roomCode` in localStorage. Both are sent on every host-gated request (`/start`).
- Room codes are already generated as uppercase alphanumeric strings by the starter;
  the uppercasing step in join is a normalisation safety measure.
- The manual "Refresh" button in the existing lobby may remain visible; it becomes
  redundant once polling is active but need not be removed (no refactor without a
  spec requirement).
- The `score` field on Player is initialised to 0 at creation for forward compatibility
  with Scenario 3; it is not displayed or used in this scenario.
- POST /rooms/:code/start verifies host identity by comparing the `playerName` field in
  the JSON request body against `room.host`; no token or header is used.
- The polling interval is implemented with `setInterval`; cleanup is in the `useEffect`
  return function to prevent memory leaks on unmount.
- Node.js's single-threaded event loop serializes all in-memory mutations; no explicit
  locking is required for concurrent join requests.
- Name comparison for duplicate detection is case-sensitive and performed after trimming.
