# Fix hardcoded "Claude" reference in session follow-up form

## What changed

The follow-up request form on the evolve session page showed a hardcoded tooltip/disabled label reading **"Waiting for Claude to finish…"** regardless of which AI harness or model was actually in use for the session.

This label now dynamically reflects the actual agent being used:

- If the session used a known harness + model (e.g. Pi / Claude Sonnet 4), the label reads **"Waiting for Pi (Claude Sonnet 4) to finish…"**
- If only the harness is known, it reads **"Waiting for Pi to finish…"**
- If no harness info is available (e.g. a very old session record), it falls back to **"Waiting for the agent to finish…"**

## Why

Primordia is model-agnostic and supports multiple AI harnesses. Hardcoding "Claude" in user-visible UI text was inaccurate and inconsistent with the rest of the session view, which already derived agent labels dynamically from the harness/model stored in session events.
