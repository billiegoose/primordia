# Add max-width and truncation to attachment chips

## What changed

The `AttachmentChip` component in `EvolveSessionView.tsx` now caps its width at `200px` and truncates long filenames with an ellipsis (`…`). A `title` attribute is also added so hovering the chip reveals the full filename.

## Why

Long filenames (e.g. `my-very-long-screenshot-2026-04-15.png`) were causing the chip to stretch as wide as the filename, breaking the layout of the attachment row. This matches the existing truncation behaviour already present in the `EvolveRequestForm.tsx` chips (`max-w-[140px]` / `max-w-[180px]`).
