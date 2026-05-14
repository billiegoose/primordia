# Install agent browser skill

Installed the `vercel-labs/agent-browser` skill so agents working in this repository can use the browser automation workflow through the shared skills system.

Why: browser-based QA and demonstrations can now use the documented `agent-browser` snapshot-and-ref workflow from the installed skill.

Extended session NDJSON handling so log events can reference screenshots or other images saved under a session worktree's `attachments/` folder. Tool calls, text output, and log lines that mention image paths such as `attachments/primordia-home.png` now emit an inline `attachment_image` event, and the evolve session UI renders those images directly from the existing attachment API.

Demonstrated the installation by launching `agent-browser` against `https://example.com`, reading an accessibility snapshot, and closing the browser successfully.
