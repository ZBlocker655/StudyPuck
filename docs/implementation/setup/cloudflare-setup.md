# Cloudflare Setup Guide

**Required for**: Milestone 1.1 - Monorepo + Basic SvelteKit App  
**Prerequisite**: You must own the `studypuck.app` domain in Cloudflare

## Overview

This guide configures Cloudflare Pages for StudyPuck deployment and sets up the necessary API access for GitHub Actions automated deployment.

## Setup Tasks

### 1. Create Cloudflare Pages Project

1. **Navigate to Cloudflare Pages**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Click **Workers & Pages** in the left sidebar
   - Click **Create application**
   - Click **Pages** tab → **Connect to Git**

2. **Connect to Git Repository**
   - You should now see **"Connect to Git"** option
   - Select **GitHub** as your Git provider
   - Choose your **StudyPuck** repository
   - Click **Begin setup**

3. **Configure Build Settings**
   ```
   Project name: studypuck
   Production branch: main
   Build command: pnpm turbo build --filter=web
   Build output directory: apps/web/build
   Root directory: (leave empty)
   Deploy command: (leave empty - clear the default)
   ```

4. **Configure Node.js Version** (after project creation)
   - In your Pages project dashboard, go to **Settings** → **Environment variables**
   - Add environment variable:
     ```
     NODE_VERSION = 20
     ```
   - Or look for **Build configuration** settings in the project dashboard

5. **Deploy Site**
   - Click **Save and Deploy**
   - Initial deployment will fail (expected - we haven't created the monorepo yet)
   - Note the generated URL (e.g., `studypuck.pages.dev`)

### 2. Configure Custom Domain

1. **Add Custom Domain**
   - In your Pages project, go to **Custom domains**
   - Click **Set up a custom domain**
   - Enter: `studypuck.app`
   - Click **Continue**

2. **DNS Configuration**
   - Cloudflare should automatically configure DNS since you own the domain
   - Verify the CNAME record points to your Pages project
   - SSL certificate will be automatically provisioned

3. **Verify Domain Setup**
   - Wait 5-10 minutes for DNS propagation
   - Visit `https://studypuck.app` (may show 404 initially, that's expected)

### 3. Create API Token for GitHub Actions

1. **Navigate to API Tokens**
   - Go to **My Profile** → **API Tokens**
   - Click **Create Token**

2. **Create Custom Token**
   - Template: **Custom token**
   - Token name: `StudyPuck GitHub Actions`

3. **Configure Permissions**
   ```
   Account - Account:Read
   Zone - Zone:Read
   Zone - DNS:Edit (for studypuck.app)
   Zone Resources - Include: studypuck.app
   Account - Cloudflare Pages:Edit
   Account Resources - Include: Your Account
   ```

4. **Create and Save Token**
   - Click **Continue to summary** → **Create Token**
   - ⚠️ **COPY THE TOKEN** - you won't see it again
   - Save it securely for GitHub setup

### 4. Get Account ID

1. **Find Account ID**
   - In Cloudflare Dashboard, check the right sidebar
   - Copy your **Account ID** 
   - Save it for GitHub setup

## Verification Checklist

- [ ] **Pages project created** with name `studypuck`
- [ ] **Build settings configured** for monorepo structure
- [ ] **Custom domain added** (`studypuck.app`)
- [ ] **DNS configured** and propagating
- [ ] **API token created** with proper permissions
- [ ] **Account ID copied** for GitHub setup

## Expected Results

After completing this setup:
- `studypuck.pages.dev` exists (may show 404)
- `studypuck.app` is configured as custom domain
- You have API token and Account ID for GitHub Actions
- Project is ready for automated deployment

## Next Step

Complete [GitHub Setup](github-setup.md) to enable automated deployment.

## Troubleshooting

### Domain Issues
- **DNS not propagating**: Wait up to 24 hours, use DNS checker tools
- **SSL certificate pending**: Usually resolves automatically within 15 minutes
- **404 on custom domain**: Expected until first successful deployment

### Build Configuration Issues  
- **Wrong build command**: Must be `pnpm turbo build --filter=web`
- **Wrong output directory**: Must be `apps/web/build`
- **Node.js version**: Must be 20 for compatibility

### API Token Issues
- **Insufficient permissions**: Ensure all required permissions are granted
- **Wrong zone/account**: Verify resources include your account and domain
- **Token not working**: Regenerate with correct permissions

## Security Notes

- **API Token**: Keep secure, never commit to repository
- **Account ID**: Not sensitive, but store securely
- **Domain ownership**: Ensure you control `studypuck.app` DNS