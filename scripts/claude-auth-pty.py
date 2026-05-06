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
#   5. Auth succeeds, REPL starts → send /exit
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
import re
import pexpect

env = os.environ.copy()


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
        # Large terminal so long URLs don't wrap.
        dimensions=(50, 220),
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
    # Wait for the second ❯ (login menu).  The first ❯ was the theme picker;
    # after \r the screen redraws and the next ❯ is the login method menu
    # which defaults to "Claude subscription".
    log("waiting for login-method menu (❯)…")
    idx = child.expect(["❯", pexpect.EOF, pexpect.TIMEOUT])
    if idx != 0:
        die(f"did not see login-method menu (idx={idx})")
    log("login-method menu found — pressing Enter to select Claude subscription")
    child.send("\r")

    # ── Step 3: Capture the OAuth URL ──────────────────────────────────────
    log("waiting for OAuth URL…")
    idx = child.expect([r"https://[^\s\r\n\x1b]+", pexpect.EOF, pexpect.TIMEOUT])
    if idx != 0:
        die(f"did not see OAuth URL (idx={idx})")

    url = child.match.group(0).strip().rstrip(".,;)")
    log(f"URL found: {url}")
    # Emit URL to Node.js over stdout.
    print(f"URL:{url}", flush=True)

    # ── Step 4: Read code from Node.js, forward to claude ──────────────────
    log("waiting for authorization code on stdin…")
    code = sys.stdin.readline().strip()
    if not code:
        die("no authorization code received on stdin")
    log(f"got code ({len(code)} chars), sending to claude via PTY")
    child.sendline(code)

    # ── Step 5: Wait for auth to complete ──────────────────────────────────
    # After a valid code, claude stores credentials and starts the REPL.
    # We wait for the REPL prompt (>) then exit gracefully.
    # Some claude versions show extra setup prompts after auth — handle them
    # by pressing Enter until we reach the REPL or EOF.
    log("waiting for REPL prompt or exit…")
    for _ in range(20):
        idx = child.expect(
            [
                r">\s*$",        # REPL prompt at end of line
                r"\$ $",         # alternative REPL prompt
                "❯",             # another menu (post-auth setup)
                r"\[y/n\]",      # yes/no prompt
                r"\(y/N\)",      # yes/no prompt variant
                pexpect.EOF,
                pexpect.TIMEOUT,
            ],
            timeout=30,
        )
        if idx in (0, 1):
            log("REPL prompt detected — sending /exit")
            child.sendline("/exit")
            try:
                child.expect(pexpect.EOF, timeout=10)
            except Exception:
                pass
            break
        elif idx == 2:
            log("post-auth menu prompt — pressing Enter")
            child.send("\r")
        elif idx in (3, 4):
            log("post-auth y/n prompt — pressing Enter")
            child.sendline("")
        elif idx == 5:
            log("process exited (EOF)")
            break
        elif idx == 6:
            # Timeout — check if credentials already exist
            cred_path = os.path.join(env.get("CLAUDE_CONFIG_DIR", ""), ".credentials.json")
            if os.path.exists(cred_path):
                log("timeout but .credentials.json exists — treating as success")
            else:
                die("timed out waiting for REPL prompt after sending code")
            break

    print("DONE", flush=True)

except pexpect.EOF:
    # EOF before we expected it — credentials may still have been written.
    cred_path = os.path.join(env.get("CLAUDE_CONFIG_DIR", ""), ".credentials.json")
    if os.path.exists(cred_path):
        log("EOF received but .credentials.json exists — treating as success")
        print("DONE", flush=True)
    else:
        die("claude exited unexpectedly before authentication completed")
except pexpect.TIMEOUT:
    die("unexpected timeout")
except Exception as exc:
    die(str(exc))
