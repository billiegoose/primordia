# PRIMORDIA.md

> **This file is the living brain of Primordia.**
> Every time Claude Code runs — whether triggered by the evolve pipeline or manually — it should:
> 1. **Read this file first** to understand the current state of the app.
> 2. **Update this file last** — add a Changelog entry describing what changed and why.
>
> This file is the source of truth for architecture, features, and history.

---

## What Is Primordia?

Primordia is a self-modifying web application. Users interact with an AI chat interface and can switch into "evolve mode" to describe changes they want made to the app itself. Those requests are automatically turned into GitHub Pull Requests via a CI pipeline powered by Claude Code CLI.

The core idea: **the app becomes whatever its users need it to be**, with no coding or git knowledge required from users.

---

## Current Architecture

### Tech Stack
| Layer | Technology | Why |
|---|---|---|
| Frontend framework | Next.js 15 (App Router) | AI models write Next.js well; great Vercel integration |
| Styling | Tailwind CSS | AI models write Tailwind well; no CSS files to manage |
| Language | TypeScript | Catches mistakes; Claude Code understands it well |
| AI API | Anthropic SDK (`@anthropic-ai/sdk`) | Streaming chat via `claude-sonnet-4-6` |
| Hosting | Vercel | Zero-config deploys; automatic preview URLs per PR |
| Version control | GitHub | Issues → Actions → PRs pipeline |
| CI/AI code gen | GitHub Actions + Claude Code CLI | Runs `claude --print --no-interactive` against issues |

### File Map

```
primordia/
├── PRIMORDIA.md                   ← You are here. Read me first, update me last.
├── .env.example                   ← Copy to .env.local, fill in secrets
├── .gitignore
├── next.config.ts                 ← Minimal Next.js config
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
│
├── app/                           ← Next.js App Router
│   ├── layout.tsx                 ← Root layout (font, metadata, body styling)
│   ├── page.tsx                   ← Entry point — renders <ChatInterface>
│   ├── globals.css                ← Tailwind base imports only
│   └── api/
│       ├── chat/
│       │   └── route.ts           ← Streams Claude responses via SSE
│       ├── deploy-context/
│       │   └── route.ts           ← Returns PR + linked-issue info for preview deploys
│       └── evolve/
│           └── route.ts           ← Creates a labeled GitHub Issue
│
├── components/
│   ├── ChatInterface.tsx          ← Main chat UI; handles chat + evolve modes
│   └── ModeToggle.tsx             ← Toggle button: "Chat" vs "Evolve"
│
└── .github/
    └── workflows/
        └── evolve.yml             ← CI pipeline: issue → Claude Code → PR
```

### Data Flow

#### Normal Chat
```
User types message
  → POST /api/chat
  → Anthropic API (claude-sonnet-4-6, streaming)
  → SSE stream back to browser
  → Message appended to chat
```

#### Evolve Request
```
User types change request in evolve mode
  → POST /api/evolve
  → GitHub API: create Issue labeled "primordia-evolve"
  → GitHub Actions: evolve.yml triggered
      → git checkout -b evolve/issue-{N}
      → claude --print --no-interactive -p "{issue body + PRIMORDIA.md}"
      → git commit && git push
      → gh pr create
      → gh issue comment (PR link)
  → Vercel: preview deployment auto-created for the PR
  → Repo owner reviews + merges PR
  → Vercel: production deployment triggered
```

---

## Environment Variables

These must be set in:
- **Local development**: `.env.local` (copy from `.env.example`)
- **Vercel**: Project Settings → Environment Variables
- **GitHub Actions**: Repository Settings → Secrets and Variables → Actions

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Powers the chat interface and Claude Code CLI in CI |
| `GITHUB_TOKEN` | Yes (app) | Allows the app to create GitHub Issues |
| `GITHUB_REPO` | Yes (app) | The `owner/repo` the app lives in |
| `EVOLVE_LABEL` | No (default: `primordia-evolve`) | Issue label that triggers the workflow |
| `GH_PAT` | Yes (CI) | GitHub PAT for the Actions workflow to open PRs |

---

## Setup Checklist (One-Time)

1. **Fork or clone** this repo to your GitHub account.
2. **Connect to Vercel**: import the repo at vercel.com/new.
3. **Set Vercel environment variables**: `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `GITHUB_REPO`.
4. **Create the GitHub Issue label**: go to `github.com/{owner}/{repo}/labels`, create `primordia-evolve` (color: `#f0a500`).
5. **Add GitHub Actions secrets**: `ANTHROPIC_API_KEY` and `GH_PAT` in repo Settings → Secrets.
6. **Deploy**: push to `main` or trigger a Vercel deploy. The app is live.

---

## Design Principles for Claude Code

When implementing changes, follow these principles:

1. **Read PRIMORDIA.md first.** Understand the current architecture before making changes.
2. **Minimal changes.** Only modify what is necessary for the user's request.
3. **No clever magic.** Write code that is easy for another AI to read and modify later.
4. **Minimal dependencies.** Every new dependency is a future maintenance burden. Avoid them unless essential.
5. **TypeScript everywhere.** Explicit types make the codebase more navigable for AI models.
6. **Tailwind for styling.** Do not add CSS files or CSS-in-JS libraries.
7. **App Router conventions.** Follow Next.js App Router patterns: `page.tsx`, `layout.tsx`, `route.ts`.
8. **Update PRIMORDIA.md last.** Add a Changelog entry after every set of changes.

---

## Current Features

| Feature | Status | Notes |
|---|---|---|
| Chat interface (streaming) | ✅ Live | Streams from `claude-sonnet-4-6` via SSE |
| Evolve mode | ✅ Live | Creates labeled GitHub Issue |
| CI evolve pipeline | ✅ Live | `evolve.yml` → Claude Code → PR |
| Vercel deploy pipeline | ✅ Live (setup required) | Preview per PR, prod on merge to main |
| Dark theme | ✅ Live | Default dark UI with Tailwind |

---

## Stretch Goals (Not Implemented)

These were noted at project inception but are explicitly out of scope for the MVP:

- **Fork flow**: one-click fork to user's own GitHub + Vercel
- **Voting**: upvote proposed evolve requests before they get built
- **Rollback**: "go back to before X was added" via natural language
- **Multi-tenant**: each user gets their own Primordia instance

---

## Changelog

### 2026-03-14 — Comment on PR instead of issue when a PR already exists

**What changed**:
- `app/api/evolve/route.ts`: the `comment` action now checks for an open PR whose branch matches `claude/issue-{N}-*`. If found, the `@claude` follow-up comment is posted to the PR instead of the issue. Returns `prNumber`/`prUrl` in the response so the frontend can surface the right link.
- `app/api/evolve/status/route.ts`: when a matching PR is found and its comments are fetched (for the Vercel preview URL), also check for Claude's progress comment there — it will now live on the PR when the follow-up was posted to the PR.
- `components/ChatInterface.tsx`: confirmation message now says "comment on PR #N" vs "comment on Issue #N" depending on where the comment landed.

**Why**: When a PR already exists for an evolve issue, the active work is happening on that PR's branch. Commenting directly on the PR is clearer for the reviewer and means Claude Code's response appears right where the code changes are.

---

### 2026-03-14 — Search for existing evolve issues + live CI progress for follow-ups

---

### 2026-03-14 — Deploy previews are now self-aware (show PR + issue context)

**What changed**:
- New `app/api/deploy-context/route.ts`: server-side endpoint that reads `VERCEL_GIT_PULL_REQUEST_ID`, fetches the PR from GitHub, extracts the linked issue (via `Closes #N` in the PR body), and returns a formatted context string.
- `app/api/chat/route.ts`: now accepts an optional `systemContext` field in the POST body and appends it to the hardcoded system prompt, so Claude is aware of the WIP context.
- `components/ChatInterface.tsx`: on mount, if `VERCEL_ENV === "preview"`, calls `/api/deploy-context` and (a) prepends a visible amber system-message notice to the chat, (b) passes the context as `systemContext` in every `/api/chat` call. System messages render as a distinct amber notice bar rather than a chat bubble.

**Why**: Deploy previews are live but unmerged works-in-progress. Loading the PR and linked issue into the chat makes the assistant aware it's running on a preview build, and gives users immediate visibility into which PR/issue the preview corresponds to.

---

### 2026-03-14 — Check for related open issues before creating a new evolve request

**What changed**:
- `/api/evolve/route.ts` now supports three actions: `search` (find open evolve issues via GitHub Search API), `comment` (add a `@claude` follow-up comment to an existing issue), and `create` (existing behavior, now explicit). The `comment` action returns `issueNumber` so the frontend can start CI polling.
- `components/ChatInterface.tsx`: on evolve submit, the app searches for open evolve issues first. If any are found, a **decision card** lists them with an "Add comment" button per issue and a "Create new issue instead" fallback. After posting a comment on an existing issue, the same live CI-progress polling starts (identical to the new-issue path), so users see Claude's task-list updating in real time. `EvolveResult` type updated to support both `"created"` and `"commented"` outcomes.

**Why**: Avoid unnecessary issue/branch proliferation; follow-up requests should continue on the existing branch. The live comment display was already present for new issues — now it works for follow-ups too.

---

### 2026-03-14 — Fix Vercel env var name for PR ID

**What changed**: Renamed `VERCEL_GIT_PULL_REQUEST_NUMBER` → `VERCEL_GIT_PULL_REQUEST_ID` in `next.config.ts` and `ChatInterface.tsx`.

**Why**: `VERCEL_GIT_PULL_REQUEST_NUMBER` is not a real Vercel system env var. The correct name is `VERCEL_GIT_PULL_REQUEST_ID`. Without this fix the PR badge in the header would never render on preview deployments.

---

### 2026-03-14 — Show PR link in header for deploy previews

**What changed**: On Vercel preview deployments, the top header now displays a linked `#N` badge right after "Primordia", pointing to the GitHub PR for that preview. Production deployments are unaffected.

**How**: `next.config.ts` now exposes four Vercel system env vars (`VERCEL_ENV`, `VERCEL_GIT_PULL_REQUEST_NUMBER`, `VERCEL_GIT_REPO_OWNER`, `VERCEL_GIT_REPO_SLUG`) via the `env` block, which Next.js inlines at build time so client components can read them. `ChatInterface.tsx` conditionally renders the link when `VERCEL_ENV === "preview"` and a PR number is present.

**Why**: Makes it easy to identify which PR each preview tab corresponds to.

---

### 2026-03-14 — Live CI progress in Primordia chat

**What changed**:
- New `app/api/evolve/status/route.ts` endpoint: given an issue number, fetches (a) the latest Claude bot comment body + `updated_at`, (b) any open PR whose branch matches `claude/issue-{N}-*`, and (c) a Vercel deploy preview URL from PR comments.
- `components/ChatInterface.tsx` now starts polling that endpoint every 10 s after a successful evolve submit. A dedicated "CI Progress" message is added to the chat and **updated in-place** every time Claude's comment changes on GitHub, so users see the bot's live task-list as it ticks off items. Separate one-time messages are appended when the PR is created and when the deploy preview URL becomes available. Polling stops automatically on deploy preview or after 15 minutes.

**Why**: Claude's github comment is continuously edited as CI progresses; showing only a one-time 400-char snapshot missed all the live updates. The new approach mirrors the comment in real time directly in the Primordia chat.

---

### 2026-03-14 — Fix WCAG 2 AA color contrast issues

**What changed**: Improved color contrast for two elements that failed the WCAG 2 AA 4.5:1 minimum ratio for normal text:
1. `<p>A self-evolving application</p>` subtitle: changed `text-gray-500` to `text-gray-400` (contrast on `bg-gray-950` improves from ~4.16:1 to ~7.9:1).
2. Evolve mode toggle button active state: changed `bg-amber-600` to `bg-amber-700` (contrast for white text improves from ~3.19:1 to ~5.0:1).

**Why**: Both elements failed the WCAG 2 AA threshold of 4.5:1 for normal (non-large) text, flagged by an accessibility audit.

---

### 2026-03-14 — Fix bold text duplication in SimpleMarkdown

**What changed**: Fixed a bug in `SimpleMarkdown` where bold text (`**text**`) was rendered twice — once as a `<strong>` element and once as a plain `<span>`.

**Why**: `String.split()` with a regex that has capturing groups includes those captured sub-groups in the result array. The split regex had inner capturing groups (e.g., `([^*]+)` inside `\*\*([^*]+)\*\*`), so for each bold token the array contained both the full `**text**` match and the inner `text` capture. The fix converts all inner groups to non-capturing (`(?:...)`) so only the full token appears in the split result.

---

### 2026-03-14 — Initial Scaffold

**What changed**: Built the entire initial scaffold from scratch.

**Included**:
- Next.js 15 app with TypeScript and Tailwind CSS
- Two-mode chat interface: "chat" (talks to Claude) and "evolve" (opens a GitHub Issue)
- `ModeToggle` component for switching between modes
- `/api/chat` route: streams Claude responses via SSE
- `/api/evolve` route: creates a labeled GitHub Issue via the GitHub API
- `evolve.yml` GitHub Actions workflow: triggered by the `primordia-evolve` label, runs Claude Code CLI, commits changes, opens a PR, and comments on the originating issue
- `PRIMORDIA.md` (this file): living architecture document and changelog

**Why**: This is the first version — the foundation everything else evolves from.
