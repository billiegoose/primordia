# Show accept/reject in preview instance, not parent chat

## What changed

In local development evolve mode, the **Accept / Reject** UI now appears inside
the newly-created preview instance (the child Next.js dev server) instead of in
the parent chat.

### Specific changes

- **`app/api/evolve/local/manage/route.ts`**: Added CORS headers and an `OPTIONS`
  handler so the child preview instance (running on a different `localhost` port)
  can POST to the parent's accept/reject API cross-origin.

- **`components/ChatInterface.tsx`**:
  - Added `useSearchParams` to detect when the app is running as a preview
    instance (URL contains `?sessionId=…&parentOrigin=…`).
  - When the preview is ready, the parent now appends `sessionId` and
    `parentOrigin` to the preview URL it links to, so the child can identify
    itself and call back to the parent.
  - Removed the accept/reject card from the parent chat. The parent now just
    shows the preview link and instructs the user to accept/reject from there.
  - Added an accept/reject banner inside the child preview instance that POSTs
    to `{parentOrigin}/api/evolve/local/manage` on click.

- **`app/page.tsx`**: Wrapped `<ChatInterface>` in a `<Suspense>` boundary,
  which is required by Next.js App Router when a client component uses
  `useSearchParams()`.

## Why

The previous UX required the user to keep both the parent chat tab and the
preview tab open, and accept/reject from the *parent* — even though they were
reviewing changes in the *preview*. Moving the decision UI into the preview
instance keeps the workflow in one place: open the preview, review it, then
accept or reject without switching tabs.
