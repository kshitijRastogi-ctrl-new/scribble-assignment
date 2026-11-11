# Summary

Add a How to play heading to the Start page

## What changed

- Added a labelled section and heading immediately before the step cards.
- Reused the card heading typography and ink colour; left the room links and card content intact.
- Enabled CSS processing in Vitest for stylesheet assertions.

## Decisions

- Kept the existing responsive grid and spacing rather than introducing a new layout.
- Used a semantic heading and labelled section. No new failure paths were introduced.

## How each criterion is met

- Heading above the cards: `places the How to play heading directly above the step cards`.
- Existing typography and colours: `uses the existing card heading typography and ink colour`.
- Buttons and cards unchanged: `preserves the room links and card content`.
- Phone width: `retains the responsive grid and phone-width spacing` checks the existing CSS and available width at 375px. This is a structural check, not a browser layout or visual test.

## How to verify

Run `cd frontend && npm run dev`, open the Start page, and check the heading, links, and cards at desktop and 375px widths using browser responsive tools.

## Tests

- Added four StartPage tests in `frontend/src/pages/StartPage.test.tsx`.
- Frontend `npm test`: initially two new CSS assertions failed because Vitest returned an empty stylesheet; after enabling CSS processing, all 6 tests passed.
- Backend `npm test`: all 4 tests passed.
- Frontend and backend `npm run build` and `npx tsc --noEmit`: passed.
- `npm test` at repository root: unavailable (no root package.json); suites run separately above.
- `npm run lint` in both apps: unavailable (neither defines a lint script).
- A visual 375px browser check was not run: no browser is installed in this environment.

## Docs updated

- README quick verification now includes the heading and phone-width check. No API or agent instructions changed.

## Open questions

- None.
