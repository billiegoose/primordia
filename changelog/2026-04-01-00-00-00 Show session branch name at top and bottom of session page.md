# Show session branch name at top and bottom of session page

## What changed

Added a prominent branch name display to `EvolveSessionView`:

- **Top of page** — a `Branch: <name>` row appears between the page header and the "Your request" card, using an amber monospace badge styled to stand out.
- **Bottom of page** — the same `Branch: <name>` label appears in the footer section above the navigation links, in a slightly dimmer style so it doesn't compete with the primary footer actions.

## Why

When multiple evolve sessions are open in different tabs (or when navigating back to an old session), it was hard to tell at a glance which branch the session was tracking. The branch name now appears at both ends of the page so it's always visible without scrolling.
