Fixed an accessibility violation where the `<main>` landmark was hidden from assistive technology while containing focusable elements.

**What changed**: Removed the `<main>` wrapper from `app/page.tsx` (which could receive `aria-hidden="true"` from Next.js App Router's concurrent rendering / Suspense machinery while still containing focusable elements). Moved the landmark directly onto `ChatInterface`'s root element in `components/ChatInterface.tsx`, changing it from `<div>` to `<main>` and adding `mx-auto` to preserve horizontal centering.

**Why**: The axe `aria-hidden-focus` rule fires when an element with `aria-hidden="true"` contains focusable children. The `<main>` in `page.tsx` was the flagged target. By owning the `<main>` element inside the component that controls its content, we eliminate the detached wrapper that Next.js could transiently hide from AT while form elements remained keyboard-reachable.
