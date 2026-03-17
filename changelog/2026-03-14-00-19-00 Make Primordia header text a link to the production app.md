The "Primordia" heading on deploy previews is now a clickable link that navigates to the production app.

**What changed**: `next.config.ts` now exposes `VERCEL_PROJECT_PRODUCTION_URL` to client components. `components/ChatInterface.tsx`: the "Primordia" h1 text is now wrapped in an `<a>` tag (when the production URL is available) pointing to `https://${VERCEL_PROJECT_PRODUCTION_URL}` with `target="_blank"`. Styled with `text-white no-underline hover:text-gray-300` to preserve the same appearance as the plain text.

**Why**: Gives users on deployment previews a one-click way to jump to the production app without the link looking like an obvious URL or button.
