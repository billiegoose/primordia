# Add branches link to hamburger menu

Added a "Branches" link to the hamburger menu's standard navigation items (`buildStandardMenuItems` in `HamburgerMenu.tsx`).

The link uses the `GitBranch` icon from lucide-react and navigates to `/branches`. Like the other standard items, it is automatically hidden when the user is already on the `/branches` page.
