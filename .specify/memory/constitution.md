<!--
Sync Impact Report
==================
Version change: [TEMPLATE] → 1.0.0
Modified principles: N/A (initial ratification from blank template)
Added sections:
  - Core Principles (5 principles)
  - Out-of-Scope Enforcement
  - Development Workflow & Review Discipline
  - Governance
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ aligned (Constitution Check section references these principles)
  - .specify/templates/spec-template.md ✅ aligned (scope/requirements match stated boundaries)
  - .specify/templates/tasks-template.md ✅ aligned (task categories match principle-driven types)
Follow-up TODOs: None — all placeholders resolved.
-->

# Scribble Constitution

## Core Principles

### I. Brownfield-First — Extend, Don't Replace

All feature work MUST enhance the existing starter codebase. Rewriting files wholesale,
introducing alternative routing libraries, or replacing the existing state management
pattern is forbidden. Every change must be traceable to a documented gap in the starter.

**Rationale**: The lab assessment is graded on incremental, auditable changes. A diff that
replaces the starter hides the specification-to-implementation traceability reviewers need.

### II. REST Polling Only — No Real-Time Protocols

All client–server synchronization MUST use HTTP polling at approximately 2-second intervals.
WebSockets, Socket.io, Server-Sent Events, and any push-based protocol are strictly
forbidden, even as optional fallbacks.

**Rationale**: The assignment explicitly constrains sync to REST polling. Introducing a
second sync mechanism splits the state model and makes the implementation harder to reason
about and validate.

### III. In-Memory State Only — No Persistence Layer

All game state (rooms, players, round data, guesses, scores) MUST be stored in the
backend process memory. No database (SQL, NoSQL, SQLite, files) may be used. State is
intentionally lost when the backend restarts. The backend MUST clean up inactive room
objects to avoid unbounded memory growth.

**Rationale**: Persistence introduces migration complexity and deployment concerns that are
explicitly out of scope. In-memory state keeps the implementation reviewable and the
mental model simple.

### IV. Spec-Driven Development — Trace Every Change

Every implementation task MUST trace back to an acceptance criterion in the spec. No
behavior may be added, changed, or removed without first updating the spec and plan.
AI-generated code MUST be reviewed by the developer before staging; review means checking
correctness, alignment with the spec, and the absence of out-of-scope behavior.

**Rationale**: The lab grades spec discipline over game polish. A well-traced diff is more
valuable than an untraced feature-complete implementation. Human review before commit
ensures the AI assistant does not silently violate the constitution or add scope.

### V. TypeScript Strict — No Silent Failures

All new and modified code in both `frontend/` and `backend/` MUST be fully typed
TypeScript. Use of `any` is forbidden; use `unknown` if a type is truly dynamic and
narrow it with a type guard. The backend MUST validate all external inputs with Zod.
The frontend MUST guard against API errors so the UI never crashes silently.

**Rationale**: TypeScript strictness catches category errors before runtime. Zod
validation at the API boundary prevents invalid state from entering the in-memory store.

## Out-of-Scope Enforcement

The following items MUST NOT appear in any spec, plan, task, or implementation artifact.
If an AI assistant proposes one of these, the developer MUST reject and document the
deviation.

**Technical**
- WebSockets, Socket.io, or any push protocol
- Databases or file-system persistence
- Authentication, sessions, JWT, or OAuth
- Deployment pipelines, Docker, or hosting configuration
- New state-management or routing libraries beyond what the starter ships

**Game Features**
- Multiple rounds or drawer rotation
- Round timers, countdowns, speed bonuses, or drawer bonuses
- Custom or random word packs (use only the five starter words)
- Spectator mode, room moderation, passwords, or invite links

**Process**
- Rewriting the starter from scratch
- Adding top-level npm dependencies not justified by an explicit spec requirement
- Refactoring code unrelated to a current acceptance criterion

## Development Workflow & Review Discipline

Follow this loop for each of the four feature groups before moving to the next:

1. **Discovery** — Read relevant starter files; document ≥3 gaps and ≥2 assumptions.
2. **Specify** — Write or update `spec.md` with acceptance criteria and edge cases.
3. **Clarify** — Resolve ambiguities before planning; update the spec with answers.
4. **Plan** — Update the state model, data-flow diagram, and file-level change list.
5. **Tasks** — Decompose the plan into ordered, dependency-annotated tasks.
6. **Implement** — Complete one meaningful slice at a time; commit after each slice.
7. **Validate** — Verify each acceptance criterion with two browser tabs before advancing.

**AI Usage Rules**
- AI assistance is permitted at every step.
- The developer MUST read every AI-generated diff before staging it.
- Commits containing unreviewed AI output are a constitution violation.
- If an AI suggestion adds out-of-scope behavior, reject it and note the deviation in the
  commit message or PR description.

**Commit Discipline**
- Commits MUST be granular: one logical change per commit.
- Commit messages MUST reference the scenario or task (e.g., `feat(scenario-1): add lobby polling`).
- Spec and plan updates MUST be committed before or alongside the implementation they describe.

## Governance

This constitution supersedes all other development practices for this project.
Amendments require:
1. A written reason for the change.
2. An updated version number (MAJOR for removals/redefinitions, MINOR for additions,
   PATCH for clarifications).
3. The `Last Amended` date updated to the amendment date.

All PRs MUST verify compliance with these principles before merging. Complexity beyond
what the spec requires MUST be justified in the plan's Complexity Tracking table.

Runtime development guidance is captured in `AGENTS.md` at the project root.

**Version**: 1.0.0 | **Ratified**: 2026-05-30 | **Last Amended**: 2026-05-30
