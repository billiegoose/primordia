# Add fancy landing page

## What changed

- Created a new full-screen landing page at `/` (previously the root served the chat directly).
- The chat interface is now at `/chat` (`app/chat/page.tsx`), which contains the same logic that was formerly in `app/page.tsx`.
- `app/page.tsx` is now a rich marketing-style landing page with:
  - An **animated hero** section with three drifting radial gradient blobs, a shimmer gradient title ("PRIMORDIA"), a badge, tagline, and two CTA buttons ("Start chatting" and "Propose a change").
  - A **features grid** (AI Chat · Self-Evolving · Open Source) with per-card accent colours and hover lift effects.
  - A **"How it works"** four-step section with connector lines.
  - A **CTA banner** with a glowing gradient background.
  - A **footer** with navigation links.
  - A **fixed top nav** with links to Chat, Changelog, Login, and a prominent "Open app →" button.
- Added CSS keyframe animations to `app/globals.css`:
  - `blob-drift`, `blob-drift-b`, `blob-drift-c` — slow organic movement for the hero blobs.
  - `fade-up` / `fade-in` — staggered entrance animations for hero content.
  - `shimmer` — continuous gradient sweep on the main title.
  - Utility classes: `.animate-blob-{a,b,c}`, `.animate-fade-up{,-2,-3,-4}`, `.animate-fade-in`, `.text-shimmer`.
- Updated `ChatInterface.tsx`: the "Primordia" header title now links to `/` (the landing page) instead of conditionally linking to the Vercel production URL.

## Why

The app previously landed users directly in the chat with no introduction to what Primordia is or how it works. The landing page gives new visitors context, showcases the self-evolving concept, and provides clear entry points into the app — all while matching the existing dark monospace aesthetic.
