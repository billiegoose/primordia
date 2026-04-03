# Support drag-drop and paste images in evolve request textareas

## What changed

- **EvolveForm** (initial request form at `/evolve`): The form container now accepts drag-and-drop of any files. The textarea also handles paste events to capture copied/pasted images. When dragging over the form, the border highlights in amber to signal the drop target.
- **EvolveSessionView** (follow-up panels): Both follow-up panels (the "ready" action panel and the "error" recovery panel) now accept drag-and-drop of files. Their textareas handle paste events for images. The "ready" panel's border and background highlight amber on drag hover; the error panel's textarea border highlights amber.

In all cases, dropped or pasted files are deduplicated and added to the existing `attachedFiles` / `followupFiles` lists, which are already wired through to the API (copied into `worktree/attachments/`).

## Why

Users often have screenshots or log files open and want to attach them by dragging or pasting rather than using the file picker. This is a common UX expectation for chat/form interfaces that accept file attachments.
