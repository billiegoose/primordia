# Enable touch drag on FloatingEvolveDialog title bar

## What changed

Added touch event support to the drag handle in `components/FloatingEvolveDialog.tsx`.

Previously, repositioning the "Propose a change" dialog by dragging its title bar only worked with a mouse (`mousedown` / `mousemove` / `mouseup`). On mobile (and other touch screens) the dialog could not be moved at all.

### Changes made

- Extracted the drag-start logic into a shared `startDrag(clientX, clientY)` helper used by both mouse and touch paths.
- Added a `handleTouchStart` handler on the title bar `<div>` that reads `e.touches[0].clientX/Y` and calls `startDrag`.
- Registered `touchmove` (with `{ passive: false }` so `e.preventDefault()` can suppress page scroll during the drag) and `touchend` listeners on `window` alongside the existing mouse listeners.
- Added the Tailwind `touch-none` class (`touch-action: none`) to the title bar so the browser does not intercept the touch gesture for scrolling or zooming.

## Why

Users on mobile couldn't reposition the floating dialog, forcing them to use the dock-to-corner buttons as the only layout control. Now they can freely drag the dialog to any position on the screen, matching the desktop experience.
