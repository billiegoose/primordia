# Add navbar to /evolve page

## What changed

### New `NavHeader` component (`components/NavHeader.tsx`)

Extracted a shared `<NavHeader>` component that renders the "Primordia" title (linked to `/`), the optional Vercel PR preview link, the current git branch name, and a "Changelog" link. Both `ChatInterface.tsx` and `EvolveForm.tsx` now use `<NavHeader>` instead of their previous inline title/subtitle blocks.

### Hamburger menu on `/evolve` (`components/EvolveForm.tsx`)

Replaced the simple "← Back to chat" link in the `/evolve` header with the same hamburger (☰) dropdown menu used on the `/chat` page. The menu contains:

- **Auth section** — shows the signed-in username with a Sign Out button, or a Log In link if not authenticated.
- **Go to chat** — navigates to `/chat`.
- **Sync with GitHub** — opens the `GitSyncDialog` modal to pull + push the current branch.

### `GitSyncDialog` extracted (`components/GitSyncDialog.tsx`)

Moved `GitSyncDialog` out of `components/ChatInterface.tsx` into its own shared file so it can be imported by both `ChatInterface` and `EvolveForm`.

### `/evolve` page now receives branch prop (`app/evolve/page.tsx`)

Updated the page to read the current git branch at request time (same logic as `app/chat/page.tsx`) and pass it as a prop to `EvolveForm`.

## Why

The `/evolve` page previously had no way to access auth controls, the GitHub sync feature, or see the current branch name — users had to navigate back to `/chat` for these actions. Making the header consistent across both pages improves usability and removes duplication.
