#!/usr/bin/env python3
# scripts/claude-auth-pty.py
#
# PTY wrapper for the claude first-run interactive authentication flow.
#
# Runs `claude` (no subcommand) in a fresh CLAUDE_CONFIG_DIR so the full
# first-run setup wizard fires:
#   1. Theme selector  (❯ menu)  → press Enter to accept default (Dark mode)
#   2. Login method    (❯ menu)  → press Enter to accept first option
#                                   (Claude subscription)
#   3. Browser opens / URL shown → capture and emit
#   4. User pastes code          → forward to claude via PTY
#   5. Poll for .credentials.json → once it exists, /exit claude
#
# Protocol (stdout, one line each):
#   URL:<url>    — OAuth URL to visit
#   DONE         — credentials written, claude exited cleanly
#   ERROR:<msg>  — fatal error; process exits non-zero
#
# Everything from the claude process is forwarded to stderr so Node.js can
# surface it in the live log panel.

import os
import sys
import time
import pexpect

env = os.environ.copy()
CRED_PATH = os.path.join(env.get("CLAUDE_CONFIG_DIR", ""), ".credentials.json")


def die(msg: str) -> None:
    sys.stderr.write(f"[pty-wrapper] FATAL: {msg}\n")
    sys.stderr.flush()
    print(f"ERROR:{msg}", flush=True)
    sys.exit(1)


def log(msg: str) -> None:
    sys.stderr.write(f"[pty-wrapper] {msg}\n")
    sys.stderr.flush()


try:
    child = pexpect.spawn(
        "claude",
        env=env,
        timeout=30,
        encoding="utf-8",
        echo=False,
        # Use a very wide terminal so the OAuth URL never wraps onto a new line.
        # The URL is ~500 chars; 10000 cols guarantees it stays on one line.
        dimensions=(50, 10000),
    )

    # Forward everything the child outputs to our stderr (Node.js log).
    child.logfile_read = sys.stderr

    # ── Step 1: Theme selector ──────────────────────────────────────────────
    log("waiting for theme menu (❯)…")
    idx = child.expect(["❯", pexpect.EOF, pexpect.TIMEOUT])
    if idx != 0:
        die(f"did not see theme menu (idx={idx})")
    log("theme menu found — pressing Enter to accept default")
    child.send("\r")

    # ── Step 2: Login method selector ──────────────────────────────────────
    log("waiting for login-method menu (❯)…")
    idx = child.expect(["❯", pexpect.EOF, pexpect.TIMEOUT])
    if idx != 0:
        die(f"did not see login-method menu (idx={idx})")
    log("login-method menu found — pressing Enter to select Claude subscription")
    child.send("\r")

    # ── Step 3: Capture the OAuth URL ──────────────────────────────────────
    # With a 10000-column terminal the URL will never wrap, so we can grab it
    # in one shot with a pattern that stops at whitespace / escape sequences.
    log("waiting for OAuth URL…")
    idx = child.expect([r"https://\S+", pexpect.EOF, pexpect.TIMEOUT])
    if idx != 0:
        die(f"did not see OAuth URL (idx={idx})")

    url = child.match.group(0).strip().rstrip(".,;)")
    log(f"URL found ({len(url)} chars)")
    # Emit to Node.js stdout.
    print(f"URL:{url}", flush=True)

    # Flush any remaining buffered output before waiting for the code prompt.
    # This clears "Paste code here if prompted >" from pexpect's internal
    # buffer so it can't cause a false match later.
    try:
        child.expect(r"Paste code", timeout=5)
        log("code-input prompt seen")
    except pexpect.TIMEOUT:
        log("code-input prompt not seen (timeout) — continuing anyway")
    except pexpect.EOF:
        die("claude exited while waiting for code-input prompt")

    # ── Step 4: Read code from Node.js, forward to claude ──────────────────
    log("waiting for authorization code on stdin…")
    code = sys.stdin.readline().strip()
    if not code:
        die("no authorization code received on stdin")
    log(f"got code ({len(code)} chars), sending to claude via PTY")
    child.sendline(code)

    # ── Step 5: Poll for .credentials.json ─────────────────────────────────
    # After receiving a valid code, claude makes an API call to exchange it for
    # tokens, then writes .credentials.json, and finally shows the REPL prompt.
    # We poll the file directly — much more reliable than matching TTY output
    # which can contain false positives (e.g. "Paste code here if prompted >").
    log("polling for .credentials.json…")
    POLL_INTERVAL = 1.0   # seconds between checks
    POLL_TIMEOUT  = 120   # seconds total

    deadline = time.time() + POLL_TIMEOUT
    cred_found = False

    while time.time() < deadline:
        # Drain any new child output (keeps the pty buffer from filling up).
        try:
            child.expect(pexpect.TIMEOUT, timeout=POLL_INTERVAL)
        except pexpect.EOF:
            log("claude exited (EOF) during polling")
            break

        if os.path.exists(CRED_PATH):
            log(f".credentials.json found ({os.path.getsize(CRED_PATH)} bytes)")
            cred_found = True
            break

    if not cred_found:
        if os.path.exists(CRED_PATH):
            cred_found = True
        else:
            die(
                f".credentials.json was not created within {POLL_TIMEOUT} s. "
                "The authorization code may have been invalid or expired."
            )

    # ── Step 6: Exit the claude REPL ───────────────────────────────────────
    log("credentials found — sending /exit to close the REPL")
    try:
        child.sendline("/exit")
        child.expect(pexpect.EOF, timeout=15)
    except Exception as e:
        log(f"note: /exit or EOF wait raised {e} (credentials already saved — ignoring)")

    print("DONE", flush=True)

except pexpect.EOF:
    if os.path.exists(CRED_PATH):
        log("EOF received but .credentials.json exists — treating as success")
        print("DONE", flush=True)
    else:
        die("claude exited unexpectedly before authentication completed")
except pexpect.TIMEOUT:
    die("unexpected timeout")
except Exception as exc:
    die(str(exc))
