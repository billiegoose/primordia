# Remove "active slot" wording from deploy banner

## What changed

In `components/EvolveSessionView.tsx`, the subtitle shown in the green "Deployed to production" banner after a successful blue/green deploy was changed from:

> "The branch was deployed to production as the new active slot."

to:

> "The branch was deployed to production."

## Why

The phrase "active slot" is implementation jargon (blue/green slot swapping) that leaks infrastructure details to end users. The simpler phrasing is clearer and more user-friendly.
