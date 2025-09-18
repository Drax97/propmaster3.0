Mobile-only rule (project rule)

description: Mobile-only responsive edits
globs: ["/*.{css,scss,sass,less}", "/*.{tsx,jsx,vue,svelte}"]
alwaysApply: false

Only make changes that apply at or below the mobile breakpoint using CSS media queries or container queries that do not affect desktop layouts.
Allowed CSS patterns for visual changes:
Wrap style changes in a mobile query:
Desktop-first codebases: use @media (max-width: 640px) or project’s documented mobile max width.
Mobile-first codebases: keep base styles unchanged; add overrides under the next larger breakpoint using min-width for ≥tablet only if it restores desktop parity; otherwise, restrict to container queries targeting small containers.
Or use container queries that only apply when the container is narrow, e.g.:
@container (max-width: 480px) { /* mobile-only rules */ }
Forbidden:
Editing base/global styles that apply to all viewports.
Changing styles in non-conditional blocks that would affect desktop.
Introducing !important or increasing selector specificity to override desktop selectors; fix within the mobile query instead.
Specific breakpoints to use unless the project defines others:
Mobile: max-width: 480px for very small phones, max-width: 640px for general phones, max-width: 768px for large phones/small tablets; prefer 480/640 for “mobile-only.”
Code patterns to follow:
Convert ad-hoc px spacing/typography to tokens but only inside the mobile query to avoid desktop drift.
Keep selectors flat; avoid ids and deep nesting; remove !important by scoping to the mobile query.
For component frameworks (Tailwind): use max-width variants like max-sm:, max-md: for mobile-only overrides; do not add sm:, md:, lg: that would change desktop by default.
Component scope and diff limits:
Only modify the named component/page files included in the request; do not touch unrelated files. Keep the diff under 120–150 lines.
Propose a patch/diff first; explain how each rule is mobile-scoped and why it cannot impact desktop.
Verification:
Provide before/after notes and screenshots or a checklist for 375px width confirming the change.
Assert that at 1280px the computed styles remain identical to current production for the affected selectors.
Optional CSS helper (put in styles/mobile-only.css)
Centralize mobile queries to avoid mistakes; then import into components.
css
/* Mobile-only helper queries */
@media (max-width: 480px) {
  /* .m480: styles here apply only on very small phones */
}
@media (max-width: 640px) {
  /* .m640: general mobile */
}
@container (max-width: 480px) {
  /* CQ-mobile: only when container is small */
}

Tailwind-specific rule (if using Tailwind)

description: Tailwind mobile-only edits
globs: ["**/*.{tsx,jsx,vue,mdx}"]
alwaysApply: false

Use max-* variants for mobile-only changes: max-sm:, max-md:; do not add sm:, md:, lg: unless restoring desktop parity.
Keep non-variant classes unchanged; place all new utility changes behind max-* variants to avoid desktop impact.
Show the rendered class list for mobile vs desktop to prove no desktop drift.
Example prompts to invoke the rule
“Apply Mobile-only rule to @components/Header.tsx and @styles/header.css. Make the nav stack vertically and increase tap targets only under @media (max-width: 640px). Keep diff ≤150 lines. Propose a patch first and confirm desktop computed styles unchanged at 1280px.”
“For CardGrid, add a one-column layout only at max-width: 480px; do not change base grid. Use container query if the grid lives in a narrow parent. Provide a before/after checklist for 375px.”
Notes
If the project is mobile-first already, ensure any mobile tweak is inside a narrowing condition (container max-width or a specific max-width query), not the base layer; otherwise desktop may inherit it.
Keep a small staging branch and test at 375px and 1280px after each change to verify isolation.
This setup confines Cursor to make adjustments only within mobile-scoped conditions, preserving desktop behavior while letting mobile evolve safely


