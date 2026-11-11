# Summary

Add a copy button to the room code badge

## What changed

The lobby badge can copy its room code and displays temporary success feedback. It offers a manual-copy message if clipboard access fails.

## Decisions

- Use the browser Clipboard API; report failure rather than claim a copy succeeded. Clipboard access needs a secure context and browser permission.
- Reuse the secondary button style with compact badge-specific sizing. Disable the button during an outstanding write, reset the feedback timer on another successful copy, and clean it up on unmount.
- No backend changes or dependencies.

## How each criterion is met

- Copy button next to the code: `shows a styled Copy button next to the code and retains the sharing hint`.
- Copy the code: `copies the room code and shows Copied! for two seconds after each success`.
- Success label for two seconds, including repeated clicks: `copies the room code and shows Copied! for two seconds after each success`.
- Existing button styles and compact badge styling: `shows a styled Copy button next to the code and retains the sharing hint` checks the classes; visual appearance can be checked in the browser.
- No backend changes: verified with `git status`/diff; no backend files changed (no runtime test needed).

## How to verify

Start backend and frontend as described in README, create a room on localhost or HTTPS, click Copy, paste the code, and check the label returns after two seconds. Deny clipboard access or use an unsupported context to check the manual-copy message. Check the badge at desktop and mobile widths.

## Tests

- Added six `RoomCodeBadge` tests for layout/classes, copying and timing, pending writes, rejected and unavailable clipboard access, retry, and timer cleanup.
- Frontend `npm test`: passed initially (7 tests) and after adding pending-write coverage (8 tests).
- Backend `npm test`: passed (4 tests).
- Frontend and backend `npx tsc --noEmit`: passed; both `npm run build` commands passed.
- `npm run lint` in both apps: unavailable (neither package defines a lint script).
- Root `npm test`: unavailable (no root package.json); the two app suites were run separately.
- `git diff --check`: passed. Manual browser verification not performed.

## Docs updated

README quick verification now describes copying, secure contexts, and manual fallback. No API or agent instruction changes needed.

## Open questions

None.
