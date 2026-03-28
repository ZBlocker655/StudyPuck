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
- **Base image**: Node.js 22
- **GitHub CLI**: Installed via devcontainer feature
- **PNPM**: Enabled through Corepack using the repository's pinned package manager version
- **Dependencies**: Installed by `.devcontainer/bootstrap.sh`
- **Bitwarden CLI**: Installed by `.devcontainer/bootstrap.sh`
- **Wrangler**: Used through the existing `apps/web` dependency and scripts
- **Copilot CLI**: Installed by `.devcontainer/bootstrap.sh` into the user-local tool path
- **Copilot editor extensions**: Requested through the devcontainer VS Code extensions list
- **Forwarded ports**:
  - `5173` for the standard SvelteKit/Vite dev server
  - `4173` for preview
  - `8788` for Workers-style local development

## First-Time Setup

### Before You Start

For a brand-new Codespace, expect two kinds of setup:

- **automatic setup by the container**: install tools, install dependencies, prepare the repo
- **human-owned login/setup**: sign in to services like GitHub CLI, Copilot, Wrangler, and Bitwarden

The devcontainer already installs the Bitwarden CLI for you through `.devcontainer/bootstrap.sh`, so you should not need to install it manually inside Codespaces.

#### One-time prerequisite: Bitwarden API key and GitHub Codespaces secrets

This only needs to be done once, not for every new Codespace.

**Get your Bitwarden API key:**
1. Log in to the Bitwarden web vault
2. Go to **Account Settings → Security → API Key**
3. Click **View API Key** (re-enter your master password if prompted)
4. Note the `client_id` and `client_secret` values

**Add them as GitHub Codespaces secrets:**
1. Go to your GitHub repository → **Settings → Secrets and variables → Codespaces**
2. Add `BW_CLIENTID` with the `client_id` value
3. Add `BW_CLIENTSECRET` with the `client_secret` value
4. Optionally add `BW_PASSWORD` with your master password for fully non-interactive unlock (skip the manual unlock step each session)

These secrets are automatically injected into every Codespace for this repository.

### 1. Launch the Remote Environment

Use one of the supported flows:
- **GitHub Codespaces**: Create a new Codespace from the repository
- **VS Code remote devcontainer**: Reopen the repository in the container

The container runs:

```bash
bash .devcontainer/bootstrap.sh
```

This enables PNPM, verifies `gh`, installs workspace dependencies, installs Bitwarden CLI if missing, and installs Copilot CLI if missing.

If the container is running as a non-root user, the bootstrap script installs Corepack shims into a user-writable bin directory instead of `/usr/local/bin`.

### 2. Verify Required Tools

Run:

```bash
gh --version
pnpm --version
copilot --version
bw --version
pnpm --filter web exec wrangler --version
```

`wrangler` is provided by the existing `apps/web` dependency graph, so no separate global install is required.

### 3. Complete Human Logins

These steps are expected for a fresh Codespace and should be completed by the human developer:

```bash
gh auth login
bw login --apikey
copilot
```

Notes:

- `bw login --apikey` uses `BW_CLIENTID` and `BW_CLIENTSECRET` from Codespaces secrets — no password prompt needed.
- After login, Bitwarden syncs the vault automatically.
- In Copilot CLI, run `/login` if prompted.
- `wrangler login` is **not required** for local development — `pnpm dev:workers:secure` runs entirely in a local sandbox. Wrangler authentication is only needed if you want to run commands against live Cloudflare infrastructure (e.g., inspecting remote D1). Deployments are handled automatically by GitHub Actions.

### 4. Unlock Bitwarden and Verify Environment

Unlock your vault once per shell session:

```bash
# If BW_PASSWORD is set as a Codespaces secret, this is automatic.
# Otherwise run manually:
export BW_SESSION=$(bw unlock --raw)
```

Then verify all StudyPuck secrets resolve correctly:

```bash
pnpm env:check:secure
```

You should see all variables — including `AUTH_SECRET`, `AUTH0_CLIENT_ID`, `DATABASE_URL`, etc. — resolved from the **`StudyPuck Dev`** Bitwarden item.

If you see "Expected exactly one Bitwarden item", check that your vault contains an item named exactly `StudyPuck Dev` with the required custom fields. See [Environment Setup](./environment-setup.md) for the full field list.

### 5. Complete Human Setup Checkpoints

These steps require human action or approval:
- Decide whether to configure Auth0 and Neon credentials now or defer them
- Decide whether to use the shared development database or a feature-specific branch if that becomes necessary
- Authenticate tools if the remote environment does not inherit credentials:
  - `gh auth login`
  - `bw login --apikey`
  - `copilot` then `/login`
  - `wrangler login` — only if you need to interact with live Cloudflare infrastructure (not required for local dev)
- Confirm the forwarded URLs load correctly in the browser

In interactive AI sessions, the assistant should pause and prompt before these checkpoints.

### 6. Start the Development Workflow

Use the same commands documented for local development:

```bash
pnpm dev:secure
```

For the web app only:

```bash
pnpm dev:secure
```

For Workers-style verification:

```bash
pnpm dev:workers:secure
```

> `dev:workers:secure` writes secrets to a temporary `apps/web/.dev.vars` file (required by Wrangler's V8 isolate runtime) and deletes it when the server stops. The file is gitignored.

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

Do **not** recreate a plaintext `apps/web/.env` as your normal setup.

Instead:
- Pull the latest `.env.schema`
- Run `pnpm env:check:secure`
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
pnpm dev:secure
```

## Use Copilot CLI Inside the Remote Container

Copilot CLI is preinstalled by `.devcontainer/bootstrap.sh`.

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

### Corepack Permission Error
- If you see an `EACCES` error while Corepack tries to write to `/usr/local/bin`, rerun the updated bootstrap script from the repository root:
  ```bash
  bash .devcontainer/bootstrap.sh
  ```
- The repository bootstrap uses a user-writable install directory for PNPM shims so Codespaces and other non-root containers can complete setup.

### `wrangler` Is Not Available
- Run `pnpm install` through the bootstrap script again
- Use `pnpm --filter web exec wrangler --version` to verify the local dependency is available

### `copilot` Is Not Available
- Rerun the bootstrap script:
  ```bash
  bash .devcontainer/bootstrap.sh
  ```
- Confirm the user-local tool path is present:
  ```bash
  echo "$PATH"
  copilot --version
  ```

### Forwarded Port Does Not Load
- Confirm the corresponding dev server is running
- Check whether the expected port is `5173`, `4173`, or `8788`
- Reopen the forwarded port from the remote environment UI if needed

### Environment Variables Are Missing
- Verify `BW_SESSION` is exported or `BW_PASSWORD` is available
- Verify the configured Bitwarden item contains the required StudyPuck custom fields
- Run `pnpm env:check:secure` to confirm the secure command path resolves values
