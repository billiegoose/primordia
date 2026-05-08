# Implement product tour with Onborda

Added `docs/admin-onboarding-tour-script.md` as the source-of-truth script, then implemented the full in-app tour using the [Onborda](https://github.com/uixmat/onborda) library (Next.js onboarding wizard with Framer Motion animations).

## What was built

### Tour script (`docs/admin-onboarding-tour-script.md`)
- 22 steps across 6 acts: welcome, home page orientation, credentials setup, evolve flow walkthrough, admin tools (admin-only), and wrap-up.
- Each step specifies anchor URL + element to highlight, tooltip copy (admin/non-admin variants), user action that advances, and analytics event.

### In-app tour implementation
- **`components/ProductTour.tsx`** — `OnbordaProvider` + `Onborda` wrapper placed in the root layout. Defines two named tours (`"main"` for `can_evolve` users, `"admin"` for admins with extra steps). Inner `TourTrigger` component fetches session on homepage mount and calls `startOnborda()` when the user has `canEvolve && !tourCompleted`. Cross-page navigation handled via Onborda's `nextRoute` step prop (settings → claude-ai settings → home → admin → home).
- **`components/TourCard.tsx`** — Custom card component matching Primordia's dark monospace aesthetic. Shows step icon, title, body, step counter, Back/Next/Done buttons, and an X skip button. Calls the tour-complete API on finish or skip.
- **`app/layout.tsx`** — Wraps `{children}` with `<ProductTour>` so the Onborda provider persists across page navigations.

### Backend
- **`app/api/auth/session/route.ts`** — Now returns `tourCompleted: boolean` by reading the `tour:completed` user preference.
- **`app/api/auth/tour-complete/route.ts`** — New `POST` endpoint; sets `tour:completed = "true"` in `user_preferences` and fires `tour/completed/v1` or `tour/skipped/v1` analytics events.
- **`lib/hooks.ts`** — `SessionUser` type gains optional `tourCompleted` field.

### Element IDs (Onborda targets)
Added `id` attributes to the exact DOM elements each tour step highlights:
- `onborda-hero` — hero `<h1>` on the landing page (`LandingSections.tsx`)
- `onborda-hamburger` — hamburger toggle button (`HamburgerMenu.tsx`)
- `onborda-priority-badge` — credential cascade badge on `/settings` (`ApiKeySettingsClient.tsx`)
- `onborda-openrouter-card` — OpenRouter card on `/settings`
- `onborda-claude-signin` — "Sign in with Claude.ai" button on `/settings/claude-ai`
- `onborda-admin-heading` — Evolve permissions section on `/admin`
- `onborda-admin-evolve` — User permissions table on `/admin`
- `onborda-admin-nav` — Admin sidebar nav (`AdminSubNav.tsx`)

### Config
- **`tailwind.config.ts`** — Added `./node_modules/onborda/dist/**/*.{js,ts,jsx,tsx}` to content paths so Tailwind scans Onborda's classes.
- `onborda@1.2.5` and `framer-motion@12.38.0` added to dependencies.

## Why

We want to orient new users as soon as they gain evolve access — covering credentials first so they understand their AI options before proposing a change. The tour fires once per user (suppressed by the `tour:completed` DB preference after completion or skip).
