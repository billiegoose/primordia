# Add Codex harness

Added OpenAI Codex CLI as a first-class evolve harness. Codex can now be selected in presets and evolve forms with exe.dev gateway billing, ChatGPT subscription OAuth credentials, or a user-supplied OpenAI API key.

The new worker configures Codex for the selected billing source, streams Codex JSONL progress into Primordia session logs, supports follow-up resumes, and uses the exe.dev OpenAI-compatible gateway provider documented by exe.dev.
