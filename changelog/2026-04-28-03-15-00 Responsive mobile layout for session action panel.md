# Responsive mobile layout for session action panel

## What changed

Two targeted fixes to the evolve session view's "Available Actions" panel on small screens:

### 1. Three-tab action row — grid layout on mobile

The Follow-up / Accept / Reject tab buttons are now laid out using CSS Grid instead of a plain `flex` container:

- **Mobile (`<sm`):** buttons stack vertically, each full-width, with horizontal dividers between them
- **Desktop (`sm+`):** restored to the original 3-column horizontal layout

Previously the three equal `flex-1` columns on a narrow screen forced each button's text ("Follow-up Changes", "Apply Updates First", "Reject Changes") to wrap across 2–3 lines, producing a cramped, hard-to-tap UI.

### 2. Submit button overflow — flex-wrap with full-width fallback

The action row below the textarea in `EvolveRequestForm` now uses `flex-wrap` so that when the submit button's label is long (e.g. "Waiting for Pi (Claude Sonnet 4.6) to finish…"), the button wraps onto its own second row rather than overflowing the container:

- **Mobile:** submit button goes full-width (`w-full`) on the second row when it wraps, keeping everything readable and tappable
- **Desktop (`sm+`):** restored to `w-auto` — all items stay on one row as before
- Compact mode (floating dialog) is unaffected; it keeps its existing single-row layout

## Why

A user screenshot showed both issues clearly on a ~400px-wide Android screen: the action tabs had text running to 3 lines each and the submit button was visually cut off by the viewport edge.
