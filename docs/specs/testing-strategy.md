# Testing Strategy

## Purpose

This document covers StudyPuck's overall testing philosophy, tool choices, authentication testing approach, and CI/CD expectations.

It is intentionally separate from:

- `database-testing-strategy.md` for database-specific testing and migration validation
- `browser-testing-workflow.md` for the concrete Playwright browser-test harness and local workflow
- `ui-testing-guidelines.md` for UI-specific testing expectations

## Project Context

StudyPuck uses SvelteKit, Neon Postgres, Auth.js, and GitHub Actions. The testing strategy needs to support:

- fast local feedback
- reliable browser coverage for real user flows
- safe database and migration validation
- production-safe CI/CD gates

## Testing Philosophy

StudyPuck uses a layered testing approach:

1. **Unit tests** for pure logic, formatting, and state derivation
2. **Integration tests** for database operations, route/server logic, and auth-aware behavior
3. **Component tests** for Svelte rendering and interaction contracts
4. **Browser tests** for routing, auth-aware flows, dialogs, tabs, shell behavior, and cross-page interactions

The goal is not exhaustive duplication. The goal is confidence at the cheapest layer that still validates the behavior honestly.

## Testing Frameworks

### Vitest

Vitest is the baseline for:

- unit tests
- integration tests
- component tests

Why:

- native SvelteKit and TypeScript support
- fast feedback during development
- straightforward mocking for focused tests

### Playwright

Playwright is the baseline for:

- browser interaction tests
- route-transition and redirect tests
- real shell/navigation coverage
- end-to-end flows that need an actual browser

Why:

- stable browser automation
- good debugging and trace support
- reliable selectors and waiting behavior

## Authentication Testing Strategy

StudyPuck uses a hybrid authentication testing model:

- **unit/component tests**: mock Auth.js session data and Auth0-dependent behavior
- **browser tests**: use the repo's e2e session harness instead of live Auth0 login
- **full external-auth validation**: reserve for deliberate integration checks when needed

This keeps normal development fast while still providing coverage for auth-aware routing and UI behavior.

## CI/CD Integration

StudyPuck uses a hybrid validation/deployment model:

- **GitHub Actions** runs the required test, lint, and build checks
- **Cloudflare Pages** handles deployments after the required checks pass

Current expectations:

- meaningful web changes should pass the web lint, type-check, test, and build steps
- browser tests are part of the normal PR validation path for meaningful UI behavior
- deploys should remain gated on successful validation

## Current Testing Architecture Summary

- **Unit/integration/component coverage**: Vitest
- **Browser coverage**: Playwright
- **UI-specific expectations**: `ui-testing-guidelines.md`
- **Database-specific strategy**: `database-testing-strategy.md`
- **Concrete browser harness/workflow**: `browser-testing-workflow.md`
