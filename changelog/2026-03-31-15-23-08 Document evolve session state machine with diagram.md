# Document evolve session state machine with diagram

## What changed

Added a new **"Evolve Session State Machine"** subsection to `PRIMORDIA.md`, placed between the "Evolve Request" data-flow walkthrough and the "Deploy to exe.dev" section.

The new section contains:

1. **A Mermaid `stateDiagram-v2` diagram** showing every state (`starting`, `running-claude`, `starting-server`, `ready`, `accepted`, `rejected`, `disconnected`, `error`) and every transition arrow, annotated with the API endpoint or code function that triggers each transition.

2. **A state reference table** — one row per state with a plain-English description of what it means.

3. **A key transition triggers table** — maps each arrow in the diagram to the specific API route or function in `lib/local-evolve-sessions.ts` that fires it.

## Why

The session state machine spans multiple files (`lib/local-evolve-sessions.ts`, `app/api/evolve/local/route.ts`, `app/api/evolve/local/manage/route.ts`, `app/api/evolve/local/followup/route.ts`, `app/api/evolve/local/restart/route.ts`) and is not obvious from reading any single file. Without a diagram it is easy for future contributors (human or AI) to misunderstand which transitions are valid, which states are terminal, and which API call drives each arrow. The diagram makes the full lifecycle immediately visible at a glance and serves as the authoritative reference for anyone implementing new features that touch evolve sessions.
