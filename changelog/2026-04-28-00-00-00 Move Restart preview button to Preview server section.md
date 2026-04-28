# Move Restart Preview Button to Preview Server Section

## What changed

The "↺ Restart preview" / "▶ Start preview" button has been moved from the **Available Actions** panel header into the **Preview server** section header, where it sits alongside the server status indicator.

The `restartError` message is now displayed inside the Preview server section (below the header) instead of in the Available Actions panel.

## Why

The restart button is directly related to the preview server's state — it controls starting and restarting that server. Placing it next to the server status text makes the UI more discoverable and logically grouped: everything about the preview server (status, URL, restart control, logs) lives in one place. The Available Actions panel is reserved for higher-level session actions (follow-up, accept, reject, abort).
