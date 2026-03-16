Fixed the `landmark-one-main` axe rule ("Ensures the document has a main landmark").

**What changed**: No additional code change required beyond the `aria-hidden-focus` fix in the same session. The `landmark-one-main` axe rule fires when there is no *accessible* `<main>` landmark — i.e. when the only `<main>` element is an ancestor with `aria-hidden="true"`. Moving `<main>` into `ChatInterface.tsx` (see previous entry) resolves both violations simultaneously.

**Why**: Covered by the `aria-hidden-focus` fix — same root cause, same fix.
