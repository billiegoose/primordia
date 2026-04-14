# Pi Agent: Skills and CLAUDE.md Support

## What changed

Two gaps were identified and fixed in the pi coding agent integration (`scripts/pi-worker.ts`):

### 1. Skills from `.claude/skills/` now loaded

Pi's `DefaultResourceLoader` only auto-discovers skills from:
- `~/.pi/agent/skills/`
- `~/.agents/skills/`
- `.pi/skills/`
- `.agents/skills/` walking up from `cwd`

The project stores skills in `.claude/skills/` (the Claude Code convention — `using-exe-dev` and `caveman`). Pi does **not** discover `.claude/skills/` automatically; the skills docs explicitly say to configure this manually via settings.

**Fix:** Added `.pi/settings.json` at the project root with:

```json
{
  "skills": ["../.claude/skills"]
}
```

Paths in `.pi/settings.json` resolve relative to `.pi/`, so `../.claude/skills` correctly points to `.claude/skills/` in the repo root. Since every git worktree is a full checkout of the repo, this file is available in all worktrees and `DefaultResourceLoader` with `cwd: worktreePath` will discover it automatically.

### 2. CLAUDE.md injected as a context file

Pi's `DefaultResourceLoader` auto-discovers `AGENTS.md` context files walking up from `cwd`, but does **not** read Claude Code's `CLAUDE.md` convention. The project's `CLAUDE.md` is the primary source of truth for architecture, features, and design principles.

**Fix:** Added `agentsFilesOverride` to the `DefaultResourceLoader` in `pi-worker.ts`. It reads `CLAUDE.md` from the worktree root and injects it as the first context file, followed by any `AGENTS.md` files pi discovers naturally. CLAUDE.md is placed first so it serves as the primary project context.

## Why

Without these fixes, pi-based evolve sessions ran without:
- Awareness of project conventions, architecture, and design principles (CLAUDE.md)
- The `using-exe-dev` skill (guidance for working with exe.dev infrastructure)
- The `caveman` skill (token-efficient communication mode)

Claude Code-based sessions already received all of this via its native support for `.claude/` conventions. This change brings pi-based sessions to parity.
