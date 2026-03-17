# Inject PRIMORDIA.md into chat system prompt for self-awareness

## What changed

`app/api/chat/route.ts` now reads `PRIMORDIA.md` and the list of `changelog/` entry filenames from disk at server startup and injects them into the Claude system prompt.

A helper function `loadPrimordiaContext()` reads both sources gracefully (skipping silently if either is missing) and concatenates them. The result is prepended to the system prompt so that the assistant always has accurate, up-to-date knowledge of the app's architecture, tech stack, data flows, environment variables, and change history.

## Why

In chat mode, Primordia was prone to hallucination when users asked about its own architecture — it had no grounding information about itself. By injecting the live architecture document at request time, the assistant can answer accurately about how the app works, what technologies it uses, and what has been changed, without inventing details.
