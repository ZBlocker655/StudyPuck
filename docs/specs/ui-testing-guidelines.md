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

#### Reliability-first authoring rules

- drive the UI through explicit visible states instead of hover-revealed affordances whenever possible
- prefer role/label/name-based locators and give repeated controls distinct accessible names before falling back to positional targeting
- wait for specific readiness signals such as dialog visibility, `aria-expanded`, checked state, URL transitions, and live success/error feedback
- avoid `force`, `hover`, `first`, `last`, and `nth` unless the interaction model itself is what the test is proving
- if a browser assertion depends on incidental copy, layout, or timing noise, move that coverage to a component/store/server test instead

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

## Playwright CI Hardening Patterns

The following patterns were learned through repeated headless-CI failures and are now standing rules. Each addresses a specific way that tests pass locally (headed Chrome on Windows) but fail in headless Linux CI.

### 1. Hover-gated action buttons — use `{ force: true }`, not `.hover()`

StudyPuck uses `@media (hover: hover) and (pointer: fine)` CSS to hide card-row action buttons by default:

```css
.card-row__actions {
  opacity: 0;
  pointer-events: none;
}
.card-row:hover .card-row__actions { opacity: 1; pointer-events: auto; }
```

Headless CI Chromium matches this media query. The buttons are invisible and unclickable until the container is hovered. The intuitive fix (`.hover()` then `.click()`) is unreliable because Playwright's internal mouse movement during `.click()` can briefly leave the container, deactivating `:hover` and re-enabling `pointer-events: none` before the click lands.

**Use `{ force: true }` directly** — it bypasses `pointer-events` entirely without any timing dependency:

```ts
// ✅ Correct: force bypasses pointer-events:none
await menuButton.click({ force: true });
await actionButton.click({ force: true });
await checkbox.check({ force: true });

// ✅ Inside toPass (safe — action is idempotent once card leaves the list):
await expect(async () => {
  await snoozeButton.click({ force: true });
  await expect(page.locator('article[aria-label="..., snoozed"]')).toBeVisible();
}).toPass({ timeout: 10000 });

// ❌ Unreliable: hover then click races with pointer-events:none reactivation
await cardRow.hover();
await actionButton.click();
```

The components with hover-gated actions: `TranslationDrillsHome.svelte` (`.card-row__actions`) and `CardListRow.svelte`.

### 2. Svelte 5 reactive radio buttons — use `evaluate()`, not `label.click()`

Radio inputs with one-way Svelte 5 bindings (`checked={expr}` without `bind:checked`) can have their DOM state reset by Svelte's reactive system after a Playwright interaction but before form serialization. `label.click()` and `check({ force: true })` both fail this way.

```ts
// ✅ Correct: set checked state directly in the browser context
const radio = card.locator('input[name="someGroup"][value="targetValue"]');
await radio.evaluate((el) => {
  const input = el as HTMLInputElement;
  const form = input.closest('form')!;
  form.querySelectorAll<HTMLInputElement>(`input[name="${input.name}"]`)
    .forEach((r) => (r.checked = false));
  input.checked = true;
  // Do NOT dispatch 'change' — that can re-trigger Svelte reactive effects
});
await expect(radio).toBeChecked({ timeout: 2000 });
await card.getByRole('button', { name: 'Save', exact: true }).click();

// ❌ Unreliable: label.click() or check({ force: true }) on Svelte 5 reactive radios
```

### 3. Never wrap toggle-state actions in `toPass()`

`toPass()` retries the entire wrapped function on assertion failure. If the action is a **toggle** (menu open/close, checkbox, accordion), each retry flips the state back. The assertion then alternates and never consistently passes.

```ts
// ✅ Correct: single click + extended timeout on assertion
await menuButton.click();
await expect(menuButton).toHaveAttribute('aria-expanded', 'true', { timeout: 10000 });

// ✅ toPass is safe for idempotent actions (snooze, dismiss) where
//    the action only runs once (card leaves the list on success):
await expect(async () => {
  await cardRow.hover();
  await snoozeButton.click();
  await expect(snoozedCard).toBeVisible();
}).toPass({ timeout: 10000 });

// ❌ Wrong: toPass wrapping a toggle flips state on every retry
await expect(async () => {
  await menuButton.click();           // retry 1: opens; retry 2: closes; …
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
}).toPass({ timeout: 10000 });
```

### 4. Use `.click()` on buttons — never `focus() + press('Enter')`

Headless Linux Chromium does not reliably dispatch keyboard events when focus hasn't fully settled. `focus() + press('Enter')` passes locally but fails intermittently in CI.

```ts
// ✅ Correct
await button.click();

// ❌ Unreliable in headless CI
await button.focus();
await button.press('Enter');
```

`press('Enter')` is reliable only on **text inputs that are already the active element** (e.g., a command bar that the test just typed into).

### 5. Guard dynamic UI with explicit visibility waits

Elements revealed by a button click may not be interactable in the same tick. Always add an `expect(...).toBeVisible({ timeout: N })` guard before interacting with newly revealed UI.

```ts
// ✅ Correct
await selectCardsButton.click();
await expect(firstCheckbox).toBeVisible({ timeout: 10000 });
await firstCheckbox.check();

// ❌ Race condition — checkbox may not exist yet
await selectCardsButton.click();
await firstCheckbox.check();
```

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
