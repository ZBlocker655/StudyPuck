# Remote Development Guide

**Purpose**: Configure and use StudyPuck in GitHub Codespaces or another remote devcontainer environment without diverging from the documented local workflow.

## When to Use Remote Development

Remote development is useful when you want:
- A consistent Linux-based environment
- Browser-based or lightweight-device access
- An easier first-time setup for repository tooling

Local development remains the fallback path when you want:
- Faster iteration
- Offline work
- Full control over local credentials and tooling

## What the Devcontainer Provides

The remote devcontainer is designed to match the current StudyPuck stack:
- **Base image**: Node.js 20
- **GitHub CLI**: Installed via devcontainer feature
- **PNPM**: Enabled through Corepack using the repository's pinned package manager version
- **Dependencies**: Installed by `.devcontainer/bootstrap.sh`
- **Wrangler**: Used through the existing `apps/web` dependency and scripts
- **Forwarded ports**:
  - `5173` for the standard SvelteKit/Vite dev server
  - `4173` for preview
  - `8788` for Workers-style local development

## First-Time Setup

### 1. Launch the Remote Environment

Use one of the supported flows:
- **GitHub Codespaces**: Create a new Codespace from the repository
- **VS Code remote devcontainer**: Reopen the repository in the container

The container runs:

```bash
bash .devcontainer/bootstrap.sh
```

This enables PNPM, verifies `gh`, and installs workspace dependencies.

### 2. Verify Required Tools

Run:

```bash
gh --version
pnpm --version
pnpm --filter web exec wrangler --version
```

`wrangler` is provided by the existing `apps/web` dependency graph, so no separate global install is required.

### 3. Configure Environment Variables

StudyPuck expects the app environment file at:

```bash
apps/web/.env
```

Start from the committed template:

```bash
cp .env.example apps/web/.env
```

Then edit `apps/web/.env` with your real values.

For environment details, see [Environment Setup](./environment-setup.md).

### 4. Complete Human Setup Checkpoints

These steps require human action or approval:
- Decide whether to configure Auth0 and Neon credentials now or defer them
- Decide whether to use the shared development database or a feature-specific branch if that becomes necessary
- Authenticate tools if the remote environment does not inherit credentials:
  - `gh auth login`
  - `wrangler login`
  - `copilot` then `/login` if you install Copilot CLI
- Confirm the forwarded URLs load correctly in the browser

In interactive AI sessions, the assistant should pause and prompt before these checkpoints.

### 5. Start the Development Workflow

Use the same commands documented for local development:

```bash
pnpm dev
```

For the web app only:

```bash
pnpm --filter web dev
```

For Workers-style verification:

```bash
pnpm --filter web dev:workers
```

## Updating an Existing Remote Environment

Use this workflow when the repository, toolchain, or devcontainer configuration changes and you want to bring the remote environment fully up to date.

### 1. Pull the Latest Code

```bash
git pull --rebase
```

### 2. Rebuild the Container When Needed

Rebuild or reopen the container if any of these changed:
- `.devcontainer/devcontainer.json`
- `.devcontainer/bootstrap.sh`
- Base tooling assumptions

In Codespaces, rebuild the container from the editor or Codespaces UI. In a local devcontainer workflow, use the normal "Rebuild Container" command in your editor.

### 3. Re-Run Bootstrap

If the container was not rebuilt, refresh the environment manually:

```bash
bash .devcontainer/bootstrap.sh
```

This revalidates `gh`, reenables the pinned PNPM version, and syncs dependencies.

### 4. Recheck Runtime Prerequisites

Verify that required tools are still available:

```bash
gh --version
pnpm --version
pnpm --filter web exec wrangler --version
```

If authentication state is missing, complete the human-owned login steps again.

### 5. Reconcile Environment Variables

Do **not** overwrite your existing `apps/web/.env` blindly.

Instead:
- Compare it against `.env.example`
- Add any newly required variables
- Keep using a **direct** Neon connection string for migrations

### 6. Validate the Environment

Run the standard repo checks:

```bash
pnpm lint
pnpm check-types
pnpm build
```

Then restart whichever development server you need:

```bash
pnpm dev
```

## Optional: Use Copilot CLI Inside the Remote Container

Copilot CLI is optional for this workflow.

To install it inside the container:

```bash
npm install -g @github/copilot
```

Then start it from the repository root:

```bash
copilot
```

On first run:
- Trust the repository folder
- Run `/login` if authentication is required

## Troubleshooting

### `gh` Is Missing
- Rebuild the container so the GitHub CLI feature is applied
- Then rerun `bash .devcontainer/bootstrap.sh`

### `pnpm` Version Drift
- Run `bash .devcontainer/bootstrap.sh` again to reapply the pinned PNPM version via Corepack

### `wrangler` Is Not Available
- Run `pnpm install` through the bootstrap script again
- Use `pnpm --filter web exec wrangler --version` to verify the local dependency is available

### Forwarded Port Does Not Load
- Confirm the corresponding dev server is running
- Check whether the expected port is `5173`, `4173`, or `8788`
- Reopen the forwarded port from the remote environment UI if needed

### Environment Variables Are Missing
- Verify `apps/web/.env` exists
- Recopy from `.env.example` if needed, then add the real secrets manually
- Do not commit populated secret values back to the repository
