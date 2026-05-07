# Add admin onboarding tour script

Added `docs/admin-onboarding-tour-script.md` — a step-by-step script for a product tour aimed at the first user who signs up on a fresh Primordia instance (the user automatically assigned the `admin` role).

## What's in the script

- 13 steps across 6 acts: welcome overlay, home page orientation, hamburger menu, admin panel (role management), key admin tools (health, logs, rollback, updates), credentials setup, and a wrap-up summary.
- Each step specifies: anchor URL + element to highlight, tooltip copy, the user action that advances the tour, and the analytics event to fire.
- Conditional steps (e.g. credentials step skipped if already configured).
- Skip/dismiss path with DB flag to suppress re-trigger on future logins.
- Open questions section listing unresolved design decisions (tooltip library, highlight style, mobile handling, etc.) to resolve before building.

## Why

We want to orient new admins without requiring them to read docs. The script can be tweaked before any UI work begins.
