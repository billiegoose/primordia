Simplified the deploy preview banner to hide PR details from the visible notice while keeping them in the system context for Claude.

**What changed**: `components/ChatInterface.tsx`: the visible system message shown at the top of the chat on deploy previews now always displays only "⚠️ This is a deploy preview — a work-in-progress build, not the production app." The full PR/issue context string is still sent to Claude via `systemContext` so the assistant remains aware of it.

**Why**: The PR title and branch name in the banner were noisy and not useful to end users; the brief warning is sufficient.
