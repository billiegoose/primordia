# Smart scroll lock on session page

## What changed

The session page (`/evolve/session/[id]`) previously scrolled to the bottom every time a new log entry was received, using smooth scrolling. This was disruptive when a user had scrolled up to read earlier output — the page would yank them back down.

The auto-scroll behavior in `EvolveSessionView.tsx` now:

- Checks whether the user is already scrolled to (or near) the bottom of the page before scrolling.
- If they are at the bottom, it scrolls instantly (`behavior: "instant"`) to keep up with new content without lag.
- If they have scrolled up, it does nothing — the user's reading position is preserved.

The threshold used is 40px, so minor pixel-rounding differences don't prevent the lock from engaging.

## Why

Smooth-scrolling on every update was jarring when intentionally scrolling up, and there was no way to stay scrolled up to read earlier log entries while new ones arrived.
