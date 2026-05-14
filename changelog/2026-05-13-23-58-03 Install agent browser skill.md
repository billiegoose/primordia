# Install agent browser skill

Installed the `vercel-labs/agent-browser` skill so agents working in this repository can use the browser automation workflow through the shared skills system.

Why: browser-based QA and demonstrations can now use the documented `agent-browser` snapshot-and-ref workflow from the installed skill.

Extended agent prompts and Markdown rendering so final text output can show screenshots saved under a session worktree's `attachments/` folder with normal Markdown image syntax, such as `![Primordia](attachments/primordia-home.png)`, on its own paragraph. Attachment image links are resolved through the existing attachment API before Markdown sanitization, and Markdown images render as `<figure>` elements with captions from their alt text.

Demonstrated the installation by launching `agent-browser` against `https://example.com`, reading an accessibility snapshot, and closing the browser successfully.
