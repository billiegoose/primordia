# Limit AcceptRejectBar postMessage to direct child windows

## What changed

`components/AcceptRejectBar.tsx` — tightened the `window.addEventListener("message", ...)` handler to only act on messages sent by a **direct child preview window**.

### Before

The only guard was the message type string:

```ts
if (event.data?.type === "primordia:preview-accepted") {
  fetch("/api/evolve/local/restart", { method: "POST" }).catch(() => {});
}
```

Any page open in the same browser session that happened to know the type string could trigger a dev-server restart.

### After

An additional check uses `event.source.opener`:

```ts
if (event.data?.type !== "primordia:preview-accepted") return;
const source = event.source as Window | null;
if (!source || source.opener !== window) return;
fetch("/api/evolve/local/restart", { method: "POST" }).catch(() => {});
```

## Why this works

The child preview window always posts its message via `window.opener?.postMessage(...)`, so the parent receiving the message can verify `event.source.opener === window` — i.e. "the window that sent this message was opened by me". This is the standard way to verify you are talking to your own child window.

`window.opener` is part of the cross-origin `WindowProxy` interface and is readable even across origins, so this works on any domain (including `primordia.exe.xyz`) without maintaining an origin allow-list.

It also works correctly for nested previews: each level in the chain only accepts from its own direct child.
