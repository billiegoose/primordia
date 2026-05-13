# Add out-of-the-box features section to landing page

## What changed

Added a new **"Everything you need, out of the box"** section to the landing page, inserted between the existing "What is Primordia?" intro section and the "How it works" steps section.

The new section contains six feature tiles arranged in a responsive grid (1 → 2 → 3 columns):

- **Passkey Authentication** — WebAuthn passkeys, no passwords or third-party auth service
- **Role-Based Access** — Admin and evolver roles, auto-granted to first user
- **Admin Dashboard** — Live logs, disk/memory health, deep rollbacks, git mirror, upstream updates
- **Full Git History** — Every change is a real git commit; one-click rollback to any prior production slot
- **Live AI Previews** — Browser preview of every AI-generated change before it goes live
- **One-Command Deploy** — Two shell commands to provision a VM and install Primordia end-to-end

Also fixed a minor layout bug in the existing "What is Primordia?" section where the grid declared `sm:grid-cols-3` for only two cards; corrected to `sm:grid-cols-2`.

## Why

The landing page previously highlighted Primordia's self-evolving concept and how-it-works steps, but gave no concrete picture of what capabilities you actually get when you deploy it. New visitors had no way to evaluate Primordia as a foundation for their own app. The new section directly addresses that gap by listing the production-grade features that ship by default.
