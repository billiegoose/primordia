Built the entire initial scaffold from scratch.

**Included**:
- Next.js 15 app with TypeScript and Tailwind CSS
- Two-mode chat interface: "chat" (talks to Claude) and "evolve" (opens a GitHub Issue)
- `ModeToggle` component for switching between modes
- `/api/chat` route: streams Claude responses via SSE
- `/api/evolve` route: creates a labeled GitHub Issue via the GitHub API
- `evolve.yml` GitHub Actions workflow: triggered by the `primordia-evolve` label, runs Claude Code CLI, commits changes, opens a PR, and comments on the originating issue
- `PRIMORDIA.md`: living architecture document and changelog

**Why**: This is the first version — the foundation everything else evolves from.
