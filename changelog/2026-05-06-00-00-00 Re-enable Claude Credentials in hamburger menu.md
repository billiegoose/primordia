# Re-enable Claude Credentials in hamburger menu + fix precedence

## What changed

### Re-enable the menu entry
The "Claude Credentials" menu item in the hamburger (☰) menu was previously commented out with a note saying claude-worker.ts used the Agent SDK which didn't support claude.ai subscriptions.

This change re-enables the menu item and its corresponding `<CredentialsDialog>` modal. The dialog already existed and was complete — it just wasn't reachable from the UI.

- Uncommented the `<MenuBtn>` for "Claude Credentials" in `components/HamburgerMenu.tsx`
- Added proper `trackEvent()` call to the button's onClick (consistent with the API Key button)
- Uncommented the `<CredentialsDialog>` render block below the menu

### Fix credentials-vs-API-key precedence
When both Claude credentials and an Anthropic API key were stored, the API key was silently winning in two cases:

1. **Server-side (`lib/evolve-sessions.ts` — `resolveAgentAuth`)**: For harnesses other than `claude-code` (e.g. the default `pi`), credentials are not directly usable but the function was still falling through to the `if (apiKey)` branch. Fixed: when credentials are present, they suppress the API key regardless of harness. For non-`claude-code` harnesses the gateway is used instead (credentials take precedence; the API key is never charged as a silent fallback).

2. **Client-side (`EvolveRequestForm.tsx`, `EvolveSessionView.tsx`)**: Both `encryptedApiKey` and `encryptedCredentials` were always sent together. Fixed: credentials are tried first; the API key is only sent if credentials are unavailable on this device.

## Why

Setting Claude credentials should mean "use my Claude subscription, not my API key." The old logic let the API key silently win whenever the selected harness didn't natively support credentials.json, which was confusing and contrary to user intent.
