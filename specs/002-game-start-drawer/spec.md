# Feature Specification: Game Start & Drawer Flow

**Feature Branch**: `002-game-start-drawer`

**Created**: 2026-05-31

**Status**: Clarified

**Input**: Scenario 2 — Game Start & Drawer Flow (Brownfield enhancement to Scribble starter)

## Clarifications

### Session 2026-05-31

- Q: Where is `role` stored — on each `Participant` or as a separate parallel array on `RoomSnapshot`? → A: `role: "drawer" | "guesser" | ""` is stored directly on each `Participant` object. The `roles: ParticipantRole[]` parallel array on `RoomSnapshot` is removed. Co-located with participant, consistent with the `isHost` precedent already in the starter.
- Q: Are `wordIndex` and `secretWord` pre-existing fields on `Room` or new additions? → A: Both are new fields. `wordIndex: number` initialises to `0` at room creation; `secretWord: string` initialises to `""` and is set to the selected word on each `startGame` call. Neither field exists in the current starter `Room` interface.
- Q: How does the Game screen hydrate after a page refresh when `roomStore.state.room` is null? → A: A new `fetchRoomByCode(code: string, playerName: string)` method is added to `RoomStore` that bypasses the `this.state.room` null guard. The Game screen calls this on mount using `code` from `useParams` and `playerName` from `localStorage`, before the 2-second polling interval starts.
- Q: Does `secretWord` need a field in the frontend `RoomSnapshot` interface, and what other frontend type changes are required? → A: Yes — `secretWord?: string` (optional) is added to the frontend `RoomSnapshot` interface. `role: "drawer" | "guesser" | ""` is added to the frontend `Participant` interface. `roles: ParticipantRole[]` is removed from `RoomSnapshot` (superseded by per-participant `role`). The `status` union is extended to `"lobby" | "playing" | "result"`.
- Q: Is the drawer's name a separate field or derived on the frontend? → A: Derived on the frontend via `participants.find(p => p.role === "drawer")?.name`. No separate `drawerName` field is added to the backend or frontend.
- Q: Does replacing `?participantId=` with `?player=<name>` break Scenario 1 LobbyPage polling? → A: No. The `viewerParticipantId` param was already dead code on the backend (`void viewerParticipantId` in `toRoomSnapshot`). The lobby response (participants, host, status, code) is unaffected. Changes: backend `roomViewerQuerySchema` parses `player` instead of `participantId`; `toRoomSnapshot` accepts `viewerName?: string`; `api.fetchRoom()` passes `?player=<name>`; `roomStore.fetchRoom()` passes `localStorage.getItem("playerName")` instead of `this.state.participantId`. `LobbyPage.tsx` requires zero changes. SC-001–SC-006 risk: none.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Drawer Assignment & Secret Word on Game Start (Priority: P1)

When the host calls POST /rooms/:code/start, the backend assigns every participant a
role: the host becomes the drawer, all other participants become guessers. A secret word
is chosen deterministically from the starter word list and stored on the room object.

**Why this priority**: Role assignment is the foundational fact that all other Scenario 2
behavior depends on. No role-aware API response, no role-differentiated UI, and no
word-reveal are possible until this is in place.

**Independent Test**: Create a room as Alice. Bob joins. Host (Alice) calls POST
/rooms/:code/start. GET /rooms/:code response must show Alice with
`role: "drawer"` and Bob with `role: "guesser"`, and the room-level `secretWord` must
be one of the five starter words.

**Acceptance Scenarios**:

1. **Given** a room with host Alice and joiner Bob, **When** POST /rooms/:code/start is
   called, **Then** Alice's participant object has `role: "drawer"` and Bob's has
   `role: "guesser"`.
2. **Given** a room where start is called for the first time, **When** the start succeeds,
   **Then** the backend selects the word at index `0 % 5 = 0` from the word list (i.e.,
   `"rocket"`) and stores it as `secretWord` on the room.
3. **Given** a room that has been started and restarted, **When** the word is selected,
   **Then** `wordIndex` increments by 1 on each start call and selection wraps around
   using `wordIndex % words.length`, cycling through all five words.
4. **Given** a room with three or more players, **When** start is called by the host,
   **Then** only the host has `role: "drawer"`; all others have `role: "guesser"`.

---

### User Story 2 — Role-Based API Response (Priority: P1)

GET /rooms/:code accepts an optional `?player=<name>` query parameter. The response is
filtered based on the named player's role: drawers receive the secret word, guessers do
not. If the player parameter is absent or unrecognised, the secret word is never included.

**Why this priority**: Without role-filtered responses, the frontend cannot safely show
the secret word only to the drawer. A guesser could read the word from the network
response, breaking the game.

**Independent Test**: After starting a room (Alice=drawer, Bob=guesser):
- `GET /rooms/:code?player=Alice` must include `secretWord` in the response.
- `GET /rooms/:code?player=Bob` must NOT include `secretWord`.
- `GET /rooms/:code` (no param) must NOT include `secretWord`.
- Both responses must include each participant's `role` field.

**Acceptance Scenarios**:

1. **Given** a started room, **When** GET /rooms/:code?player=Alice (drawer) is called,
   **Then** the response body includes `secretWord: "<word>"` and Alice's participant
   entry shows `role: "drawer"`.
2. **Given** a started room, **When** GET /rooms/:code?player=Bob (guesser) is called,
   **Then** the response body does NOT contain a `secretWord` field and Bob's participant
   entry shows `role: "guesser"`.
3. **Given** a started room, **When** GET /rooms/:code is called with no player param,
   **Then** the response body does NOT contain a `secretWord` field.
4. **Given** a started room, **When** GET /rooms/:code?player=Unknown (name not in room)
   is called, **Then** the response body does NOT contain a `secretWord` field.
5. **Given** a room still in `"lobby"` status, **When** GET /rooms/:code?player=Alice
   is called, **Then** the response does NOT include `secretWord` (no word assigned yet).

---

### User Story 3 — Game Screen: Drawer View (Priority: P2)

The player who is the drawer sees a dedicated view on the Game screen that displays
their secret word prominently and a "You are drawing!" label. No guess input is shown
to the drawer.

**Why this priority**: The drawer view is the core host-side game experience. Without it,
the host cannot know what to draw.

**Independent Test**: Open the game screen as Alice (drawer). Confirm "You are drawing!"
is visible, the secret word is displayed, and no guess input form is rendered.

**Acceptance Scenarios**:

1. **Given** the viewing player is the drawer, **When** the Game screen renders,
   **Then** a "You are drawing!" label is displayed.
2. **Given** the viewing player is the drawer, **When** the Game screen renders,
   **Then** the secret word is shown prominently (e.g., in a labelled card or heading).
3. **Given** the viewing player is the drawer, **When** the Game screen renders,
   **Then** the guess input component is NOT rendered.

---

### User Story 4 — Game Screen: Guesser View (Priority: P2)

Players who are guessers see a "You are guessing!" label and the drawer's name. The
secret word is never revealed to guessers anywhere on the Game screen.

**Why this priority**: The guesser view is required to confirm the role-based UI split
works end-to-end. Without it, both players see the same screen and the game has no
meaningful role distinction.

**Independent Test**: Open the game screen as Bob (guesser). Confirm "You are guessing!"
is visible, Alice's name appears as the drawer, and the secret word is absent from the UI.

**Acceptance Scenarios**:

1. **Given** the viewing player is a guesser, **When** the Game screen renders,
   **Then** a "You are guessing!" label is displayed.
2. **Given** the viewing player is a guesser, **When** the Game screen renders,
   **Then** the drawer's name is displayed (e.g., "Alice is drawing").
3. **Given** the viewing player is a guesser, **When** the Game screen renders,
   **Then** the secret word does NOT appear anywhere in the visible UI.

---

### User Story 5 — Game Screen Polling (Priority: P2)

The Game screen polls GET /rooms/:code?player=<playerName> every ~2 seconds. New role
data and room state appear without manual interaction. When the polled room status
becomes `"result"`, the client navigates to the /result screen automatically.

**Why this priority**: The Game screen must stay in sync with server state. Without
polling, the game UI is static after the initial load. The `"result"` navigation hook
is required so Scenario 3 (guess submission) can trigger the transition from game to
result without additional frontend changes.

**Independent Test**: On the Game screen, confirm network requests to
GET /rooms/:code?player=<name> appear in the browser devtools at ~2-second intervals.
Confirm polling stops when navigating away.

**Acceptance Scenarios**:

1. **Given** a player is on the Game screen, **When** 2 seconds pass,
   **Then** the client has issued at least one GET /rooms/:code?player=<playerName> request automatically.
2. **Given** the Game screen is polling, **When** the polled room status equals `"result"`,
   **Then** the client navigates to `/result`.
3. **Given** the Game screen is polling, **When** the component unmounts,
   **Then** polling stops (no dangling intervals or memory leaks).
4. **Given** the player polling uses localStorage for the player name, **When** the poll
   fires, **Then** the `?player=` param is populated with `localStorage.getItem("playerName")`.

---

### Edge Cases

- What happens when GET /rooms/:code?player=<name> is called for a room still in `"lobby"`?
  The response returns normally with no `secretWord` field; roles are not yet assigned.
- What happens if a player refreshes the Game screen? `playerName` is re-read from
  localStorage; `code` is re-read from the URL param (`/game/:code`). The poll restarts.
  No role re-hydration from the router is needed.
- What if `wordIndex` grows unboundedly? Modulo wraps it safely; `wordIndex` is a
  non-negative integer that only ever increments.
- What if the backend is restarted while players are on the Game screen? In-memory state
  is cleared; subsequent polls return 404. The Game screen must surface an error (e.g.,
  via `refreshError`), not crash.
- What if POST /rooms/:code/start is called on a room already in `"playing"` status?
  The backend MUST return 400 `{ "error": "Game already started" }` and leave room state
  unchanged. This prevents `wordIndex` from advancing and roles from being re-assigned
  mid-game, which would constitute an unintended second round (explicitly out of scope).
  Re-starting the game is out of scope for Scenario 2.
- What if `localStorage.getItem("playerName")` is null or empty on Game screen mount
  (e.g., the player navigated directly to `/game/:code` without going through the lobby)?
  The Game screen MUST redirect to `/` (the home/start screen). Without a known player
  identity the role cannot be determined, the `?player=` param cannot be populated, and
  no role-specific UI can be shown. This mirrors the Scenario 1 pattern where LobbyPage
  redirects to `/` when `room` is null.
- What if a player joins a room that is already in `"playing"` status? The current
  `joinRoom` implementation allows it. The late-joiner will have `role: ""` (unassigned)
  and will see no role-specific content on the Game screen. Locking join once the game
  starts is out of scope for Scenario 2.
- What if a participant's role is not yet assigned (room still in lobby) but the game
  screen is accessed directly via URL? The screen renders with no role-specific content
  until the first poll resolves a `"playing"` room with roles.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: POST /rooms/:code/start MUST assign `role: "drawer"` to the host participant
  and `role: "guesser"` to all other participants when the game starts.
- **FR-002**: POST /rooms/:code/start MUST select the secret word using
  `words[room.wordIndex % words.length]` from the five starter words
  `["rocket", "pizza", "castle", "guitar", "sunflower"]`, store it as `secretWord` on
  the room, and increment `room.wordIndex` by 1.
- **FR-003**: GET /rooms/:code accepts an optional `?player=<name>` query parameter
  (replacing the previous unused `?participantId=` param). When provided and the named
  player's role is `"drawer"` and room status is `"playing"`, the response MUST include
  `secretWord`.
- **FR-004**: GET /rooms/:code with no `player` param, an unrecognised player name, or a
  guesser's name MUST NOT include `secretWord` in the response body.
- **FR-005**: GET /rooms/:code MUST include a `role` field on every participant entry in
  the response after the game has started.
- **FR-006**: The Game screen MUST poll GET /rooms/:code?player=<playerName> every ~2
  seconds, passing `playerName` from localStorage as the query parameter.
- **FR-007**: Polling MUST stop when the Game component unmounts.
- **FR-008**: The Game screen MUST display `"You are drawing!"` and the `secretWord`
  prominently when the polling response identifies the viewer as the drawer.
- **FR-009**: The Game screen MUST NOT render a guess input when the viewer's role is
  `"drawer"`.
- **FR-010**: The Game screen MUST display `"You are guessing!"` and the drawer's name
  when the polling response identifies the viewer as a guesser.
- **FR-011**: The Game screen MUST NOT expose `secretWord` to a guesser anywhere in
  the rendered UI.
- **FR-012**: The Game screen MUST navigate to `/result` when the polled room status
  equals `"result"`.
- **FR-013**: The Game screen MUST call `fetchRoomByCode(code, playerName)` on mount —
  using `code` from the URL path and `playerName` from localStorage — before the 2-second
  polling interval begins, so the screen hydrates correctly after a page refresh.
- **FR-014**: POST /rooms/:code/start MUST return 400 `{ "error": "Game already started" }`
  if `room.status` is already `"playing"`, leaving all room state (roles, `secretWord`,
  `wordIndex`) unchanged.
- **FR-015**: The Game screen MUST redirect to `/` on mount if
  `localStorage.getItem("playerName")` is null or empty, preventing a silent broken state
  where the viewer's role cannot be determined.

### Key Entities

- **Room**: gains two new fields — `wordIndex: number` (initialised to `0` at room
  creation, incremented by 1 on each `startGame` call) and `secretWord: string`
  (initialised to `""`, set to the selected word on each `startGame` call).
- **Participant**: gains `role: "drawer" | "guesser" | ""` (empty string before the game
  starts; assigned on `startGame`). Role is stored directly on each participant object —
  not as a separate parallel array — consistent with the `isHost` field already present.
- **RoomSnapshot** (API response): each participant entry includes its `role` field; a
  top-level `secretWord?: string` (optional) is present only when the requesting player's
  role is `"drawer"` and room status is `"playing"`. The `roles: ParticipantRole[]`
  parallel array previously on `RoomSnapshot` is replaced by per-participant `role`.
- **RoomStatus**: extended to `"lobby" | "playing" | "result"` (the `"result"` value is
  the trigger for Game→Result navigation; the mechanism that sets it is Scenario 3).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The drawer can read their secret word from the Game screen within one poll
  cycle (~2 seconds) of the host clicking "Start Game".
- **SC-002**: The guesser's network responses contain no `secretWord` field at any point
  during gameplay.
- **SC-003**: Both drawer and guesser Game screens show role-appropriate UI (label +
  word vs. label + drawer name) without any manual refresh.
- **SC-004**: Both Game screen tabs navigate automatically to `/result` within one poll
  cycle of room status becoming `"result"`.
- **SC-005**: Polling stops and leaves no dangling intervals when either tab navigates
  away from the Game screen.

## Assumptions

- `playerName` and `roomCode` are persisted in localStorage from Scenario 1; the Game
  screen reads them on mount. No extra router state is needed. Name validation
  (empty/whitespace-only names rejected with 400) is a Scenario 1 precondition —
  Scenario 2 inherits it and does not re-implement it.
- The five starter words are fixed at `["rocket", "pizza", "castle", "guitar",
  "sunflower"]` and live in a constant in `backend/src/services/roomStore.ts` (or
  equivalent). No dynamic or random word selection is used.
- `wordIndex` initialises to `0` when the room is created and is stored on the in-memory
  `Room` object; it increments by 1 on each `startGame` call.
- The `role` field on `Participant` is a new addition: `ParticipantRole` type
  (`"drawer" | "guesser"`) is already defined in the starter, but is not yet attached
  to the `Participant` interface. Scenario 2 adds `role: string` to `Participant` and
  assigns it inside `startGame`. The `roles: ParticipantRole[]` parallel array on
  `RoomSnapshot` is removed in favour of the per-participant `role` field.
- FR-001, FR-002, and FR-014 are implemented by extending the existing `startGame`
  function in `backend/src/services/roomStore.ts` (added in Scenario 1). That function
  already sets `room.status = "playing"` and calls `saveRoom`. Scenario 2 adds role
  assignment, word selection, and the already-playing guard to the same function body.
  It does not replace, duplicate, or move the existing function (constitution Principle I:
  Brownfield-First).
- The Game screen calls `fetchRoomByCode(code, playerName)` on mount — using `code` from
  `useParams` and `playerName` from `localStorage.getItem("playerName")` — before the
  polling interval begins. This ensures the screen hydrates correctly after a page refresh
  when `roomStore.state.room` is null.
- The drawer's name is derived on the frontend via
  `participants.find(p => p.role === "drawer")?.name`; no separate `drawerName` field is
  added to the backend or frontend types.
- The `/result` route and page are placeholders that will be fully implemented in
  Scenario 4; Scenario 2 only adds the navigation trigger.
- Node.js single-threaded event loop means no locking is needed for role assignment or
  `wordIndex` increments.
- The guess input component (`<GuessForm />`) already exists in the starter; Scenario 2
  only controls its visibility via conditional rendering.
- Role-based API filtering is implemented in `GET /rooms/:code` via a `?player=<name>`
  query parameter. This replaces the previous `?participantId=` parameter, which was
  wired into `toRoomSnapshot` but immediately discarded (`void viewerParticipantId`)
  and therefore never implemented. The `?player=` param is safe to adopt because the old
  param had no live effect, and `LobbyPage.tsx` requires zero changes — the lobby
  response fields (participants, host, status, code) are unaffected by the param rename.
  `roomStore.fetchRoom()` is updated to pass `localStorage.getItem("playerName")` instead
  of `this.state.participantId`, making the param both refresh-safe and consistent with
  the Game screen hydration pattern (FR-013).
