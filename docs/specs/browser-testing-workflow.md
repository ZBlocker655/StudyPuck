# Browser Testing Workflow

## Purpose

This document covers the concrete Playwright workflow for StudyPuck's browser tests: how the web app is started, how auth is handled, how test data is isolated, and which commands to run locally.

It complements:

- `testing-strategy.md` for overall testing philosophy
- `ui-testing-guidelines.md` for UI-specific expectations

## Current Web Browser Test Strategy

### 1. Browser tests run against the real SvelteKit app

- the Playwright suite exercises the real app routes, loaders, redirects, actions, and shell components
- the browser runner applies migrations before starting the app
- the app is started locally on the Playwright port for the duration of the suite

### 2. Auth uses an e2e-only session harness

- browser tests do **not** log into live Auth0
- Playwright installs authenticated test sessions through the repo's e2e session harness
- the harness is gated so it only works in e2e mode on local or remote-dev hosts

### 3. Browser-test data uses an ephemeral Neon branch

- `pnpm test:e2e:secure` creates a fresh Neon branch from `development`
- the suite points `TEST_DATABASE_URL` at that branch
- shared helpers reset tables and seed only the data each scenario needs
- by default the branch is always deleted during cleanup

### 4. There is an explicit debug escape hatch

If you need to inspect the database after a failure:

```bash
PRESERVE_TEST_DB_ON_FAILURE=1 pnpm test:e2e:secure
```

This is for intentional debugging only. It is not the normal workflow.

### 5. Stale branch cleanup happens before the run

The helper removes stale `test-e2e-web-*` branches before creating a new browser-test branch so leftover test branches do not accumulate.

## Local Workflow

### Install browsers if needed

```bash
pnpm --filter web exec playwright install chromium
```

### Run the browser suite

```bash
pnpm test:e2e:secure
```

### Stop a stuck local test server on Windows

```bash
pnpm test:e2e:stop
```

## Test Selection Guidance

Use browser tests when you need confidence in:

- SSR redirects
- auth-aware branching
- route transitions
- dialogs and tab navigation
- command-bar context changes
- multi-step flows that cross page boundaries

Do **not** add Playwright coverage for trivial copy-only changes with no meaningful behavior impact.
