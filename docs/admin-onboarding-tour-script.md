# Admin Onboarding Tour — Script for Product Tour

> This script is the source of truth for building the in-app product tour shown to the first
> user who signs up on a fresh Primordia instance (the user automatically granted the `admin` role).
>
> **Format conventions:**
> - Each step has an **anchor** — the page URL and element to highlight.
> - `[TOOLTIP: ...]` — text shown in the tour bubble.
> - `[ADVANCE: ...]` — the user action (or auto-trigger) that moves to the next step.
> - `[EVENT: ...]` — analytics event that fires at this step (for future instrumentation).
> - Steps marked `[SKIP IF: ...]` are conditional and may be omitted based on runtime state.

---

## Preface: When does this tour fire?

The tour fires **once**, immediately after the first user completes passkey registration and lands on the home page for the first time. It is not shown to subsequent users (only the first-registered admin). A `tourCompleted` flag in the user's DB record suppresses it on future logins.

---

## Act 1: Welcome

### Step 1 — Welcome overlay

- **Anchor:** `/` — full-screen modal overlay (no element highlight)
- **[TOOLTIP]:**
  > **Welcome to Primordia.**
  >
  > You're the first user on this instance, so you've been given the **admin** role automatically.
  >
  > This quick tour shows you the three things that matter most:
  > 1. How users propose changes to the app
  > 2. How you manage who can do that
  > 3. Where to find admin tools
  >
  > Takes about 2 minutes. You can skip any time.
- **[ADVANCE]:** "Start tour" button or "Skip" link
- **[EVENT]:** `tour/started/v1 {userId: "..."}`

---

## Act 2: The Home Page

### Step 2 — Landing page orientation

- **Anchor:** `/` — highlight the main hero/heading area
- **[TOOLTIP]:**
  > This is the **home page** your users see.
  >
  > It's a live preview of the app. Everything below the nav is editable — users can propose changes to any part of it.
- **[ADVANCE]:** "Next" button

### Step 3 — The hamburger menu

- **Anchor:** `/` — highlight the `☰` button in the top-right nav
- **[TOOLTIP]:**
  > This is the **main menu**. It's how users access Primordia's features.
  >
  > Click it to continue.
- **[ADVANCE]:** User clicks the hamburger (or "Next" after a 3 s delay)
- **[EVENT]:** `nav/menu-toggled/v1 {open: true}` (existing event — reuse)

### Step 4 — "Propose a change" entry point

- **Anchor:** `/` — hamburger menu open, highlight the "Propose a change" item
- **[TOOLTIP]:**
  > **"Propose a change"** is the core feature.
  >
  > Any user with the `can_evolve` role can click this to describe a change in plain English. Primordia runs an AI agent in the background, builds a live preview, and lets the user accept or reject it — no coding required.
  >
  > You'll grant that role to users in a moment.
- **[ADVANCE]:** "Next" button (do not actually open evolve form during tour)

### Step 5 — Close the menu

- **Anchor:** `/` — hamburger menu open
- **[TOOLTIP]:** _(no bubble — close the menu programmatically and continue)_
- **[ADVANCE]:** Auto-advance; close menu, navigate to `/admin`

---

## Act 3: Admin Panel

### Step 6 — Admin panel landing

- **Anchor:** `/admin` — highlight the page heading / role list area
- **[TOOLTIP]:**
  > This is the **Admin panel** — only you can see it.
  >
  > Right now it shows all registered users and their roles. You're the only user, so the list is short.
- **[ADVANCE]:** "Next" button

### Step 7 — Granting the can_evolve role

- **Anchor:** `/admin` — highlight the role grant UI (the `can_evolve` row or grant button for the current user)
- **[TOOLTIP]:**
  > To let a user propose changes, give them the **`can_evolve`** role.
  >
  > As admin, you already have it. When new users sign up, they start with no roles — you control who gets access.
  >
  > You can also revoke roles here at any time.
- **[ADVANCE]:** "Next" button

---

## Act 4: Key Admin Tools

### Step 8 — Server health

- **Anchor:** `/admin` — highlight the "Server health" link in the admin sidebar/nav
- **[TOOLTIP]:**
  > **Server health** shows disk and memory usage for this instance, and lets you clean up old preview worktrees when disk gets tight.
- **[ADVANCE]:** "Next" button

### Step 9 — Server logs

- **Anchor:** `/admin` — highlight the "Logs" link
- **[TOOLTIP]:**
  > **Server logs** streams live stdout/stderr from the production process — useful when something goes wrong and you need to see what the app is doing right now.
- **[ADVANCE]:** "Next" button

### Step 10 — Rollback

- **Anchor:** `/admin` — highlight the "Rollback" link
- **[TOOLTIP]:**
  > **Rollback** lists every previous production deployment. If a change breaks something, you can instantly revert to any prior version — zero downtime, no `git` commands needed.
- **[ADVANCE]:** "Next" button

### Step 11 — Upstream updates

- **Anchor:** `/admin` — highlight the "Updates" link
- **[TOOLTIP]:**
  > **Updates** lets you pull in new Primordia features from the upstream project. Think of it as `git pull` for the platform itself — without touching the terminal.
- **[ADVANCE]:** "Next" button

---

## Act 5: Credentials (Optional Setup)

### Step 12 — Credentials management

- **Anchor:** `/` — open hamburger menu (programmatically), highlight "Credentials" item
  - `[SKIP IF: user already has credentials stored]`
- **[TOOLTIP]:**
  > **Optional:** Paste your Claude Code `credentials.json` here to use your own Anthropic account for AI generation instead of the shared gateway.
  >
  > Credentials are encrypted (AES-256-GCM) before storage. You can skip this and use the default gateway.
- **[ADVANCE]:** "Next" button (do not open credentials modal)

---

## Act 6: Wrap-up

### Step 13 — Tour complete

- **Anchor:** `/` — full-screen modal overlay (no element highlight), menu closed
- **[TOOLTIP]:**
  > **You're all set.**
  >
  > Quick recap:
  > - Users propose changes via ☰ → "Propose a change"
  > - Grant the `can_evolve` role at `/admin` to control who can do that
  > - Admin tools (logs, rollback, updates, health) are all at `/admin`
  >
  > The tour won't show again. You can revisit these pages any time from the admin panel.
- **[ADVANCE]:** "Done" button
- **[EVENT]:** `tour/completed/v1 {userId: "...", skipped: false}`

---

## Skip / Dismiss Path

If the user clicks "Skip" at any step:
- **[EVENT]:** `tour/skipped/v1 {userId: "...", atStep: N}`
- Mark `tourCompleted = true` in DB immediately
- Dismiss overlay/tooltip, return user to current page
- No re-trigger on next login

---

## Open Questions (resolve before building)

| # | Question | Notes |
|---|---|---|
| 1 | **Tooltip library?** | Shepherd.js, Intro.js, or custom? Custom keeps dependencies minimal. |
| 2 | **Highlight style?** | Spotlight (darken surround) vs. outline ring vs. arrow pointer bubble? |
| 3 | **Steps 8–11 navigation** — do we navigate to `/admin` and highlight sidebar links, or stay on landing page and use a modal list? | Navigating feels more real; modal list is less disorienting. |
| 4 | **Step 12 skip condition** — check DB server-side on page load or fire a client-side API call? | Server-side in the tour config seems cleaner. |
| 5 | **Mobile?** — hamburger tour steps work on desktop; mobile may need a simplified flow. | Defer mobile variant until desktop is validated. |
| 6 | **Progress indicator** — numbered dots, "Step N of 13", or none? | Numbered dots feel lighter. |
| 7 | **Auto-advance timeout** — should any step auto-advance after N seconds if the user doesn't interact? | Risk: user is reading. Prefer explicit "Next" for all steps. |
