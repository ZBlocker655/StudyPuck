# Database Testing Strategy

## Purpose

This document covers StudyPuck's database-specific testing strategy: database-backed integration tests, migration validation, and how database tests relate to production parity.

It does **not** define the Playwright browser-test harness. That lives in `browser-testing-workflow.md`.

## Scope

This document applies to:

- `@studypuck/database` integration tests
- migration validation workflows
- Postgres test-environment choices
- database isolation and cleanup expectations

## Database Testing Goals

StudyPuck's database tests need to provide:

- production-relevant Postgres behavior
- predictable schema setup for Drizzle migrations
- clean state between runs
- reliable CI execution

## Strategy

### Use PostgreSQL semantics, not an in-memory substitute

StudyPuck relies on PostgreSQL-specific behavior and `pgvector`, so SQLite- or in-memory-style substitutes are not sufficient for database testing.

### Keep migrations on direct connection strings

Drizzle migration operations should use direct Postgres/Neon connection strings so migration tracking and schema changes behave correctly.

### Separate database-package testing from browser testing

StudyPuck currently has two distinct database-backed test paths:

1. **Database package / migration validation**
   - focused on schema correctness, queries, and migration behavior
   - currently uses the repo's Postgres container/service-container path

2. **Browser testing**
   - focused on real app flows through SvelteKit + Playwright
   - uses a separate ephemeral Neon branch workflow documented in `browser-testing-workflow.md`

## Current Database-Package Test Workflow

The current `@studypuck/database` integration-test path uses Postgres container infrastructure:

- local setup via `pnpm --filter @studypuck/database test:setup`
- local cleanup via `pnpm --filter @studypuck/database test:cleanup`
- CI via the GitHub Actions Postgres service container

This remains the current package-level database test baseline even though browser tests now use a different workflow.

## Migration Testing

Database migration validation should ensure:

- a clean database can apply the full migration history
- schema state matches current expectations
- destructive or risky migrations are reviewed deliberately

Typical concerns:

- schema drift
- migration-order safety
- extension availability such as `pgvector`
- data-integrity regressions

## Notes on Future Evolution

The browser-test workflow has already moved to ephemeral Neon branches for better cross-environment support. Database-package integration tests are still documented separately here because they remain a distinct workflow and tradeoff space.
