# Move API Key and Claude.ai Subscription to User Settings page

## What changed

- Removed "API Key" and "Claude.ai Subscription" from the hamburger menu dropdown.
- Added a new **Settings** link in the hamburger menu (indigo accent, gear icon) for all logged-in users.
- Created `/settings` — API Key tab: lets users set or clear their Anthropic API key, with the same AES-256-GCM browser-side encryption as before.
- Created `/settings/claude-ai` — Claude.ai Subscription tab: OAuth sign-in flow and manual credentials.json paste, same encryption model as before.
- Both settings pages follow the same layout as the Admin page: `PageNavBar` header, sidebar subnav (`SettingsSubNav`), and content area.
- The `SettingsSubNav` sidebar supports desktop (vertical link list) and mobile (select dropdown) like `AdminSubNav`.

## Why

The hamburger menu was getting crowded. Placing credentials settings on a dedicated page gives each setting more room for description and UI, keeps the menu focused on navigation, and matches the Admin page's pattern for structured sub-sections.
