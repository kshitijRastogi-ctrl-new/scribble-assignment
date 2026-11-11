## Summary
Add a How to play heading

## What changed
- Added a labelled section heading immediately above the Start page step cards.
- Added Start page rendering tests and updated the quick verification instructions.

## Decisions
- Reused `page-header` heading typography and ink colour, and kept the existing responsive card grid and room links unchanged.
- Used a labelled section to associate the heading with the cards. No new behaviour or failure path was introduced.

## How each criterion is met
- Heading above the cards: `labels the step cards with an existing page-header heading` checks its text and position.
- Existing typography and colours: the same test checks the `page-header` class and h2, which use the existing stylesheet.
- Unchanged buttons and cards: `preserves the room links and the three step cards` checks destinations, classes, titles, badges and copy.
- Phone width: `keeps the cards in the existing responsive hero grid` checks the existing grid is retained. The stylesheet's phone padding and auto-fitting grid were not changed; a visual 375px browser check is still needed because jsdom does not perform layout.

## How to verify
- Run `cd frontend && npm run dev`, open the Start page, and inspect the heading, links and cards at desktop and 375px viewport widths.
- Run `npm test` and `npm run build` in both `frontend` and `backend`.

## Tests
- Added three `StartPage` rendering tests. Frontend `npm test`: 5 passed; backend `npm test`: 4 passed.
- Frontend and backend `npm run build` and `npx tsc --noEmit`: passed.
- Initial frontend tests failed because Vitest replaced a CSS raw import with an empty string; the tests were revised to check the existing classes instead. The subsequent build exposed missing Node types in the attempted file-based CSS check, which was removed; the final test and build runs passed.
- Root `npm test` could not run because there is no root package.json; both package suites were run instead.
- `npm run lint` could not run in either package: neither defines a lint script.
- No browser is installed in this environment, so the phone-width visual check was not run.

## Docs updated
- `README.md`: added heading and phone-width checks to Quick Verification.
- No API or agent instruction changes were needed.

## Open questions
- None. Visual verification at 375px remains a manual follow-up.
