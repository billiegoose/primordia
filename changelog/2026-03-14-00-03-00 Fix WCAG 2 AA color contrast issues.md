Improved color contrast for two elements that failed the WCAG 2 AA 4.5:1 minimum ratio for normal text.

**What changed**:
1. `<p>A self-evolving application</p>` subtitle: changed `text-gray-500` to `text-gray-400` (contrast on `bg-gray-950` improves from ~4.16:1 to ~7.9:1).
2. Evolve mode toggle button active state: changed `bg-amber-600` to `bg-amber-700` (contrast for white text improves from ~3.19:1 to ~5.0:1).

**Why**: Both elements failed the WCAG 2 AA threshold of 4.5:1 for normal (non-large) text, flagged by an accessibility audit.
