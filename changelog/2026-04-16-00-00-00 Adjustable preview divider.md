# Adjustable Preview Divider

## What changed

Added a draggable divider between the Session panel and the Web Preview sidebar on the `/evolve/session/[id]` page.

- A 4px drag handle (`<div>`) is rendered between `<main>` and `<aside>` when the preview sidebar is visible (xl breakpoint, session in `ready` state with a live preview URL).
- The handle is styled `bg-gray-800` at rest, transitions to `bg-blue-500` on hover and `bg-blue-400` while active, with `cursor-col-resize`.
- Mouse-down on the handle captures `mousemove`/`mouseup` on `window`, computes the new left-panel width clamped to a minimum of 280 px on each side, and stores it in `mainWidthPx` state (default 560 px).
- The session `<main>` element switches from the fixed Tailwind class `xl:max-w-[560px] xl:flex-shrink-0` to an inline `style={{ width: mainWidthPx }}` when the sidebar is active, so the width tracks the drag in real time.
- A `containerRef` on the outer wrapper provides the total available width for clamping the drag range.
- Dragging sets `document.body.style.cursor = 'col-resize'` and `userSelect = 'none'` to prevent text selection jank; both are restored on mouse-up.

## Why

The fixed 560 px session panel width was cramped on wide monitors and left the preview iframe with little room on narrower displays. Making it freely resizable lets users tune the split for their screen and content.
