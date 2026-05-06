# Re-enable Claude Credentials in hamburger menu + fix auth token routing

## What changed

### Re-enable the menu entry
The "Claude Credentials" menu item in the hamburger (☰) menu was previously commented out with a note saying claude-worker.ts used the Agent SDK which didn't support claude.ai subscriptions.

This change re-enables the menu item and its corresponding `<CredentialsDialog>` modal. The dialog already existed and was complete — it just wasn't reachable from the UI.

- Uncommented the `<MenuBtn>` for "Claude Credentials" in `components/HamburgerMenu.tsx`
- Added proper `trackEvent()` call to the button's onClick (consistent with the API Key button)
- Uncommented the `<CredentialsDialog>` render block below the menu

### Fix: only ever send one auth token per request

Previously both `encryptedApiKey` and `encryptedCredentials` could be sent together on the same evolve request. The client now only ever sends one:

- `encryptedCredentials` — when the selected harness is `claude-code` (the only harness that supports credentials.json)
- `encryptedApiKey` — for all other harnesses (e.g. `pi`)

This applies to both initial requests (`EvolveRequestForm.tsx`) and follow-up requests (`EvolveSessionView.tsx`).

The server-side `resolveAgentAuth()` still handles both defensively (credentials win for `claude-code`, API key wins for everything else), but it should now only ever receive one at a time.

## Why

Claude credentials (credentials.json / OAuth) are only meaningful for the `claude-code` harness — `pi` and other harnesses talk to the Anthropic API directly and can't use them. Sending both at once was unnecessary and confusing. The form now routes the right token to the right harness.
