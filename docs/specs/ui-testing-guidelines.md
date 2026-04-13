# UI Testing Guidelines

## Purpose

This document turns StudyPuck's current UI-related requirements into an actionable testing baseline for frontend work. It is intentionally narrower than the broader testing strategy and focuses on **UI components, UI behavior, and responsive/accessibility verification**.

It consolidates expectations from:

- `docs/ux/non-functional-requirements.md`
- `docs/ux/storyboards/*.md`
- `docs/specs/testing-strategy.md`
- `docs/specs/browser-testing-workflow.md`
- `docs/specs/css-architecture-analysis.md`

## Testing Philosophy for UI Work

StudyPuck uses a layered UI testing approach:

1. **Unit/store tests (Vitest)** for deterministic UI logic that does not require the browser
2. **Component tests (Vitest + Svelte Testing Library)** for component rendering, keyboard behavior, state transitions, and DOM semantics
3. **Browser interaction / E2E tests (Playwright)** for critical multi-step journeys, responsive shell behavior, and platform-level browser interactions

The goal is not to test every pixel. The goal is to test the **contracts** that matter:

- can the user complete the interaction?
- does the component render safely in SSR and hydration paths?
- does behavior match the storyboard?
- does the component meet the project's accessibility and responsive baselines?

## What Must Be Tested for New UI Components

Every new significant UI component should add tests for the parts of behavior it owns.

### 1. Render Safety

Every shell-level or route-level component must be safe in:

- **SSR render**
- **client render / hydration-adjacent component mount**

At minimum, test that the component does not touch browser-only globals such as `window`, `document`, `localStorage`, or `matchMedia` during server rendering.

### 2. Keyboard Behavior

From the authoritative NFRs and storyboards:

- every action must be completable without a mouse
- focus order must follow logical reading order
- focus indicators must remain visible
- keyboard shortcuts may supplement, never replace, standard controls

For interactive components, test the owned keyboard flows explicitly. Examples:

- `Tab` / `Shift+Tab`
- `Enter`
- `Escape`
- arrow-key navigation
- slash-command focus shortcuts where applicable

### 3. Accessibility Contracts

Test the semantics the component owns, including where applicable:

- landmark structure
- button names / `aria-label`
- live-region behavior for dynamic updates
- focus visibility and focus return behavior
- text alternatives and decorative suppression

StudyPuck's minimum standard is **WCAG 2.1 AA**.

### 4. Responsive Behavior

If the component changes structure across breakpoints, test the behavior contract for those modes.

Examples:

- mobile sheet vs desktop pane
- hidden/revealed controls by breakpoint
- no horizontal overflow above the minimum supported width of **375px**

Use component tests for structural differences when possible; use browser tests when viewport/layout behavior is the thing being validated.

### 5. Motion / State Communication

If the component animates or changes visible state, test that:

- the state change is still understandable without motion
- `prefers-reduced-motion` is respected where relevant
- meaning is not conveyed by color alone

### 6. Storyboard Contract

When a component has an authoritative storyboard, treat the storyboard as the primary source for:

- states
- transitions
- commands / controls
- placement
- interaction behavior

Tests should target those behaviors directly, not a looser approximation.

## Suggested Test Split

### Vitest Unit / Store Tests

Use for:

- route-to-context mapping
- command filtering
- derived UI state
- pure formatting / helper logic

These should be fast and deterministic.

### Vitest Component Tests

Use for:

- rendering with realistic props
- keyboard interaction
- focus management
- visible state changes
- regression coverage for SSR-safe rendering

These are the default baseline tests for new UI work.

### Playwright Tests

Use for:

- authenticated shell flows
- responsive shell behavior across real viewports
- multi-step user journeys
- browser-only behaviors that are hard to trust in jsdom

Playwright should cover the high-value end-to-end contracts, not replace smaller component tests.

## Minimum Baseline for a New UI Issue

For a new significant UI issue, add at least:

1. **one render-safety or regression test**
2. **one interaction test** for the primary user behavior
3. **one context-specific logic test** if the component behavior depends on route, state, or filtering logic

## StudyPuck-Specific Baselines

### Command / Shell UI

For shell-level components such as navigation, drawers, sheets, command bars, and overlays, baseline coverage should include:

- SSR safety
- keyboard escape/close behavior
- focusable controls have accessible names
- breakpoint-specific rendering model
- command/filter logic if applicable

### Forms and Input Components

Baseline coverage should include:

- label or accessible name presence
- keyboard submission behavior
- validation message visibility
- disabled / waiting state handling

### Async UI

Baseline coverage should include:

- waiting state
- success/error state
- live-region or equivalent announcement behavior where content updates dynamically

## What This Guideline Does Not Require

This guideline does **not** require:

- screenshot testing for every component
- exhaustive visual diff coverage for all layout work
- testing implementation details instead of user-visible behavior
- duplicating the same assertion at unit, component, and E2E levels

## Current Tooling Direction

Per the accepted testing strategy:

- **Vitest** is the baseline for unit/integration/component coverage
- **Playwright** is the intended tool for browser interaction, component, and E2E coverage

In the current implementation phase, prefer adding **Vitest component tests first** when they can cover the behavior quickly and reliably. Add Playwright coverage for flows that truly need real browser verification.
