# Fix Pick tool showing SegmentViewNode on landing page

## What changed

### `components/PageElementInspector.tsx`

- Added `INTERNAL_COMPONENT_NAMES` blocklist — a `Set` of Next.js App Router
  and React framework internals (e.g. `SegmentViewNode`, `InnerLayoutRouter`,
  `OuterLayoutRouter`, `AppRouter`, `HotReloader`, `ReactDevOverlay`, …) that
  are now skipped when walking the React fiber tree. Previously the very first
  named component encountered was always `SegmentViewNode`, which is the
  Next.js internal that wraps all server-rendered segments on the client.

- Added `getDataComponentLabel(el)` — walks DOM ancestors looking for a
  `data-component` attribute. This is checked *before* the fiber walk, so
  server-rendered sections that have no meaningful client-side fiber name still
  produce a readable label.

- Updated `getReactComponentName`, `getReactComponentChain`, and the
  `generateFiberTreeText` root-finding loop to use both the blocklist and the
  new DOM-attribute lookup.

### `app/page.tsx`

Added `data-component` attributes to every major section and repeating card
on the landing page so the Pick tool shows a meaningful name regardless of
whether the element is inside a client component:

| Element | `data-component` value |
|---|---|
| Hero `<section>` | `HeroSection` |
| Features `<section>` | `FeaturesSection` |
| Individual feature `<div>` | `FeatureCard` |
| How-it-works `<section>` | `HowItWorksSection` |
| Individual step `<div>` | `HowItWorksStep` |
| CTA banner `<section>` | `CTABannerSection` |
| Footer `<footer>` | `LandingFooter` |

## Why

The landing page (`app/page.tsx`) is a Next.js server component. On the
client, its rendered DOM is owned by the `SegmentViewNode` fiber (a Next.js
App Router internal). The Pick tool's fiber-walking code found that as the
first uppercase-named component and returned it for every single element on
the page, making the tool useless there.

The two-pronged fix (blocklist + `data-component` attributes) ensures that:
1. Framework internals are never surfaced as component names.
2. Server-rendered sections get explicit, meaningful labels regardless of
   what the client fiber tree looks like.
