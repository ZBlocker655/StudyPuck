# Authentication Logout Issue

**Identified**: December 28, 2025  
**Priority**: Critical - Blocks completion of Milestone 1.2 Authentication  

## Problem Description

The application's logout functionality is inconsistent and does not reliably terminate the user's session with Auth0 or update the local UI state. Specifically, after initiating a logout:
- The user is often not prompted for a password challenge upon attempting to log in again.
- The client-side UI (e.g., the "Sign Out" button) does not consistently update to reflect a logged-out state (e.g., changing to "Sign In").

This occurs despite:
- Auth0 logs sometimes showing a "Success Logout" event (indicating the `end_session_endpoint` was hit).
- Network HAR files confirming attempts to clear local session cookies and redirect to Auth0's logout endpoint with `id_token_hint`.

## Initial Diagnosis

The primary issue is the persistence of the Auth0 session, which allows immediate re-login without a password challenge. The secondary issue is the inconsistent local UI state after logout.

## Attempts & Learnings

A comprehensive series of attempts were made to resolve the logout issue, each yielding new insights into the complex interaction between SvelteKit, `@auth/sveltekit` (Auth.js), and Auth0's federated logout mechanism.

### 1. Client-Side `signOut` with `redirect: true` (`login-logout5.har` to `login-logout6.har`)
- **Approach**: Initially used client-side `signOut({ callbackUrl: '/', redirect: true })` from `@auth/sveltekit/client`.
- **Result**: `POST /auth/signout` responded with `200 OK` JSON containing a `location` header, but no actual HTTP 3xx redirect. Auth0 session not cleared.
- **Learning**: Client-side `signOut` (via `fetch`) does not perform server-side IdP redirects.

### 2. Custom Server-Side Logout Endpoint with Form Submission (`login-logout8.har`)
- **Approach**: Implemented a `POST /auth/logout` server endpoint (`src/routes/auth/logout/+server.ts`). Client-side `AuthButton.svelte` submitted an HTML form to this endpoint, triggering a full page navigation. The server endpoint was intended to clear the local session and redirect to Auth0.
- **Result**: `POST /auth/logout` responded with `302 Found` to `http://localhost:5173/`. Auth0 session still not cleared.
- **Learning**: Form submission successfully triggered a server-side redirect, but `SvelteKitAuth`'s server-side processing for `/auth/logout` was still overriding our custom redirect to Auth0.

### 3. Incorporating `id_token_hint` (`login-logout11.har` to `login-logout13.har`)
- **Approach**: Modified `src/lib/auth.ts` to extend JWT and session callbacks, persisting `id_token` in the session. `src/routes/auth/logout/+server.ts` was updated to retrieve this `id_token` and include it as `id_token_hint` in the Auth0 logout URL.
- **Result**: `POST /auth/logout` *still* redirected to `http://localhost:5173/`. The `id_token_hint` was not visible in the final redirect.
- **Learning**: The `SvelteKitAuth` internal redirect mechanism for `signOut` (even with `redirect: false`) seemed to be consistently overriding our explicit redirect to Auth0.

### 4. Debugging `signOut` Override (Commenting out `signOut` in `+server.ts` - `login-logout15.har`)
- **Approach**: Temporarily commented out `await signOut(event, { redirect: false });` in `src/routes/auth/logout/+server.ts` to isolate interference.
- **Result**: `POST /auth/logout` *successfully* redirected to Auth0's `end_session_endpoint` with `id_token_hint`. Auth0 logs showed a "Success Logout". **However, the local session was not cleared.**
- **Learning**: `signOut` *was* the component preventing our explicit redirect to Auth0. But commenting it out stopped local session clearing. This highlighted the conflict: clear local session OR redirect to Auth0, but not both consistently with the current approach.

### 5. Attempting Merged Headers / Direct `signOutResponse` Modification (`login-logout18.har` to `login-logout20.har`)
- **Approach**: Modified `src/routes/auth/logout/+server.ts` to capture `signOutResponse`, and then manually set its `Location` header to the `auth0LogoutUrl` and status to `302`. This was intended to merge `Set-Cookie` headers from `signOutResponse` with our custom redirect.
- **Result**: The HAR (`login-logout20.har`) shows the `location` header in the `POST /auth/logout` response as `http://localhost:5173/`. No `Set-Cookie` headers for session clearing were observed. Auth0 logs showed *no* "Success Logout".
- **Learning**: Even direct modification of `signOutResponse`'s `Location` header and merging `Set-Cookie` headers is being overridden or mishandled by SvelteKit's response processing pipeline, preventing both the correct federated redirect and local cookie clearing. `invalidateAll()` was also added to `+layout.svelte`, but cannot fix a missing `Set-Cookie` header.

## Current State

The system is in a state where:
- The client-side UI consistently shows "Sign Out" after logout attempts, indicating persistent local session perception.
- Auth0 logs do not reliably show "Success Logout" events, indicating the `end_session_endpoint` is not consistently being hit with valid parameters.
- The core problem remains: user can immediately re-login without a password challenge.

The fundamental challenge is that `SvelteKitAuth`'s server-side `signOut` function has unexpected side effects or interactions with SvelteKit's response handling that prevent precise control over `Set-Cookie` headers and the final `Location` header for a multi-step federated logout.

## Recommended Next Steps

1.  **Deep Dive into `@auth/sveltekit` Source/Docs**: Investigate the internal workings of `SvelteKitAuth`'s server-side `signOut` function to understand precisely how it generates and handles redirects and `Set-Cookie` headers, and if there's an officially recommended pattern for handling federated logout with external IdPs.
2.  **SvelteKit Response Handling**: Research SvelteKit's `Response` object lifecycle and how `handle` functions, server endpoints, and middleware can modify or override each other's responses.
3.  **Auth0 Logout Requirements Review**: Reconfirm Auth0's exact logout requirements, especially regarding `id_token_hint` validity and session invalidation timing.
4.  **Community Resources**: Search for existing solutions or discussions in `@auth/sveltekit`, `next-auth`, or SvelteKit communities regarding complex federated logout scenarios with Auth0.

## Files Involved

- `apps/web/src/lib/auth.ts` (SvelteKitAuth configuration, JWT/Session callbacks)
- `apps/web/src/routes/auth/logout/+server.ts` (Custom server-side logout endpoint)
- `apps/web/src/lib/components/AuthButton.svelte` (Client-side trigger for logout)
- `apps/web/src/routes/+layout.svelte` (Client-side `invalidateAll()` for UI update)
- `.env` (Environment variables like `AUTH0_ISSUER`, `AUTH0_CLIENT_ID`, `AUTH_URL`)

---
**Status**: Open
