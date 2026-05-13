# Preserve install failure diagnostics

Accept/deploy failures now preserve the final `install.sh` stdout/stderr bytes in the session deploy log before tearing down the process streams. Previously, the accept pipeline destroyed those streams immediately on the shell `exit` event to avoid hanging on orphaned spinner processes; that could drop the installer ERR-trap diagnostics printed right before exit, leaving users with only a generic `install.sh exited with code 1` message.

The runner now waits briefly for the streams to close and only falls back to forced teardown if a disowned spinner keeps the pipe open. This should make failures like post-DB-copy systemd/proxy deployment errors show their actual cause in the deploy log.
