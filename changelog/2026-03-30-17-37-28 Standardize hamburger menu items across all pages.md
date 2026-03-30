# Standardize hamburger menu items across all pages

## What changed

Every page in the app now shows the same four hamburger menu items in the same order:

1. **Sign out** (built-in, always present at top)
2. **Go to chat** → `/chat`
3. **Propose a change** → `/evolve`
4. **Sync with GitHub** → opens the GitSyncDialog

### Files modified

- `components/ChatInterface.tsx` — Added missing **"Go to chat"** item (was only showing "Propose a change" + "Sync with GitHub").
- `components/EvolveForm.tsx` — Added missing **"Propose a change"** item (was only showing "Go to chat" + "Sync with GitHub").
- `components/EvolveSessionView.tsx` — Replaced the context-specific **"New request"** item with **"Propose a change"** and reordered to match the standard set (was showing "New request" + "Go to chat" + "Sync with GitHub").
- `components/PageNavBar.tsx` — Already correct; no change needed.

## Why

The session page (`EvolveSessionView`) had a bespoke "New request" item and a different ordering, while the chat and evolve-form pages each omitted one of the standard navigation targets. This inconsistency made the UI feel unpredictable — users had to remember which menu items were available on which page. Standardizing to a single, consistent set makes navigation predictable regardless of where you are in the app.
