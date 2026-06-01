# Reflection Report

## What did the starter app already have?

The starter had a working room creation and join flow. Players could create a room with a unique code, join via that code, and see participants in a lobby with a manual refresh button. The backend had three endpoints (POST /rooms, POST /rooms/:code/join, GET /rooms/:code) with an in-memory store. The frontend had routing and placeholder components for the canvas, guess form, scoreboard, and result panel — none functional.

## What did I add?

**Scenario 1 — Room Setup & Lobby**: Host tracking, Zod validation rejecting empty names and codes, duplicate name rejection, lobby auto-polling every ~2s, host-only Start Game with 2-player minimum.

**Scenario 2 — Game Start & Drawer Flow**: Drawer assignment, deterministic word selection, role-based API filtering (drawer sees secret word, guessers do not), role-appropriate game screen UI.

**Scenario 3 — Gameplay Interaction**: Interactive HTML canvas with freehand drawing and guesser sync via polling, guess submission with trim and case-insensitive comparison, scoring (correct = 100), guess history synced to all players.

**Scenario 4 — Result, Restart & Final Validation**: Result screen showing secret word, sorted scoreboard, and guess history. Host-only restart with server-side verification, full round state reset with players preserved, polling-based return to lobby.

## Spec Kit process

Each scenario followed the specify → clarify → plan → tasks → implement → validate loop. Running clarify before planning caught real gaps — the dead-code participantId parameter, missing mount-time fetches, and spec inconsistencies around host verification. The tasks files made implementation traceable: every task had one file, one change, and a FR reference. Every AI-generated diff was reviewed before committing.
