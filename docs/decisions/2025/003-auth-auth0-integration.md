# ADR-003: Authentication: Auth0 + Auth.js Integration

**Date:** 2025-12-12  
**Status:** Accepted  
**Deciders:** @ZBlocker655  
**Technical Story:** [GitHub Issue #27](https://github.com/ZBlocker655/StudyPuck/issues/27), [GitHub Issue #15](https://github.com/ZBlocker655/StudyPuck/issues/15)

## Context and Problem Statement

StudyPuck requires user authentication to enable personalized language learning experiences, card management, and progress tracking. The application uses SvelteKit deployed on Cloudflare Workers, which presents specific compatibility requirements for authentication libraries and services.

## Decision Drivers

* **Cloudflare Workers Compatibility**: Must work in V8 isolate environment without Node.js dependencies
* **SvelteKit Integration**: Native hooks.server.ts support for server-side authentication
* **OAuth Integration**: Support for social login providers (Google, GitHub)
* **Session Management**: Secure JWT/session handling compatible with serverless architecture
* **Developer Experience**: TypeScript support, good documentation, minimal setup complexity
* **Cost**: Free tier sufficient for hobby project scale (target: 1000+ users)
* **Security**: Industry-standard practices, federated logout support

## Considered Options

* **Option 1**: Auth0 + Auth.js (SvelteKit Auth)
* **Option 2**: Supabase Auth
* **Option 3**: Clerk
* **Option 4**: Custom Auth0 integration
* **Option 5**: Cloudflare Access

## Decision Outcome

**Chosen option:** **Auth0 + Auth.js (SvelteKit Auth)**, because it provides excellent SvelteKit integration, works with Cloudflare Workers (after version upgrade), supports required OAuth providers, and maintains architectural flexibility.

### Positive Consequences

* **Excellent SvelteKit Integration**: Native `@auth/sveltekit` package with hooks support
* **OAuth Provider Support**: Easy configuration for Google, GitHub, and other providers
* **Flexible Architecture**: No database coupling, works with any backend
* **Industry Standard**: JWT-based, stateless authentication suitable for edge deployment
* **Generous Free Tier**: 7,500 users sufficient for hobby project growth
* **Universal Login**: Good user experience with customizable Auth0 hosted pages

### Negative Consequences

* **External Dependency**: Relies on Auth0 service availability
* **Complexity**: More moving parts than simpler auth solutions
* **Initial Cloudflare Issues**: Required Auth.js version upgrade to resolve compatibility (resolved)

## Pros and Cons of the Options

### Option 1: Auth0 + Auth.js ✅

* Good, because excellent SvelteKit integration with `@auth/sveltekit`
* Good, because stateless JWT approach aligns with edge computing
* Good, because no database coupling - maintains architectural flexibility
* Good, because 7,500 user free tier sufficient for hobby project
* Good, because Universal Login provides good UX
* Good, because industry-standard, secure implementation
* Bad, because initially had Cloudflare Workers compatibility issues (resolved with upgrade)
* Bad, because external service dependency

### Option 2: Supabase Auth

* Good, because 50,000 user free tier is very generous
* Good, because integrated real-time features and Row Level Security
* Good, because excellent developer experience and documentation
* Bad, because would require switching from Neon Postgres to Supabase database
* Bad, because creates architectural coupling between auth and database
* Bad, because less mature SvelteKit integration compared to Auth.js

### Option 3: Clerk

* Good, because 10,000 monthly active users in free tier
* Good, because pre-built UI components and excellent documentation
* Good, because webhooks and advanced user management features
* Bad, because React-first approach with less mature SvelteKit support
* Bad, because potential vendor lock-in with proprietary APIs
* Bad, because may have similar Cloudflare Workers compatibility concerns

### Option 4: Custom Auth0 Integration

* Good, because full control over implementation
* Good, because guaranteed Cloudflare Workers compatibility
* Good, because can optimize for specific use cases
* Bad, because significant implementation effort and security responsibility
* Bad, because manual session management and JWT validation
* Bad, because reinventing well-solved problems

### Option 5: Cloudflare Access

* Good, because native Cloudflare integration with zero compatibility issues
* Good, because simple setup and management
* Bad, because platform lock-in to Cloudflare ecosystem
* Bad, because limited OAuth provider options
* Bad, because may not meet all custom authentication requirements

## Technical Implementation Details

### Auth.js Version Resolution
* **Initial Issue**: Auth.js `@auth/core@0.34.3` had Cloudflare Workers compatibility issues
* **Solution**: Upgraded to `@auth/core@0.41.1` which resolved all compatibility problems
* **Status**: ✅ Complete Cloudflare Workers compatibility achieved

### Configuration
* **Application Type**: Regular Web Application (not SPA)
* **OAuth Providers**: Google and GitHub for initial launch
* **Session Management**: Server-side sessions with JWT tokens
* **Logout**: Federated logout with Auth0 Universal Login

### Integration Pattern
```typescript
// hooks.server.ts
import { SvelteKitAuth } from '@auth/sveltekit';
import Auth0 from '@auth/sveltekit/providers/auth0';

export const { handle } = SvelteKitAuth({
  providers: [Auth0({
    clientId: AUTH0_CLIENT_ID,
    clientSecret: AUTH0_CLIENT_SECRET,
    issuer: AUTH0_ISSUER
  })]
});
```

## Links

* [GitHub Issue #27: Authentication Solution Research](https://github.com/ZBlocker655/StudyPuck/issues/27)
* [GitHub Issue #15: Auth.js Cloudflare Workers Fix](https://github.com/ZBlocker655/StudyPuck/issues/15)
* [Auth Implementation Plan Spec](../../specs/auth-implementation-plan.md)
* [Auth0 Documentation](https://auth0.com/docs)
* [SvelteKit Auth Documentation](https://authjs.dev/reference/sveltekit)

## Migration Notes

* **No Migration Required**: Greenfield implementation
* **Environment Setup**: Auth0 tenant configuration with production and development applications
* **Security Configuration**: Proper callback URLs, CORS settings, and JWT configuration
* **Testing Strategy**: Local development with Auth0 development tenant, production with separate Auth0 app