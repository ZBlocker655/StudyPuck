# Adding Environment Variables

**Purpose**: Step-by-step workflow for safely introducing a new environment variable into StudyPuck across local development, Codespaces, CI, and production.

## When To Use This Guide

Use this guide whenever you need to:

- add a brand new environment variable
- change how an existing variable is sourced
- make a variable required or optional
- expose a new `PUBLIC_*` variable to the browser

If you are only rotating a secret value without changing names or behavior, update the secret source only and do not change the schema unless the contract changed.

## Core Rule

StudyPuck's committed source of truth is `.env.schema`.

Do **not** treat `apps/web/.env` as the normal workflow. For local development and Codespaces, secure values come from Bitwarden through the repo's varlock-backed command flow. GitHub Actions and Cloudflare keep using platform-native environment injection.

## Step 1: Decide What Kind of Variable You Are Adding

Before editing anything, decide:

- Is it **secret** or **non-secret**?
- Is it **required** or **optional**?
- Is it needed in:
  - local dev
  - local Wrangler dev
  - Codespaces/devcontainer
  - GitHub Actions
  - Cloudflare preview/production
  - tests
- Is it **server-only** or must it be exposed to the browser as `PUBLIC_*`?

### Quick Decision Rules

- Use `PUBLIC_*` only for values intentionally safe for client-side exposure.
- Mark secrets with `@sensitive`.
- Mark values with `@required` only when the app cannot function correctly without them.
- Mark values with `# @optional` if they are intentionally absent in some environments.

## Step 2: Update `.env.schema`

Add the new variable to `.env.schema` in the appropriate section.

Include:

- a short comment explaining what it is for
- validation metadata such as `@type=...`
- `@required` and/or `@sensitive` as appropriate
- `# @optional` if the variable is legitimately absent in some environments

### Example: required secret

```env-spec
# API key used for example service requests.
# @required @sensitive @type=string
EXAMPLE_API_KEY=exec('node scripts/bitwarden-secret.mjs EXAMPLE_API_KEY')
```

### Example: optional non-secret

```env-spec
# Optional override for example service base URL.
# @optional @type=url
EXAMPLE_BASE_URL=
```

### Example: browser-safe public value

```env-spec
# Public app support URL shown in the client UI.
# @required @type=url
PUBLIC_SUPPORT_URL=https://example.com/support
```

## Step 3: Choose the Value Source Per Environment

### Local development and Codespaces

If the value is sensitive and should be available in local dev/Codespaces, wire it through Bitwarden using the existing helper pattern:

```env-spec
MY_SECRET=exec('node scripts/bitwarden-secret.mjs MY_SECRET')
```

Then add the same custom field name to the approved Bitwarden item, normally:

```text
StudyPuck Dev
```

If the value is non-secret, you can set it directly in `.env.schema` or derive it from other env values.

### GitHub Actions

If workflows need the variable, add it as a repository/environment secret or variable in GitHub Actions and wire it into the relevant workflow file.

Examples:

- secret values: GitHub Actions Secrets
- non-secret config: GitHub Actions Variables or workflow `env`

### Cloudflare

If preview or production needs the variable, add it in Cloudflare Pages / Workers environment configuration.

Do not move production secrets into versioned files.

### Tests

If tests require the variable:

- prefer a safe default in `.env.schema` when appropriate
- otherwise ensure the test command injects it explicitly
- document any extra setup if humans must provide it locally

## Step 4: Update Repo Helpers If Needed

Most new sensitive local variables do **not** require script changes if you follow the existing helper pattern and use:

```env-spec
exec('node scripts/bitwarden-secret.mjs YOUR_KEY')
```

However, update helper code if either condition is true:

- the key must be included in the Bitwarden helper's supported key list
- the secure wrapper or validation logic has hard-coded assumptions about the set of required variables

Relevant files:

- `scripts/bitwarden-secret.mjs`
- `scripts/studypuck-env.mjs`
- `scripts/run-with-bitwarden-env.mjs`

If you add a new Bitwarden-backed secret and the helper rejects it, update `requiredSecretKeys` in `scripts/studypuck-env.mjs`.

## Step 5: Update Application Code

Wire the new variable into the correct runtime surface.

### SvelteKit server code

Use server-side env access:

- `$env/dynamic/private`
- `event.platform.env` where appropriate in Workers runtime

### Client-side Svelte code

Only use `PUBLIC_*` variables.

### Shared/database/tooling code

Use `process.env` where the package is intended to run in Node-based tooling, or follow the existing fallback patterns already used in the repo.

## Step 6: Update Documentation

Update whichever docs are affected:

- `docs/ops/environment-setup.md` for setup or behavior changes
- `README.md` if the quick-start workflow changes
- workflow-specific docs in `docs/ops/` if humans or agents need new setup steps

If the variable changes how developers operate, document that change in `docs/ops/`.

## Step 7: Validate the Change

Run the relevant checks for the affected surfaces.

### Secure env validation

```bash
pnpm env:check:secure
```

### Leak scan

```bash
pnpm env:scan:secure
```

### Standard repo validation

```bash
pnpm lint
pnpm check-types
pnpm build
pnpm test
```

### Runtime verification targets

Issue 74 expects these development/runtime paths to remain valid:

- local PC dev
- local PC Wrangler
- GH Codespaces dev
- GH Codespaces Wrangler

When a change affects runtime configuration, verify the relevant combinations instead of assuming the schema change is enough.

## Step 8: Check Each Environment Explicitly

Use this checklist:

### Local / Codespaces

- `.env.schema` updated
- Bitwarden item updated if secret-backed
- `pnpm env:check:secure` passes
- affected local commands still boot

### GitHub Actions

- workflow has the variable available if needed
- secret/variable names match exactly
- CI behavior still matches the schema

### Cloudflare

- preview/production environment variables updated if needed
- secret values are added in platform config, not git

### Tests

- test defaults or setup still work
- no new hidden manual step was introduced without docs

## Common Mistakes To Avoid

- forgetting to add `# @optional` for envs that are intentionally blank
- adding server secrets as `PUBLIC_*`
- documenting a variable in code but not in `.env.schema`
- updating local secret flow but forgetting GitHub Actions or Cloudflare
- changing the schema without validating the secure commands
- introducing a new plaintext `.env` dependency as the normal workflow

## Recommended Change Checklist

For most new variables, the full sequence is:

1. Add the variable to `.env.schema`
2. Decide `@required`, `@sensitive`, `@type`, and optionality
3. Add/update Bitwarden field if local secret-backed
4. Add/update GitHub Actions secret/variable if CI needs it
5. Add/update Cloudflare env config if preview/prod needs it
6. Wire application/tooling code to read it correctly
7. Update docs
8. Run validation commands
9. Manually verify the affected runtime flows

## Related Docs

- [Environment Setup](./environment-setup.md)
- [Remote Development](./remote-development.md)
- [Database Workflow](./database-workflow.md)
