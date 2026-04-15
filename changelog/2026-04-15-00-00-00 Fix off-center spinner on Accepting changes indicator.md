# Fix off-center spinner on "Accepting changes…" indicator

## What changed

Replaced the `⟳` Unicode character used as the spinner in the "Accepting changes…" and "Fixing type errors…" status indicators inside `EvolveSessionView.tsx` with Lucide's `<Loader2>` icon (`animate-spin`), consistent with how other spinners are rendered in the codebase (e.g. `GitMirrorClient.tsx`).

## Why

The `⟳` (U+27F3) glyph is not perfectly centered in its em square across all fonts and platforms, which causes it to wobble visibly when rotated by Tailwind's `animate-spin` class. `Loader2` is an SVG drawn to a precise geometric centre, so it spins smoothly without wobble. Using Lucide also keeps the spinner style consistent with the rest of the app.

The two affected statuses were:
- `accepting` — green "Accepting changes…" row
- `fixing-types` — amber "Fixing type errors… will auto-accept when complete." row
