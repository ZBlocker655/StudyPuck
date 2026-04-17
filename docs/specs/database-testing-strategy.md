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
   - uses an ephemeral Neon branch as the canonical cross-environment workflow
   - keeps Docker as an explicit local fast path only

2. **Browser testing**
   - focused on real app flows through SvelteKit + Playwright
   - uses a separate ephemeral Neon branch workflow documented in `browser-testing-workflow.md`

## Current Database-Package Test Workflow

The current `@studypuck/database` package test surface is:

| Purpose | Command | Notes |
|---|---|---|
| Canonical full suite | `pnpm --filter @studypuck/database test` | Creates an ephemeral Neon branch, runs the `*.test.ts` suite, and deletes the branch by default |
| Explicit canonical mode | `pnpm --filter @studypuck/database test:branch` | Same as `test` |
| Preserve branch on failure | `PRESERVE_TEST_DB_ON_FAILURE=1 pnpm --filter @studypuck/database test:branch` | Debug-only escape hatch |
| Optional local fast path | `pnpm --filter @studypuck/database test:docker` | Uses Docker Postgres and cleans up automatically |
| Explicit Docker lifecycle | `pnpm --filter @studypuck/database test:docker:setup` / `test:docker:cleanup` | For local watch/debug loops |
| Issue-scoped extra branch tests | `pnpm --filter @studypuck/database test:branch:issue` | Runs `*.neon.test.ts` tests that stay separate from the permanent suite |

CI should treat the branch workflow as the primary package-test path. Docker remains available when a contributor intentionally wants the local speed/offline tradeoff.

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

The browser-test workflow and the database-package workflow now both rely on ephemeral Neon branches for their canonical cross-environment path, but they remain separate harnesses with different goals and setup details.
