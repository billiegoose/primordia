# Refresh credential transport key

Fixed stale-tab credential submission failures after accepting a worktree to production.

The browser credentials and local AES key were not changing. The failure came from the server-side RSA transport key used to wrap credentials for each request: it is generated per server process, so a blue/green production swap could leave already-open tabs encrypting to a key that the new server could not decrypt.

The client now fetches the current public transport key for every credential transmission instead of reusing a module-level cached key. That keeps the RSA key ephemeral per server process while allowing already-open tabs to submit follow-up requests, new evolve requests, and accept-time credential payloads after a deploy without reloading.