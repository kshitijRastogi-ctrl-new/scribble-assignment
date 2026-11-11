## Summary

Add copy button to room code badge

## What changed

- Added a compact, secondary-styled button beside the lobby room code, with two-second success feedback.
- Show a manual-copy hint if clipboard access fails or is unavailable.

## Decisions

- Use the browser Clipboard API; only report success after the write resolves. Repeat copies restart the feedback timer. Timers and stale requests are discarded on code change or unmount.
- Keep the code selectable for manual copying when clipboard access is denied or unavailable. No backend changes.

## How each criterion is met

- Button labelled Copy next to the code: `shows a styled Copy button next to the code and share hint`.
- Copies the room code: `copies the code and shows Copied! for two seconds`.
- Success label resets after two seconds: `copies the code and shows Copied! for two seconds`; repeated clicks: `restarts the feedback timer on another successful copy`.
- Existing button styles and badge layout: `shows a styled Copy button next to the code and share hint` checks classes and structure; visual appearance should also be checked in a browser.
- No backend changes: verified by reviewing the changed file list; existing backend tests pass.
- Clipboard failure and retry: `offers manual copying when the clipboard rejects or is unavailable, and allows retry`. Code changes and stale results: `clears feedback when the code changes and ignores stale clipboard results`.

## How to verify

1. Start backend and frontend as described in README, open the frontend on localhost or HTTPS, and create a room.
2. In the lobby, check that Copy sits beside the code and fits the badge on desktop and mobile widths. Click it and paste into a text field; verify the code and the temporary Copied! label.
3. Deny clipboard access or use an unsupported context and verify the manual-copy hint appears.

## Tests

- Added five component tests in `frontend/src/components/RoomCodeBadge.test.tsx`.
- Frontend `npm test`: initial run 1 failure because Vitest returned an empty CSS raw import; replaced that assertion with DOM class/structure checks. Rerun: 7 tests passed.
- Backend `npm test`: 4 tests passed.
- `npx tsc --noEmit` and `npm run build` in both frontend and backend: passed.
- Lint: neither package defines a lint script or lint configuration; `npm run lint --if-present` completed without running a linter.
- Root `npm test` was unavailable because there is no root package.json; the package suites were run separately.
- Browser verification was not run.

## Docs updated

- README: lobby copy behavior and clipboard limitations. No API, CLAUDE.md, or AGENTS.md changes needed.

## Open questions

- None.
