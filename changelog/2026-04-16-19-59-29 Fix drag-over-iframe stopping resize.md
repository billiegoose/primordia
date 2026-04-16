# Fix drag-over-iframe stopping resize

## What changed

When dragging the resize handle between the Session panel and the Web Preview quickly, the drag would stop if the cursor moved over the iframe. Iframes are separate browsing contexts and swallow mouse events, so `mousemove` events never reached the `window` listener that drives the resize.

**Fix:** on `mousedown`, a transparent full-screen `div` (z-index 9999) is appended to `document.body`. This overlay sits on top of the iframe and intercepts all mouse events for the duration of the drag. On `mouseup`, the overlay is removed.

## Why

Iframes create a nested browsing context. Mouse events that land inside an iframe are dispatched within that context and don't bubble to the parent `window`, so fast drags that cross into the iframe silently lost tracking.
