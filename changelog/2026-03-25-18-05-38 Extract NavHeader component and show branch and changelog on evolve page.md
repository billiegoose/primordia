# Extract NavHeader component and show branch and changelog on evolve page

## What changed

- Created a new `components/NavHeader.tsx` shared component that renders the "Primordia" title (linked to `/`), the optional Vercel PR link (on preview deployments), the current git branch name, and a "Changelog" link.
- Updated `ChatInterface.tsx` to use `<NavHeader>` instead of the inline title/subtitle block.
- Updated `EvolveForm.tsx` to accept a `branch` prop and use `<NavHeader branch={branch} subtitle="Propose a change" />`, replacing the plain `<h1>` + `<p>` that had no branch or changelog info.
- Updated `app/evolve/page.tsx` to read the current git branch at request time (same logic as `app/chat/page.tsx`) and pass it as a prop to `EvolveForm`.

## Why

The `/chat` header already showed the branch name and a Changelog link, giving useful context about which version of the app you're looking at. The `/evolve` header was missing both, so visitors on a preview branch couldn't tell which branch they were on or navigate to the changelog. Extracting the logic into a shared `NavHeader` component removes the duplication and ensures both pages stay consistent going forward.
