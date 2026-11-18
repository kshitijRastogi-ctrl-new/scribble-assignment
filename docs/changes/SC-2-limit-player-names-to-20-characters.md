## Summary
Limit player names to 20 characters

## What changed
- Validate trimmed names in both room forms and create/join API schemas.
- Adjust the existing lobby regression fixture to use a valid name.

## Decisions
- Count JavaScript UTF-16 code units, consistently with Zod and the frontend's string length. Trim before checking; do not truncate input.
- Keep the existing empty-name error and validate names before attempting room operations.

## How each criterion is met
1. `rejects names longer than 20 characters after trimming without navigating` runs for both forms and checks the error, no request, and no navigation.
2. `accepts exactly 20 characters after trimming and navigates to the lobby` covers both forms; `accepts exactly 20 trimmed characters on create and join` covers both API endpoints.
3. `rejects overlong names on create and join with a 400 and message` exercises both HTTP endpoints and checks that the join did not add a participant.
4. `rejects empty and whitespace-only names without navigating` covers both forms; `rejects empty and whitespace-only names on create and join` covers both endpoints.

## How to verify
Run `npm test`, `npx tsc --noEmit`, and `npm run build` in both `frontend` and `backend`. In the app, submit names of 21 and 20 characters on both forms, then try an empty name.

## Tests
- Added frontend form tests for overlong, boundary, empty, and whitespace-only names, and backend HTTP tests for the same cases. Targeted runs passed (frontend: 2, then 4, then 6 tests; backend: 2, then 3 tests).
- Final full suites: frontend 8 passed; backend 7 passed. Frontend typecheck and build passed. Backend typecheck initially failed on the new test server callback type; corrected it, then the suite, typecheck, and build passed.
- `npm run lint --if-present` completed in both projects; neither defines a lint script or lint configuration, so no lint was run.
- The Playwright regression fixture was updated but not run: this repository has no Playwright runner/configuration or dependency.

## Docs updated
- `README.md` and `specs/001-room-setup-lobby/contracts/api.md` describe the limit and API error. `CLAUDE.md` and `AGENTS.md` contain no affected behavior.

## Open questions
None.
