# Add hamburger menu to landing page

## What changed

- Updated `components/LandingNav.tsx` to use the shared `HamburgerMenu` component (with `useSessionUser` for session awareness) instead of a custom mobile-only hamburger toggle.
- Added `<LandingNav />` to `app/page.tsx` — the landing page previously had no top navigation at all.

## Why

The landing page lacked the standard navigation header present on other pages. Adding the session-aware `HamburgerMenu` gives visitors access to the same navigation items (Go to chat, Propose a change, Admin/Shell for admins, sign in/out) from the landing page, consistent with the rest of the app.

The desktop nav retains the Changelog link and "Open app →" button; the hamburger sits alongside them and handles auth state + app navigation.
