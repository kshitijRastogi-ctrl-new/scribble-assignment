# Feature Specification: Gameplay Interaction

**Feature Branch**: `003-gameplay-interaction`

**Created**: 2026-05-31

**Status**: Clarified

**Input**: Scenario 3 — Gameplay Interaction (Brownfield enhancement to Scribble starter)

## Clarifications

### Session 2026-05-31

- Q: Should canvas state upload on every mousemove or only on stroke end? → A: Stroke end only (mouseup and mouseleave while drawing). Per-mousemove uploads fire 100–200 times per second; guessers poll at ~2s regardless so intermediate frames would never be rendered. The assignment brief confirms REST polling only — no WebSockets, no push protocols.
- Q: Does GET /rooms/:code return canvasData for all players or guessers only? → A: All players unconditionally. The drawing is not secret (the drawer created it). No role-based filtering applies — unlike secretWord, canvasData has no security motivation for hiding. Returning it to all is simpler and consistent with the brownfield-first principle.
- Q: When two guessers submit correct guesses near-simultaneously, which one scores? → A: First POST to arrive wins. Node.js single-threaded event loop processes requests serially. The first correct guess scores 100 and sets room.status = "result". The second POST finds room.status === "result" and receives 400 "Round already over" with no score change. No locking needed.
- Q: Is room.guesses preserved when room.status transitions to "result"? → A: Yes — room.guesses and room.canvasData are never cleared on status transition. Setting room.status = "result" MUST NOT modify either field. Scenario 4 reads both from the same in-memory Room object to display the final drawing, scores, and full guess history.
- Q: Should canvasData be cleared when the round ends? → A: Preserved. Clearing is out of scope for Scenario 3. Scenario 4 may display the final canvas on the result screen; preserving it is free.
- Q: How is GuessForm wired to call POST /rooms/:code/guess? → A: An onSubmit: (guess: string) => void callback prop is added to GuessForm. GuessForm handles trim + empty validation and calls onSubmit with the clean text. GamePage supplies the implementation (read code and playerName from context, call the API). Keeps GuessForm thin, testable, and free of store coupling.
- Q: How is Scoreboard wired to live participant data? → A: A participants: Participant[] prop is added to Scoreboard. GamePage passes room?.participants ?? [] from its existing useRoomState() call. No store coupling inside Scoreboard.
- Q: What should render on the canvas when canvasData is "" (game just started)? → A: Blank white canvas. The client skips the drawImage call entirely when canvasData is "". No error, no placeholder text.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Interactive Drawing Canvas (Priority: P1)

The drawer sees a live HTML canvas instead of the static placeholder div. They can
draw freehand strokes with a mouse. The canvas state is uploaded to the backend after
each stroke ends so guessers can see the drawing update within ~2 seconds.

**Why this priority**: The canvas is the core game mechanic. Without a drawable surface
synced to the backend, neither the guess nor the scoring features have anything to
react to.

**Independent Test**: Open the game as Alice (drawer). Confirm a canvas element is
rendered (not a div). Draw a stroke and release the mouse. Confirm a network request
to POST /rooms/:code/canvas is made. Confirm Bob's tab shows the updated drawing within
~2 seconds.

**Acceptance Scenarios**:

1. **Given** the viewer is the drawer, **When** the Game screen renders, **Then** an
   interactive canvas element is displayed in the main panel (not the placeholder div).
2. **Given** the drawer is on the canvas, **When** they press and drag the mouse, **Then**
   a continuous freehand stroke is drawn following the pointer.
3. **Given** the drawer completes a stroke (mouse released), **When** the stroke ends,
   **Then** the canvas state is sent to the backend as a base64-encoded data URL via
   POST /rooms/:code/canvas.
4. **Given** the viewer is a guesser, **When** the Game screen renders, **Then** the
   canvas is displayed as read-only — no drawing or clearing is possible.
5. **Given** a guesser is on the Game screen, **When** the polling tick fires (~2s),
   **Then** the canvas element is updated with the latest image from GET /rooms/:code.

---

### User Story 2 — Clear Canvas (Priority: P1)

The drawer can wipe the entire canvas with a single button click. The clear action is
sent to the backend so guessers see the blank canvas on their next poll.

**Why this priority**: Without clear, the drawer cannot correct mistakes. It is the
minimum editing capability required for a playable round.

**Independent Test**: Alice draws something. Alice clicks "Clear". The canvas goes
blank immediately. Bob's tab shows a blank canvas within ~2 seconds.

**Acceptance Scenarios**:

1. **Given** the viewer is the drawer, **When** the Game screen renders, **Then** a
   "Clear" button is visible alongside the canvas.
2. **Given** the drawer clicks "Clear", **When** the action fires, **Then** the canvas
   is immediately wiped to a white background.
3. **Given** the canvas is cleared, **When** the clear completes, **Then** the blank
   canvas state is sent to the backend via POST /rooms/:code/canvas.
4. **Given** the viewer is a guesser, **When** the Game screen renders, **Then** no
   "Clear" button is visible.

---

### User Story 3 — Guess Submission (Priority: P1)

Guessers can type a word into the existing GuessForm and submit it. The guess is
trimmed and rejected if empty. A valid guess is sent to the backend via
POST /rooms/:code/guess with the player name and the trimmed text.

**Why this priority**: Guess submission is the guesser's entire interaction surface.
Without it there is no game loop.

**Independent Test**: As Bob (guesser), type "  rocket  " and submit. Confirm the
request body contains `{ "playerName": "Bob", "guess": "rocket" }`. Type spaces only
and submit. Confirm an inline error "Guess cannot be empty" is shown and no request
is sent.

**Acceptance Scenarios**:

1. **Given** the viewer is a guesser, **When** they type a word and submit, **Then**
   the guess is trimmed of leading/trailing whitespace before submission.
2. **Given** the trimmed guess is empty, **When** the guesser submits, **Then** the
   form displays the error "Guess cannot be empty" and no request is sent.
3. **Given** the trimmed guess is non-empty, **When** the guesser submits, **Then**
   POST /rooms/:code/guess is called with `{ playerName, guess }`.
4. **Given** the viewer is the drawer, **When** the Game screen renders, **Then** the
   guess input is not rendered (Scenario 2 precondition — already enforced).

---

### User Story 4 — Guess Validation and Scoring (Priority: P2)

The backend compares the submitted guess to the secret word case-insensitively. A
correct guess increases the guesser's score by 100. An incorrect guess adds 0. Every
guess is appended to a persistent guess history with the player name, submitted text,
and a correct/incorrect flag.

**Why this priority**: Scoring and guess history are the direct outcome of a correct
guess. They are required for the round to have a result and for the Scoreboard to show
meaningful data.

**Independent Test**: Bob submits "Rocket" when secret word is "rocket". Check that
Bob's score increases by 100 in the GET /rooms/:code response. Submit "pizza" (wrong).
Check Bob's score is unchanged. Check that both guesses appear in the response history
array with correct `isCorrect` values.

**Acceptance Scenarios**:

1. **Given** a guess matches the secret word (case-insensitively), **When** the backend
   processes it, **Then** the guessing player's `score` increases by 100.
2. **Given** a guess does not match the secret word, **When** the backend processes it,
   **Then** the player's `score` is unchanged.
3. **Given** any valid guess is submitted, **When** it is stored, **Then** the guess
   history entry includes: `playerName`, `text` (trimmed), and `isCorrect` (boolean).
4. **Given** multiple guesses have been submitted, **When** GET /rooms/:code is called,
   **Then** the response includes all guesses in submission order.

---

### User Story 5 — Guess History Sync (Priority: P2)

All players see the full guess history on the Game screen, updated within ~2 seconds
of each new guess. The history shows who guessed, what they typed, and whether it was
correct.

**Why this priority**: Shared history is what makes the game social. Without it,
players have no shared view of what has been tried.

**Independent Test**: Bob submits two guesses. Alice's tab (drawer) shows both in the
history within ~2 seconds without a manual refresh. The Scoreboard reflects Bob's
updated score.

**Acceptance Scenarios**:

1. **Given** a guesser submits a guess, **When** 2 seconds pass, **Then** all players
   see the new entry in the guess history panel.
2. **Given** the guess history panel renders, **When** entries are shown, **Then** each
   entry displays the player's name, the submitted text, and a correct/incorrect
   indicator.
3. **Given** a correct guess is submitted, **When** the Scoreboard polls next, **Then**
   the guesser's score in the Scoreboard reflects the 100-point increase.

---

### User Story 6 — Round End (Priority: P2)

When a correct guess is submitted, the backend transitions the room status from
`"playing"` to `"result"`. All players' Game screens detect this status change via
polling and navigate automatically to `/result` within ~2 seconds.

**Why this priority**: Round end is the conclusion of the game loop that connects
Scenario 3 to Scenario 4. Without it, a correct guess has no visible consequence
beyond the score increment.

**Independent Test**: Bob submits the correct word. Confirm room status becomes
`"result"` in the GET response. Confirm both Alice's and Bob's tabs navigate to
`/result` within ~2 seconds without any manual action.

**Acceptance Scenarios**:

1. **Given** a guesser submits the correct word, **When** the backend processes it,
   **Then** `room.status` transitions to `"result"`.
2. **Given** room status is `"result"`, **When** any player's polling tick fires,
   **Then** the client navigates to `/result`.
3. **Given** two players are on the Game screen, **When** one submits the correct word,
   **Then** both tabs navigate to `/result` within one poll cycle (~2 seconds).

---

### Edge Cases

- What happens when a guesser submits an empty or whitespace-only guess? The frontend
  rejects it with "Guess cannot be empty" before any network request is made.
- What if the correct word has been guessed but another guesser submits before their
  poll updates? POST /rooms/:code/guess MUST return 400 `{ "error": "Round already
  over" }` if `room.status` is `"result"`, leaving scores and history unchanged.
- What if two guessers submit correct guesses near-simultaneously? Node.js processes
  requests serially. The first POST to arrive scores 100 and transitions the room to
  `"result"`. The second POST — even if also correct — finds `room.status === "result"`
  and receives 400 `"Round already over"` with no score change. First-in-wins is
  deterministic and requires no locking.
- What if the drawer's mouse leaves the canvas mid-stroke? The stroke ends and the
  canvas state is uploaded on `mouseleave` the same as on `mouseup`.
- What if POST /rooms/:code/canvas fails? The drawer continues drawing; the error is
  surfaced via `refreshError` (already wired). The canvas state will sync on the next
  successful upload.
- What if `localStorage.getItem("playerName")` is null when submitting a guess?
  The GuessForm MUST NOT submit — it reads `playerName` from localStorage and
  includes it in the request body. If null, the form cannot determine the sender and
  must show an error (the redirect guard in GamePage already redirects to `/` before
  this path is reachable).
- What if the canvas has never been drawn on? GET /rooms/:code returns `canvasData: ""`
  (empty string). The frontend renders the canvas as blank (no image drawn).
- What if a late joiner (role `""`) opens the Game screen mid-round? They see the
  canvas as read-only (same as a guesser). The guess input is hidden because
  `myRole !== "guesser"`. They see the guess history but cannot submit.
- What happens if the backend is restarted mid-round? In-memory state is lost. Polls
  return 404. The `refreshError` mechanism surfaces this to the player.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Game screen MUST replace the canvas placeholder div with an HTML
  canvas element when the room status is `"playing"`.
- **FR-002**: The canvas MUST support freehand mouse drawing (mousedown → mousemove →
  mouseup) for the drawer only.
- **FR-003**: Mouse drawing MUST be disabled (canvas is read-only) for guessers and
  players with role `""`.
- **FR-004**: On each stroke end (mouseup or mouseleave while drawing), the drawer's
  client MUST send the full canvas state as a base64 data URL to
  POST /rooms/:code/canvas in the body `{ canvasData: "<base64 string>" }`.
- **FR-005**: A "Clear" button MUST be visible and functional for the drawer only.
  Clicking it clears the canvas and triggers POST /rooms/:code/canvas with the blank
  state.
- **FR-006**: The backend MUST store `canvasData: string` on the room (initialised to
  `""`) and update it on each POST /rooms/:code/canvas call.
- **FR-007**: GET /rooms/:code MUST include `canvasData` in its response for all
  players regardless of role. When `canvasData` is `""` (empty string), clients MUST
  render a blank white canvas — no `drawImage` call is attempted.
- **FR-008**: The GuessForm MUST trim the submitted text before validation and
  submission.
- **FR-009**: The GuessForm MUST reject an empty (post-trim) guess with the inline
  error message `"Guess cannot be empty"` without sending a network request.
- **FR-010**: The GuessForm MUST send POST /rooms/:code/guess with body
  `{ playerName: string, guess: string }` for a non-empty trimmed guess.
- **FR-011**: The backend MUST compare the trimmed guess to `room.secretWord`
  case-insensitively.
- **FR-012**: A correct guess MUST increase the matching participant's `score` by 100.
- **FR-013**: An incorrect guess MUST leave the participant's `score` unchanged.
- **FR-014**: Every processed guess MUST be appended to `room.guesses` as
  `{ playerName: string, text: string, isCorrect: boolean }`.
- **FR-015**: A correct guess MUST transition `room.status` from `"playing"` to
  `"result"`. This transition MUST NOT modify `room.guesses` or `room.canvasData` —
  both fields are preserved unchanged so Scenario 4 can display the full guess history
  and final drawing.
- **FR-016**: POST /rooms/:code/guess MUST return 400 `{ "error": "Round already over" }`
  if `room.status` is already `"result"`.
- **FR-017**: GET /rooms/:code MUST include the full `guesses` array in its response.
- **FR-018**: The Scoreboard component MUST render each participant's name and current
  score from the polled room data.
- **FR-019**: The guess history panel on the Game screen MUST render each entry in
  `room.guesses` showing player name, guess text, and a correct/incorrect indicator.
- **FR-020**: The existing Game screen polling (FR-006 from Scenario 2 spec) already
  navigates to `/result` when `room.status === "result"` — no new polling logic is
  required.

### Key Entities

- **Room**: gains two new fields — `canvasData: string` (initialised to `""`) and
  `guesses: Guess[]` (initialised to `[]`).
- **Guess**: new entity — `{ playerName: string, text: string, isCorrect: boolean }`.
  Stored as an ordered array on the Room object; append-only.
- **Participant**: `score` field already present; updated by +100 on correct guess.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The drawer's canvas strokes appear on all guesser screens within one poll
  cycle (~2 seconds) of the stroke ending.
- **SC-002**: An empty or whitespace-only guess is rejected with an inline error before
  any network request is made — confirmed by the absence of a POST /rooms/:code/guess
  request in browser devtools.
- **SC-003**: A correct guess increases the guesser's displayed score by exactly 100
  within one poll cycle of submission.
- **SC-004**: Both drawer and guesser tabs navigate automatically to `/result` within
  one poll cycle (~2 seconds) of a correct guess — no manual refresh required.
- **SC-005**: The guess history panel shows all submitted guesses (correct and
  incorrect) with player name and outcome indicator for all players within one poll
  cycle of each submission.

## Assumptions

- `playerName` and `roomCode` are read from localStorage on every form submission and
  poll. No additional router state is needed.
- Canvas drawing uses the browser's native 2D canvas API (`getContext("2d")`). No
  external drawing library is introduced (constitution Principle: no new npm
  dependencies for core game mechanics).
- Canvas data is serialised as a PNG data URL (`canvas.toDataURL("image/png")`). This
  is the simplest lossless format and requires no additional processing on the backend,
  which stores it as a plain string.
- The backend stores `canvasData` as a raw string on the in-memory `Room` object. No
  size limits are enforced for this lab scope.
- The backend stores `guesses` as an append-only array on the in-memory `Room` object.
  Guess history is not paginated.
- The GuessForm component already renders for guessers (Scenario 2). Scenario 3
  activates its submit logic by adding an `onSubmit: (guess: string) => void` callback
  prop. GuessForm handles trim validation and empty rejection internally, then calls
  `onSubmit` with the clean text. GamePage supplies the implementation (reads `code`
  and `playerName` from its existing scope, calls POST /rooms/:code/guess). No new
  component is created.
- The Scoreboard component already renders in the left sidebar (Scenario 2 starter).
  Scenario 3 adds a `participants: Participant[]` prop. GamePage passes
  `room?.participants ?? []` from its existing `useRoomState()` call. Scoreboard
  renders each participant's name and score. No new component is created.
- POST /rooms/:code/canvas is a dedicated endpoint (new). It accepts `{ canvasData }`,
  updates the room, and returns `{ ok: true }`.
- POST /rooms/:code/guess is a dedicated endpoint (new). It accepts
  `{ playerName, guess }`, validates, scores, and returns the updated room snapshot.
- The existing `GET /rooms/:code` endpoint is extended to include `canvasData` and
  `guesses` in its response — no new GET endpoint is required.
- Node.js single-threaded event loop means no locking is needed for score updates or
  guess appends.
- Re-submitting a correct word after the round is over returns 400 "Round already
  over". The frontend surfaces this via the existing `refreshError` display.
