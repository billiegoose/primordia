Added real-time CI progress display inside the Primordia chat.

**What changed**:
- New `app/api/evolve/status/route.ts` endpoint: given an issue number, fetches (a) the latest Claude bot comment body + `updated_at`, (b) any open PR whose branch matches `claude/issue-{N}-*`, and (c) a Vercel deploy preview URL from PR comments.
- `components/ChatInterface.tsx` now starts polling that endpoint every 10 s after a successful evolve submit. A dedicated "CI Progress" message is added to the chat and **updated in-place** every time Claude's comment changes on GitHub, so users see the bot's live task-list as it ticks off items. Separate one-time messages are appended when the PR is created and when the deploy preview URL becomes available. Polling stops automatically on deploy preview or after 15 minutes.

**Why**: Claude's GitHub comment is continuously edited as CI progresses; showing only a one-time 400-char snapshot missed all the live updates. The new approach mirrors the comment in real time directly in the Primordia chat.
