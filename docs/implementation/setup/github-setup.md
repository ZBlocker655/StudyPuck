# GitHub Setup Guide

**Required for**: Milestone 1.1 - Monorepo + Basic SvelteKit App  
**Prerequisite**: Completed [Cloudflare Setup](cloudflare-setup.md)

## Overview

This guide configures GitHub repository secrets for automated deployment via GitHub Actions. These secrets allow the CI/CD pipeline to deploy to Cloudflare Pages.

## Setup Tasks

### 1. Add Repository Secrets

1. **Navigate to Repository Settings**
   - Go to your StudyPuck GitHub repository
   - Click **Settings** tab
   - Click **Secrets and variables** → **Actions**

2. **Add Cloudflare API Token**
   - Click **New repository secret**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Secret: *Paste the API token from Cloudflare setup*
   - Click **Add secret**

3. **Add Cloudflare Account ID**
   - Click **New repository secret**
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Secret: *Paste your Account ID from Cloudflare setup*
   - Click **Add secret**

### 2. Verify Secrets Configuration

Your repository secrets should include:
```
CLOUDFLARE_API_TOKEN=******************
CLOUDFLARE_ACCOUNT_ID=********************************
```

### 3. Configure Branch Protection (Optional)

1. **Protect Main Branch**
   - Go to **Settings** → **Branches**
   - Click **Add rule**
   - Branch name pattern: `main`

2. **Protection Rules** (recommended)
   - ☑️ Require a pull request before merging
   - ☑️ Require status checks to pass before merging
   - ☑️ Require branches to be up to date before merging
   - ☑️ Include administrators

**Note**: Branch protection is optional for solo development but recommended as the project grows. Can be added later at any time.

## Verification Checklist

- [ ] **CLOUDFLARE_API_TOKEN** secret added
- [ ] **CLOUDFLARE_ACCOUNT_ID** secret added  
- [ ] **Secrets visible** in repository settings
- [ ] **Branch protection configured** (optional but recommended)

## Security Best Practices

### Secret Management
- **Never log secrets**: Our GitHub Actions workflow will not log these values
- **Rotate tokens**: Consider rotating API tokens periodically
- **Limited scope**: API token has minimal required permissions

### Repository Access
- **Team access**: Only grant repository access to trusted collaborators
- **Token scope**: API token only works for your Cloudflare account
- **Branch protection**: Prevents accidental direct pushes to main

## Expected Results

After completing this setup:
- GitHub Actions can authenticate with Cloudflare
- Automated deployment will work when we push to main branch
- Repository is secured with proper access controls

## Next Step

Return to [Milestone 1.1](../milestones/1.1-monorepo-setup.md) to begin code implementation.

## Troubleshooting

### Secret Issues
- **Secret not found**: Verify exact name `CLOUDFLARE_API_TOKEN`
- **API token invalid**: Regenerate token with proper permissions
- **Account ID wrong**: Copy from Cloudflare dashboard right sidebar

### Access Issues
- **Permission denied**: Ensure you have admin access to repository
- **Secrets not visible**: Check you're in correct repository settings

### Deployment Issues (Later)
- **Build fails**: Check GitHub Actions logs for error details
- **Deploy fails**: Verify API token has Cloudflare Pages:Edit permission
- **Domain issues**: Confirm custom domain configured in Cloudflare

## Token Reference

Required API token permissions:
- `Account:Read` - Read account information
- `Cloudflare Pages:Edit` - Deploy to Pages projects  
- `Zone:Read` - Read domain information
- Account resources: Include your account
- Zone resources: Include `studypuck.app`