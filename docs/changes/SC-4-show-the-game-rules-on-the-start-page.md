## Summary
Add rules card to start page

## What changed
Added a Rules card beneath the three step cards with an ordered list of three short rules, styled to match the existing cards.

## Decisions
Reused the existing Card component and kept room links unchanged. The rules are presentational copy; this change does not implement multiple rounds or scoring changes.

## How each criterion is met
- Card beneath Draw, Guess and Win: `StartPage > shows a Rules card below the Draw, Guess and Win cards`.
- Three rules in order: `StartPage > lists the three rules in order`.
- Create and Join navigation: `StartPage > opens the %s form from the start page` (both cases click the real links and check the corresponding form).

## How to verify
Run `cd frontend && npm test`, or start the frontend and inspect the start page and both room links.

## Tests
- Added four frontend tests for placement, ordered copy, and both navigation links. Targeted test run: 4 passed.
- Frontend suite: 6 passed; backend suite: 4 passed.
- Frontend and backend builds and `npx tsc --noEmit` passed.
- No lint script or configuration is present in either package; `npm run lint --if-present` completed without running a linter.
- A root-level `npm test` attempt failed because there is no root package.json; the package suites above passed.
- React Router emitted its existing v7 future-flag warnings in the frontend tests.

## Docs updated
README quick verification now mentions the Rules card and its presentational scope.

## Open questions
None.
