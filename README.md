# Scribble Starter

This repository is a scaffold for the Scribble lab.

## Overview

This lab starts from a runnable but intentionally incomplete Scribble-style guessing game with a minimal REST backend and an in-memory room system. The work is a brownfield enhancement: inspect the starter, produce Spec Kit artifacts, implement the missing behavior incrementally, validate against acceptance criteria, and reflect on the AI-assisted workflow.

Granular, meaningful commits are encouraged so implementation decisions remain easy to assess.

| Item | Details |
| --- | --- |
| Project type | Brownfield enhancement |
| Tech model | Frontend plus minimal REST backend, in-memory store, manual room refresh in the starter, polling added during implementation |
| Difficulty | Intermediate |
| Estimated effort | 4-6 focused hours across multiple sessions |
| Prerequisites | Comfort reading an existing codebase |

It already provides:

- `frontend/`: Vite + React + TypeScript client
- `backend/`: Node.js + Express + TypeScript service
- starter routes and screens for Start, Create Room, Join Room, Lobby, and Game
- starter room API with in-memory state
- starter seed data:
  - words: `rocket`, `pizza`, `castle`, `guitar`, `sunflower`
  - roles: `drawer`, `guesser`

It does not implement the required room and gameplay features described in the business scenarios below.

The current UI uses Scribble branding and presentational copy, but the supported behavior is still the scaffold described in this document.

## Prerequisites

Before starting, confirm the following are available:

- Node.js 18+ and npm 9+
- Git configured with your name and email
- a modern browser for two-tab multiplayer testing
- a code editor such as VS Code
- access to a Spec Kit-compatible AI coding assistant
- Spec Kit CLI installed and verified
- GitHub access to clone the starter and push your work
- network access to the npm registry

You should be comfortable with TypeScript, React components and hooks, REST APIs, command-line npm and git usage, and reading existing code before changing it.

## Repository Workflow

Starter repository: `https://github.com/everest-engineering/scribble-assignment`

Clone the starter repository locally and work directly in it. Commit Spec Kit artifacts and implementation changes as you progress, then submit the completed work through the platform.

## Learning Objectives

By the end of this lab you should be able to:

- inspect an existing codebase before writing code
- write a constitution that constrains AI-assisted development
- write a feature specification with acceptance criteria and edge cases
- resolve ambiguity through structured clarification
- produce a technical plan tied to real files and state models
- decompose work into ordered, testable tasks
- implement incrementally and validate each slice against the spec
- critically review AI-generated output before committing it
- produce a clear reflection report

## Current Implementation

The current branch is scaffold-only.

Implemented today:

- app shell and page routing
- branded landing page and cleaned starter UI
- create room flow
- join room by code flow
- fetch room snapshot flow
- in-memory room storage on the backend
- lobby participant display from the latest fetched snapshot
- game screen placeholders for canvas, guess input, scoreboard, and results
- basic light UI styling

Not implemented yet:

- host behavior or host-only permissions
- automatic lobby polling
- start game flow
- drawer assignment
- secret word visibility rules
- drawing interaction
- clear canvas action
- guess submission and synced history
- scoring
- result state
- restart flow

## API Included In The Starter

Backend endpoints currently available:

- `GET /health`
- `POST /rooms`
- `POST /rooms/:code/join`
- `GET /rooms/:code`

The backend stores all room data in memory only. Restarting the backend clears all rooms.

## Run The Backend

```bash
cd backend
npm install
npm run dev
```

The backend runs on `http://localhost:3001`.

## Run The Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

If needed, point the frontend at a different backend with `VITE_API_URL`.

## Quick Verification

Use this to confirm the starter works from a clean clone:

1. Start the backend and confirm `http://localhost:3001/health` returns `{ "ok": true }`.
2. Start the frontend and open `http://localhost:5173`.
3. Confirm the Start screen shows `Create Room` and `Join Room`.
4. Create a room and confirm you land on the Lobby screen.
5. Open another tab, join the same room, and use the Lobby refresh button to load the latest participant list.
6. Open the Game screen and confirm the canvas, guess input, scoreboard, and result areas are placeholders only.
7. Treat any start-page marketing copy as presentational only; use this README for actual supported scope.

## Recommended Build Order

Within each feature group, follow this loop:

1. Discovery: read the relevant starter files and document gaps and assumptions.
2. Specify: update the spec with acceptance criteria.
3. Clarify: resolve ambiguity before planning.
4. Plan: update state model changes, file-level changes, and data flow.
5. Tasks: decompose the plan into ordered, testable work.
6. Implement: complete one meaningful slice at a time and commit it.
7. Validate: verify the acceptance criteria with two browser tabs.
8. Move forward only after the current scenario passes.

## Required Spec Kit Artifacts

Maintain these artifacts throughout the lab:

- discovery notes with at least 3 incomplete behaviors, at least 2 assumptions, and relevant files
- `/speckit.constitution` covering engineering principles, AI usage rules, and review discipline
- `/speckit.specify` files updated incrementally by feature group with acceptance criteria
- `/speckit.plan` updated incrementally with state model, data flow, and file-level plan
- `/speckit.tasks` updated incrementally with ordered tasks and dependencies

## 6.2 Business Scenarios

### Scenario 1: Room Setup And Lobby

Given a player wants to host or join a drawing game, when they create or join a room via a unique code, then the creator is automatically the host; invalid or empty codes are rejected with clear feedback; rooms are fully isolated; the lobby refreshes via polling at about 2 seconds; and only the host can start the game once at least 2 players are present.

### Scenario 2: Game Start And Drawer Flow

Given a game is starting and player names are trimmed, when the first round begins, then empty or whitespace-only names are rejected with a message; the host or first player becomes the clearly identified drawer; and the secret word is deterministically selected from the starter list and visible only to the drawer.

### Scenario 3: Gameplay Interaction

Given a round is active with a drawer and guessers and all scores start at 0, when the drawer draws or clears the canvas and guessers submit their guesses, then the drawing is visible on the drawer's screen; guesses are trimmed, compared case-insensitively, and empty guesses are rejected; the guess history is synced to all players through polling; and correct guesses score 100 while incorrect guesses add 0.

### Scenario 4: Result, Restart And Final Validation

Given a round has ended, when the result state is displayed and the host restarts, then all players see the correct word, final scores, and full guess history; and on restart everyone returns to the lobby with players preserved and all round state cleared.

## Phased Checkpoints

Work through the scenarios in order and complete each checkpoint before moving to the next one.

| Group | Scenario | What should exist by the end |
| --- | --- | --- |
| 1. Room setup and lobby | Scenario 1 | Host tracking on room creation, join validation with clear errors, multi-room isolation, automatic lobby polling within about 2 seconds, host-only start with a 2-player minimum |
| 2. Game start and drawer flow | Scenario 2 | Player name validation, drawer assignment, deterministic secret word selection, drawer-only word visibility |
| 3. Gameplay interaction | Scenario 3 | Interactive drawing canvas, clear canvas, guess submission with validation, synced guess history through polling, deterministic scoring |
| 4. Result, restart, and final validation | Scenario 4 | Shared result state visible to all players, clean restart to lobby with players preserved and round state cleared |

Complete a minimum of 4 specify iterations.

## Artifact Contents

- Constitution: workflow rules, coding standards, deterministic game-rule principles, AI usage rules, self-review, and testing expectations
- Specification: room lifecycle and isolation, lobby polling cadence, start-game preconditions, drawer assignment, word selection, drawing and clear behavior, guess validation, guess history sync, scoring, result contents, restart reset, edge cases, and acceptance criteria
- Plan: findings, relevant files and endpoints, frontend and backend state model, data flow, implementation sequence, testing strategy, and risks
- Tasks: discovery, artifact, backend, frontend, game logic, testing, documentation, and review work

## Explicitly Out Of Scope

These should stay out of the implementation:

- WebSockets or real-time sync
- live drawing stroke broadcast
- databases or persistent storage
- authentication, accounts, or sessions
- deployment, hosting, CI, or Docker work
- new state-management or routing libraries beyond what the starter ships
- multiple rounds, drawer rotation, timers, countdowns, speed bonuses, or drawer bonuses
- custom or random word packs
- spectator mode
- moderation features such as kick or mute
- room passwords or invite links
- rewriting the starter from scratch
- unjustified top-level dependencies
- unrelated refactors

These boundaries keep the lab focused and reduce drift between the spec, plan, tasks, and implementation.

## Submission Tracks

Spec Kit keeps specs and source code in independent folders, connected by traceability rather than directory nesting.

| Track | Submit | Why |
| --- | --- | --- |
| Dev | `specs/` plus `src/` | Full spec-to-implementation traceability with working code that matches the artifacts |
| Specs-only | `specs/`, with `src/` optional | Focus on discovery, specification, planning, and task decomposition without local setup or debugging overhead |

Both tracks are assessed on artifact quality. Source code is assessed only for Dev submissions and only for alignment with the submitted specs.

## Evaluation Rubric

| Area | What good looks like |
| --- | --- |
| Discovery | At least 3 gaps, at least 2 assumptions, and relevant files documented |
| Spec Kit artifacts | Constitution, spec, plan, and tasks committed and internally consistent |
| Working game flow | Two browsers can join a room, play one round, see synced result, and restart |
| Edge cases and validation | Empty or invalid inputs, case-insensitive guesses, and multi-room isolation handled |
| Implementation alignment | Code behavior matches the spec, and deviations are documented |
| Reflection | Reflection explains decisions, AI usage, and tradeoffs |
| Submission clarity | Submission is easy to review |

## Reflection Report

Provide a brief `.md` reflection report. Use these prompts as a starting point:

- What did the starter app already have?
- What did you add?
- How did the Spec Kit artifacts guide implementation?
- Where did AI assistance help, and where did you review or correct it?
- What tradeoffs or risks remain?

## Build Validation

Run both builds before handing off changes:

```bash
cd backend
npm run build
```

```bash
cd frontend
npm run build
```

## Troubleshooting

- If the frontend cannot reach the backend, verify the backend is running on port `3001`.
- If the backend port is already in use, run `PORT=<new-port> npm run dev`.
- If local commands are missing, rerun `npm install` in the relevant app directory.
