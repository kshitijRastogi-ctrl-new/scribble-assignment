## Summary

Add How to play heading to Start page

## What changed

Added a heading immediately above the existing step card grid. The room links and card content are unchanged.

## Decisions

Used an h2 with the existing card heading typography and ink colour. Kept the grid and its responsive rules unchanged. Enabled CSS processing in Vitest so the shared heading styles can be checked.

## How each criterion is met

- Heading directly above Draw / Guess / Win: `places the How to play heading directly above the step cards`.
- Existing typography and colours: `uses the same typography and ink colour as card headings`.
- Buttons and cards unchanged: `preserves the room links and step card content`.
- Phone width: `retains the responsive phone-width grid and padding rules` checks the existing responsive CSS and unconstrained heading wrapper. This is not a visual layout test; a browser check at 375px remains advisable.

## How to verify

Run `cd frontend && npm test`, then `npm run dev`. Open the Start page, check the heading, links and cards, and use browser responsive mode at 375px to check spacing and overflow.

## Tests

- Added four `StartPage` tests for placement, shared styles, responsive CSS and unchanged content.
- Frontend suite: 6 tests passed; initial runs failed while configuring CSS processing and reading jsdom CSS properties, then passed.
- Backend suite: 4 tests passed.
- Frontend and backend builds and `npx tsc --noEmit`: passed.
- `npm run lint` in each package: unavailable (no lint scripts). Root `npm test` is unavailable (no root package.json).
- No browser executable was available for a visual 375px check; jsdom does not perform layout.

## Docs updated

Updated the README quick verification steps. CLAUDE.md, AGENTS.md and API documentation are unaffected.

## Open questions

None.
