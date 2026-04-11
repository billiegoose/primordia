# Fix landing page logo not loading in preview servers

## What changed

Replaced `next/image` `<Image>` components in `app/page.tsx` and `components/LandingNav.tsx` with plain `<img>` tags that use `withBasePath()` for the `src` attribute.

## Why

Preview servers run the app at a sub-path (e.g. `/primordia`) via `NEXT_BASE_PATH`. While Next.js's `<Image>` component is documented as basePath-aware, it was not correctly prefixing the logo path in this environment — causing the browser to request `/primordia-logo.png` instead of `/{basePath}/primordia-logo.png`, resulting in a 404.

Switching to `<img src={withBasePath("/primordia-logo.png")}>` follows the existing codebase pattern (see `LoginClient.tsx`) and explicitly applies the base path prefix, making the image load correctly in both production (empty basePath) and preview (non-empty basePath) environments.
