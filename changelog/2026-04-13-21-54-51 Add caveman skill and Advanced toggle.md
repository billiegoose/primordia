# Add caveman skill and Advanced toggle

## What changed

- Added `.claude/skills/caveman.md` — the [caveman skill](https://github.com/JuliusBrussee/caveman) from JuliusBrussee. This skill instructs Claude Code to respond in ultra-compressed "caveman" style, dropping articles, filler words, and pleasantries while preserving all technical accuracy. Cuts output token usage by ~75%.

- Added a **Caveman mode** checkbox to the **Advanced** dropdown in `EvolveRequestForm`. When enabled, `/caveman` is prepended to the submitted request, activating the skill for that evolve session.

## Why

Token efficiency: caveman mode dramatically reduces the verbosity of Claude Code's responses during evolve sessions without losing any technical substance. Useful for faster, cheaper iterations.
