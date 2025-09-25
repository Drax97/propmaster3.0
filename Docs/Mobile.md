 
Title: Responsive Refactor Plan (Non‑Destructive, Mobile‑First, Incremental)
Objective
•	Make the UI mobile‑first and fully responsive while preserving current desktop visuals and behavior.
•	Execute changes in tiny, reversible steps with tests and visual checks at each step.
•	Establish a design system (tokens, spacing/typography scale, colors) and a clear media/container query policy before component rewrites.
Global Guardrails
•	Scope: Only modify files explicitly listed in each phase step.
•	Diff limits: Keep each PR/change set under ~150 lines where possible.
•	Stability: Preserve desktop visual parity; if a desktop change is unavoidable, call it out and justify.
•	Specificity: Avoid !important; keep selector specificity ≤ 0-1-3; prefer classes over ids.
•	Dependencies: Do not add new libraries without prior proposal and approval.
•	Style strategy: Mobile‑first CSS; expand with min‑width media queries or container queries where appropriate.
•	Explanations: For every change, include rationale and before/after notes.
•	Tests: Add/maintain viewport-specific tests (375px mobile, 1280px desktop) for modified components/pages.
Phase 0 — Audit Only (No Code Changes)
Deliverables
•	Design tokens draft: inferred palette, typography (families/sizes/weights in rem), spacing scale, radii, shadows, z-index layers.
•	Breakpoint and container query policy: list current breakpoints; propose target breakpoints and when to use container queries.
•	Inventory: frameworks/utilities currently used (e.g., Tailwind/Bootstrap/custom CSS/modules/CSS-in-JS).
•	Migration plan: prioritized list of components/pages for incremental refactor with estimated diff sizes; map of ad-hoc values to tokens.
•	Verification plan: snapshot/visual test approach, critical pages/components to lock down first.
Prompt (paste in editor)
“Read the repository and produce a ‘Responsive Refactor Plan’ with:
1.	Inventory of current styling approaches and utilities.
2.	Proposed design tokens: colors, typography scale in rem, spacing scale, radii, shadows, z-index.
3.	Current breakpoints vs proposed mobile‑first breakpoints and a container query policy (when/where to use).
4.	A prioritized migration plan by component/page with tiny PRs; include file paths and estimated diff size.
5.	A verification plan: viewport tests at 375px and 1280px, plus a list of critical components for visual snapshots.
Do not modify any code. Output as a checklist with file paths. Keep it concise and actionable.”
Acceptance Criteria
•	No code changes.
•	Clear token set and mapping strategy from existing values.
•	Clear, staged plan with per-component scope and tests listed.
Phase 1 — Introduce Tokens and Utilities (No Visual Change)
Goal
Add tokens and minimal utilities so future refactors can use consistent scales without changing current visuals.
Tasks
•	Create tokens file(s): e.g., styles/tokens.css (CSS variables) or theme config if using Tailwind/CSS-in-JS.
•	Document mapping: list current raw px/hex values and their token equivalents.
•	Wire tokens so existing styles can read them without altering layout/appearance.
•	Do not refactor components yet.
Prompt
“Implement design tokens with zero visual change:
•	Add a tokens file (e.g., styles/tokens.css) with color, spacing, typography (rem), radii, shadows, z-index variables.
•	Wire into the build so tokens are available globally.
•	Produce a mapping table from existing hard-coded values to tokens.
•	Do not refactor any component styles yet. Do not change unrelated files.
•	Keep diff under 150 lines. Explain each addition and show how no visuals change.”
Acceptance Criteria
•	Tokens present and importable.
•	No diffs in visual snapshots.
•	Mapping table included in PR description or docs.
Phase 2 — Breakpoint & Query Policy (Docs + Scaffolding Only)
Goal
Document and scaffold responsive rules before any component rewrites.
Tasks
•	Propose target breakpoints (e.g., 480, 640, 768, 1024, 1280) as min-width media queries.
•	Define when to prefer container queries (component-based layouts inside variable-width parents).
•	Add helper mixins/utilities if applicable.
•	Only documentation/config; no component layout rewrites.
Prompt
“Add a mobile‑first responsive policy:
•	Define and document min‑width breakpoints and a container query policy.
•	Add optional helpers/mixins/utilities, but do not refactor components yet.
•	Keep changes limited to docs/config/helpers. Explain when to use media vs container queries.
•	Keep diff small; no visual change.”
Acceptance Criteria
•	Readme/docs updated with policy and examples.
•	Helpers available but unused by components.
Phase 3 — Lock Invariants with Tests
Goal
Prevent regressions on key pages/components.
Tasks
•	Add Playwright/Cypress E2E tests for two critical pages and two components at 375px and 1280px.
•	Add Jest/Vitest snapshots for critical components if applicable.
•	Assertions: layout regions visible, nav collapse behavior, key spacing/typography at mobile/desktop.
Prompt
“Create viewport tests:
•	Add E2E tests for Header/Nav and Home page at 375px and 1280px.
•	Add component tests/snapshots where applicable.
•	Assertions: mobile layout integrity (stacked/hidden/visible elements), desktop layout unchanged.
•	Keep scope to these targets only. Provide command to run tests and example screenshots if supported.”
Acceptance Criteria
•	Tests pass pre-refactor.
•	Failing tests indicate real regressions during later phases.
Phase 4+ — Incremental Component Refactors (One at a Time)
Pattern per Component
•	Choose one component/page (e.g., Header).
•	Refactor to mobile‑first using tokens and the established policy.
•	Maintain desktop parity; if change needed, explain and update tests.
•	Replace raw px/hex with tokens gradually; reduce nesting; remove !important; ensure accessible tap targets.
Component Prompt Template
“Refactor [ComponentName] for mobile‑first responsiveness with the established tokens and breakpoint policy:
•	Keep existing public API and class names where possible.
•	Use tokens for spacing, typography, colors; convert px to rem for scalable typography and spacing.
•	Introduce min‑width queries or container queries as documented.
•	Limit selectors to classes; avoid ids and !important; keep specificity low.
•	Preserve desktop appearance; if any desktop change is unavoidable, list and justify.
•	Update/add tests for 375px and 1280px viewports.
•	Only touch files for [ComponentName]; keep diff under ~150 lines; provide before/after summary.”
Acceptance Criteria
•	Tests pass at both viewports.
•	No unintended changes outside the component.
•	Tokens used consistently; code simpler and less nested.
Page Prompt Template
“Refactor [PageName] layout to mobile‑first:
•	Establish a single-column flow at small screens; progressively enhance at breakpoints.
•	Use container queries when sections live in variable-width containers.
•	Replace ad-hoc spacing/colors with tokens.
•	Update page-level tests at 375px and 1280px.
•	Keep diff scoped to page and its local styles; provide explanation.”
Ongoing Techniques and Conventions
•	Typography and spacing use rem; root font-size governs scale.
•	Flat selectors; avoid deep nesting; component styles co-located or modular.
•	No paradigm mixing: if using Tailwind, standardize on its tokens/config; if using custom CSS, keep it consistent.
•	Eliminate !important by fixing specificity or structure.
•	Replace ids with classes for styling.
•	Establish tap target sizes and spacing for touch (44px min heights where appropriate).
•	Keep a CHANGELOG entry per refactor with prompt used, changes made, tests added, and any trade-offs.
Deep Research/Audit Prompt (Optional Pre-Phase)
“You are performing a non-destructive audit to plan a safe responsive refactor:
•	Build a file map of styling entry points (global.css, theme, component modules, CSS-in-JS files).
•	Detect conflicting paradigms (utility classes vs component CSS) and propose a path to standardize.
•	Identify global styles that could cause cascade risk; flag them instead of modifying.
•	Produce risk notes and a mitigation plan per area.
No code changes. Output a concise report with file paths.”
Verification and Rollout
•	Visual check: capture screenshots at 375px and 1280px for each modified component/page.
•	Tests must pass before merging.
•	Merge small PRs frequently; avoid batching multiple components.
•	If a regression is detected, revert the PR and split the change into smaller steps.
One-Message Boilerplate to Start the Process
Paste this message to kick off Phase 0:
“Goal: Make the app mobile‑first and responsive without breaking desktop. Phase 0 only.
•	Read the repo and produce: tokens draft, breakpoint/container policy, inventory of styling approaches, prioritized migration plan with small PRs, and a verification plan with viewport tests.
•	Do not change code.
Constraints: Only produce a checklist with file paths and estimated diff sizes; keep it concise and actionable.”
One-Message Boilerplate for a Component Refactor
“Phase N: Refactor [ComponentName] only.
•	Mobile‑first using tokens; min‑width media or container queries per policy.
•	Keep desktop visuals unchanged; if unavoidable differences, list and justify.
•	No unrelated file edits; no new deps.
•	Keep diff under 150 lines; explain changes; update/add 375px and 1280px tests.”
What To Avoid
•	Repo-wide “make everything responsive” changes.
•	Global CSS rewrites without tokens/policy.
•	Mixing frameworks or introducing a new CSS system mid-refactor.
•	High-specificity selectors and !important.
•	Large diffs that combine multiple components/pages.
Quick Checklist (per PR)
•	Scope limited to one component/page.
•	Tokens used; px→rem where appropriate.
•	No !important; low specificity.
•	Tests added/updated at 375px and 1280px.
•	Visual snapshots taken pre/post.
•	Desktop parity preserved or justified.
This document can live at docs/responsive-refactor.md and be referenced in each PR.

⁂
 
1.	https://docs.cursor.com/guides/advanced/working-with-documentation 
2.	https://www.reddit.com/r/CursorAI/comments/1ht3ld5/any_cursor_ai_website_or_template_for_project/ 
3.	https://cursor.com 
4.	https://docs.cursor.com/en/guides/tutorials/web-development 
5.	https://beingtechnicalwriter.com/cursor-ai-api-doc/ 
6.	https://www.theserverside.com/blog/Coffee-Talk-Java-News-Stories-and-Opinions/AI-Convert-Figma-Designs-to-Code-React-HTML-JavaScript-CSS-Cursor-Free-Plugin 
7.	https://www.youtube.com/watch?v=3289vhOUdKA 
8.	https://github.com/PatrickJS/awesome-cursorrules 
9.	https://docs.cursor.com 
