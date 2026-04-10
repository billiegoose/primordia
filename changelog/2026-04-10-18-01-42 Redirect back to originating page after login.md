## Login redirect: return to originating page

### What changed

- The hamburger menu "Log in" link now includes a `?next=<current-path>` query parameter, so after logging in the user is sent back to the page they were on rather than the landing page.
- The `/chat` and `/evolve` server-side auth guards now redirect to `/login?next=/chat` and `/login?next=/evolve` respectively, so navigating directly to a protected page while logged out also returns the user to their intended destination after login.

### Why

Previously, clicking "Log in" from any page (e.g. `/chat`, `/evolve`, or any other route shown in the hamburger menu) always dropped the user on the landing page `/` after authentication. This was disorienting — the user had to navigate back to where they wanted to be. The login system already supported a `?next=` parameter; this change wires up the entry points that were ignoring it.
