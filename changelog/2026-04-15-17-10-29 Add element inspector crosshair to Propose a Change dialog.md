# Add element inspector crosshair to "Propose a Change" dialog

## What changed

Added an element-picker (crosshair) tool to the floating "Propose a change" dialog so users can quickly select any visible element on the current page and automatically insert its context into their evolve request.

### New file: `components/PageElementInspector.tsx`

A full-screen transparent portal overlay that activates on top of the page when the crosshair button is clicked.

- **Mouse:** move cursor to highlight elements; click to select.
- **Touch:** drag to highlight; hold 600 ms to select.
- **Keyboard:** `Esc` to cancel.

Uses `document.elementsFromPoint()` to resolve the element under the pointer, filtering out the inspector overlay itself and the calling dialog (passed as `skipElement`).  Walks the React fibre tree to detect the nearest named React component (same approach as `WebPreviewPanel`'s iframe inspector).

When an element is selected, an `onSelect(PageElementInfo)` callback fires with:
- `component` — nearest React component display-name (or tag name fallback)
- `selector` — compact CSS path (up to 5 ancestors, skipping Tailwind utility classes)
- `html` — `outerHTML` truncated to 600 characters
- `text` — visible `innerText` truncated to 200 characters

### Modified: `components/EvolveRequestForm.tsx`

- Converted the component to use `React.forwardRef` so callers can hold an imperative handle.
- Added `EvolveRequestFormHandle` interface with `insertElementContext(text: string)`.
  - Prepends the element-context block to the textarea (with a blank-line separator if text already exists) and moves the cursor to just after the block so the user can immediately type their request.

### Modified: `components/FloatingEvolveDialog.tsx`

- Added a **Crosshair** button in the title bar (between the dock buttons and the close button).
- When clicked, the form body is replaced by a brief hint panel and `PageElementInspector` is rendered as a portal.  The dialog's title bar text changes to "Click an element on the page…".
- On element selection: formats a compact context block (`[Inspected element: <ComponentName> at \`selector\`]` + HTML preview) and calls `formRef.current.insertElementContext(text)` to insert it into the textarea before restoring the form.
- Escape / Cancel button deactivates the inspector without inserting anything.

## Why

Users often want to reference a specific UI element in their change request ("make this button blue", "move this nav item to the left"). Previously they had to manually describe the element in words. The crosshair tool lets them click the exact element, and the resulting context snippet gives Claude Code precise component + selector + HTML information to act on without ambiguity.
