# Auth.js Cloudflare Runtime Error

**Identified**: January 3, 2026  
**Priority**: Critical - Blocks completion of Milestone 1.2 Authentication  
**Status**: Active Investigation

## Problem Description

Auth.js authentication works perfectly in local development and GitHub Actions, but fails in Cloudflare Pages production with:

```
TypeError: basePath?.replace is not a function
at createActionURL (functionsWorker-0.11842779878678122.js:9908:41)
at auth (functionsWorker-0.11842779878678122.js:24765:22)
```

## Major Breakthrough - Environment Variables NOT the Issue

**RESOLVED**: Environment variable access is working perfectly across all environments.

Cloudflare production logs show:
```
[ENV] AUTH_SECRET: Found via $env/dynamic/private
[ENV] AUTH0_CLIENT_ID: Found via $env/dynamic/private  
[ENV] AUTH0_CLIENT_SECRET: Found via $env/dynamic/private
[ENV] AUTH0_ISSUER: Found via $env/dynamic/private
[ENV] AUTH0_AUDIENCE: Found via $env/dynamic/private
[ENV] Final envSource: AUTH_SECRET: true, AUTH0_CLIENT_ID: true, AUTH0_CLIENT_SECRET: true, AUTH0_ISSUER: true, AUTH0_AUDIENCE: true
```

## Real Root Cause

The issue is **internal to Auth.js** in the Cloudflare Workers runtime environment. The `createActionURL` function is receiving `undefined` or `null` for a `basePath` parameter, but this is NOT our configured `basePath: '/auth'` - it's some internal basePath that Auth.js is trying to process.

## Environment Analysis

### ✅ Local Development
- **Runtime**: Node.js
- **Environment**: `$env/dynamic/private` from .env file
- **Auth.js**: Works perfectly
- **URL Processing**: Standard Node.js URL handling

### ✅ GitHub Actions  
- **Runtime**: Node.js
- **Environment**: `$env/dynamic/private` from workflow env vars
- **Build**: Successful
- **Auth.js**: No runtime testing (build-only)

### ❌ Cloudflare Pages
- **Runtime**: Cloudflare Workers (V8 Isolates)
- **Environment**: `$env/dynamic/private` from build-time injection ✅
- **Auth.js**: Fails in `createActionURL` function
- **URL Processing**: Different from Node.js

## Technical Analysis

The error occurs in Auth.js's internal `createActionURL` function, which suggests:

1. **URL/Request Processing Differences**: Cloudflare Workers handle URLs differently than Node.js
2. **Auth.js Cloudflare Compatibility**: Auth.js may have specific requirements for Cloudflare Workers
3. **SvelteKit Adapter Issues**: The Cloudflare adapter might not be providing expected request properties
4. **Runtime Environment Differences**: V8 Isolates vs Node.js may expose different APIs

## Investigation Needed

### Immediate Research
- [ ] Check Auth.js documentation for Cloudflare Workers deployment
- [ ] Review SvelteKit Cloudflare adapter compatibility with Auth.js
- [ ] Investigate `createActionURL` function requirements and dependencies
- [ ] Check for known Auth.js + Cloudflare Workers issues

### Code Investigation  
- [ ] Add logging to see what `basePath` value is being passed to `createActionURL`
- [ ] Check request object structure in Cloudflare vs local dev
- [ ] Verify Auth.js configuration for Workers runtime
- [ ] Test minimal Auth.js setup in Cloudflare environment

### Configuration Review
- [ ] Review `trustHost: true` setting effectiveness
- [ ] Check URL/origin handling in Cloudflare Workers
- [ ] Verify Auth.js adapter configuration for SvelteKit
- [ ] Consider alternative auth configuration approaches

## Success Criteria

- [ ] Auth.js authentication works in Cloudflare Pages production
- [ ] Login/logout flow functions end-to-end
- [ ] No runtime errors in production logs
- [ ] Consistent behavior across local dev and production

---

**Next Action**: Research Auth.js Cloudflare Workers compatibility and known issues
**Timeline**: Critical path for Milestone 1.2 completion
**Impact**: Blocks all authentication functionality in production