# Fix lint errors and build failures

## What

Resolved all `bun run lint` errors and `bun run build` failures across four files.

### `app/login/approve/page.tsx`

- **Build error (Suspense):** `useSearchParams()` must be called inside a Suspense boundary during static generation. Extracted the page body into `ApprovePageInner` and wrapped the default export `ApprovePage` with `<Suspense>`.
- **Lint error (setState in effect):** `setPhase("error")` and `setErrorMsg(...)` were called synchronously inside `useEffect` when `tokenId` was absent. Fixed by initialising both pieces of state lazily from `tokenId` at render time (using the `useState` initialiser function), so no `setState` call is needed in the effect.

### `app/login/page.tsx`

- **Build error (Suspense):** Same `useSearchParams()` / Suspense requirement. Extracted the page body into `LoginPageInner` and wrapped the default export `LoginPage` with `<Suspense>`.

### `components/EvolveForm.tsx`

- **Warning (`no-unused-vars`):** `localEvolveSession` (the state value) was declared but never read. Changed the destructuring to `const [, setLocalEvolveSession]` to discard the unused variable cleanly.

### `lib/local-evolve-sessions.ts`

- **Warning (`no-unused-vars`):** `PORT` was intentionally destructured to omit it from `envWithoutPort` but the variable itself goes unused. Added `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above the destructuring to document the intent.

### `components/ChatInterface.tsx`

- **Warning (ref in cleanup):** The cleanup closure read `pollingIntervalRef.current` directly, which the `react-hooks/exhaustive-deps` rule flags. Since we intentionally need the *current* value at unmount time (not the value at mount time, which is always `null`), added a targeted `eslint-disable-next-line` comment with an explanation.

## Why

`bun run lint` was exiting with code 1 (blocking CI) due to the `setState-in-effect` error. `bun run build` failed at static-page generation because `useSearchParams()` requires a Suspense boundary in Next.js App Router when the page is statically rendered.
