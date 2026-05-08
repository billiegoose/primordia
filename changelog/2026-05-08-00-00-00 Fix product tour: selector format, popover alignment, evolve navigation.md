# Fix product tour: selector format, popover alignment, evolve navigation

Three fixes to the product tour implemented in the previous session.

## What changed

### Selector format (`components/ProductTour.tsx`)
Onborda passes `step.selector` directly to `document.querySelector()`. The original selectors were bare IDs (e.g. `"onborda-hero"`) which match custom HTML tags, not `id` attributes. Fixed by prepending `#` to all selectors (e.g. `"#onborda-hero"`).

### Popover alignment (`components/ProductTour.tsx`)
Steps that target `#onborda-hamburger` (top-right corner of the page) used `side: "bottom-left"`, causing the popover to hang off the left edge of the screen. Changed to `side: "bottom-right"` so the card opens to the left of the hamburger button and stays on screen.

### Evolve page navigation (`components/ProductTour.tsx`, `components/EvolveRequestForm.tsx`)
Steps 7–10 (the evolve walkthrough) previously pointed at the hamburger button for lack of real targets. Fixed:
- Step 7 now adds `nextRoute: "/evolve"` so clicking Next navigates to the evolve page.
- Steps 8–10 now target real elements on `/evolve`:
  - `#onborda-evolve-textarea` — the request input field
  - `#onborda-evolve-attach` — the "Attach files" button
  - `#onborda-evolve-submit` — the "Propose Change" submit button
- Step 10 adds `nextRoute: "/"` to return home before the wrap-up step.
- Added `id` attributes to those three elements in `EvolveRequestForm.tsx`.

### useEffect stability fix (`components/ProductTour.tsx`)
`startOnborda` from `useOnborda()` gets a new reference on every render, causing the trigger effect to re-run and race. Fixed using a ref to hold the latest `startOnborda`, with the effect only depending on `[pathname]`. Added a 300 ms delay before calling `startOnborda` to let Onborda finish its own mount cycle.
