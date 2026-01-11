# Authentication Implementation Plan

## Project Context
StudyPuck requires user authentication to enable personalized language learning experiences, card management, and progress tracking across devices. This analysis explores authentication service options and implementation patterns for the SvelteKit + Cloudflare Workers stack.

## ✅ RESOLVED: Cloudflare Workers Compatibility Issue
**Date**: January 11, 2026  
**Issue**: [#15](https://github.com/ZBlocker655/StudyPuck/issues/15) - `basePath?.replace is not a function` error in Cloudflare Workers  
**Solution**: Upgraded Auth.js from `@auth/core@0.34.3` to `@auth/core@0.41.1`  
**Status**: ✅ **COMPLETELY RESOLVED** - All environments working perfectly

## Authentication Service Decision

### ✅ Selected: Auth0

**Decision Date**: December 21, 2025

**Rationale**:
- Perfect fit for SvelteKit + Cloudflare Workers stack
- Stateless JWT approach aligns with edge computing
- Excellent SvelteKit integration via `@auth0/sveltekit-auth0`
- 7,500 user free tier sufficient for hobby project
- No database coupling - maintains D1 architecture choice
- Universal Login works well with PWA requirements

### Alternative Options Considered

#### Supabase Auth Free Tier  
- **Users**: 50,000 active users
- **Social providers**: 20+ providers included
- **Features**: Row Level Security, real-time subscriptions
- **Rejected**: Would require switching from Cloudflare D1 to Supabase database

#### Clerk Free Tier
- **Users**: 10,000 monthly active users
- **Social providers**: All major providers
- **Features**: Pre-built UI components, webhooks
- **Rejected**: React-first approach, less mature SvelteKit support

## Auth0 Configuration Design

### Application Type
✅ **Decision**: Regular Web Application

**Rationale**: Based on the project's use of SvelteKit with server-side rendering and server-side authentication handling (`@auth/sveltekit`), StudyPuck is defined as a **Regular Web Application** in the context of OAuth 2.0 and Auth0's configuration. It is **not** a Single Page Application (SPA). All Auth0 configuration must be based on the 'Regular Web Application' flow.

### Social Login Providers
✅ **Decision**: Google + GitHub for initial launch

**Rationale**:
- **Google**: Universal adoption, excellent for language learners
- **GitHub**: Developer-friendly, aligns with tech project audience
- **Simple setup**: Both have mature Auth0 integrations
- **Future expansion**: Facebook, Apple, Microsoft can be added later

**Auth0 Configuration**:
- Enable Google OAuth 2.0 connection
- Enable GitHub OAuth connection
- Configure appropriate scopes (profile, email)

### Application Configuration
✅ **Decision**: New Universal Login with basic branding

**Auth0 Free Tier Confirmation**: ✅ Yes, New Universal Login with basic branding is included in the free tier
- Logo upload: ✅ Free
- Color customization: ✅ Free  
- Basic text customization: ✅ Free
- Custom domain: ❌ Paid feature (not needed initially)

**Configuration**:
- Enable New Universal Login experience
- Upload StudyPuck logo
- Configure brand colors to match app
- Customize login/signup messaging for language learning context
- Default Auth0 subdomain (upgrade to custom domain later if needed)

### Token Configuration
✅ **Decision**: 24-hour access tokens with refresh tokens enabled, RS256 signing

**Token Settings**:
- **Access Token Lifetime**: 24 hours (good for study sessions)
- **Refresh Tokens**: ✅ Enabled for seamless re-authentication
- **Signing Algorithm**: RS256 (optimal for Cloudflare Workers validation)

**JWT Claims Discussion**:
**Standard Claims** (always included):
- `sub` (user_id): Unique user identifier
- `email`: User's email address
- `name`: Display name
- `iat`, `exp`, `aud`, `iss`: Token metadata

**Claims Analysis for StudyPuck**:
- ❌ **`locale`**: Not needed - no i18n planned for hobby version
- ❌ **`preferred_learning_language`**: User-changeable, better in DB + URL routing
- ❌ **`skill_level`**: User-changeable, would require JWT invalidation
- ❌ **`picture`**: Use Gravatar with email hash (free service)
- ✅ **`email_verified`**: Useful for security features and account verification
- ❌ **`onboarding_completed`**: No onboarding flow defined yet
- ❌ **`subscription_tier`**: No monetization model defined yet
- ❌ **`timezone`**: No study reminders in requirements

**JWT Flexibility**: ✅ Claims can be easily modified later without breaking existing tokens (tokens naturally expire and refresh)

**Final Claims Decision**: Keep minimal for now - just standards + `email_verified`

**Gravatar**: ✅ Free service - generate avatar URL from email hash in frontend/backend as needed

✅ **Final Decision**: Minimal JWT claims - standards + `email_verified` only

**Rationale**:
- **Locale**: No i18n planned for hobby version (future architecture exploration added)
- **Language preferences**: User-changeable, better in database + URL routing
- **Skill level**: User-changeable, would require JWT invalidation
- **Picture**: Use free Gravatar service with email hash
- **Email verified**: ✅ Useful for security and account verification
- **Onboarding/subscription/timezone**: Features not yet defined

**JWT Flexibility Confirmed**: ✅ Claims can be modified later without breaking existing tokens (they expire and refresh naturally)

### SvelteKit Integration Design

#### ✅ PRODUCTION READY: Auth.js v4.x with Cloudflare Workers

**Updated**: January 11, 2026  
**Implementation**: Auth.js (`@auth/sveltekit@1.11.1` + `@auth/core@0.41.1`)  
**Status**: ✅ **FULLY COMPATIBLE** - Cloudflare Workers issue resolved

**What Auth.js provides**:
- **Provider-neutral**: Supports 68+ OAuth providers including Auth0 as OpenID Connect
- **Edge-compatible**: Now confirmed working with Cloudflare Workers v0.41.1+
- **SvelteKit-native**: Official SvelteKit integration with proper hooks
- **Secure by default**: CSRF protection, secure cookies, minimal client JS

**How it works with Auth0**:
```javascript
// src/hooks.server.ts - WORKING CONFIGURATION
import { SvelteKitAuth } from '@auth/sveltekit';
import Auth0 from '@auth/core/providers/auth0';

export const { handle, signIn, signOut } = SvelteKitAuth({
  providers: [
    Auth0({
      clientId: getEnvVar('AUTH0_CLIENT_ID'),
      clientSecret: getEnvVar('AUTH0_CLIENT_SECRET'),
      issuer: getEnvVar('AUTH0_ISSUER'),
      authorization: { params: { audience: getEnvVar('AUTH0_AUDIENCE') } },
    }),
  ],
  secret: getEnvVar('AUTH_SECRET'),
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 }, // 7 days
  trustHost: true,
});
```

**Version Requirements** (CRITICAL):
- **@auth/core**: `0.41.1` or later (fixes basePath Cloudflare Workers bug)
- **@auth/sveltekit**: `1.11.1` (stable, compatible with core 0.41.1)

**Auth0 Configuration**:
- Configure Auth0 as OpenID Connect provider
- Callback URL: `https://studypuck.app/auth/callback/auth0`
- Standard OAuth credentials (client ID/secret)

✅ **Final Decision**: Auth.js (`@auth/sveltekit`) with Auth0 - **PRODUCTION READY**

## Implementation Architecture Questions

### Authentication Flow Implementation

✅ **Decision**: Auth0 Universal Login with custom trigger button

**Login UI Configuration**:
```javascript
// Custom button triggering Auth0 Universal Login
<button on:click={() => signIn('auth0')}>
  Sign in to StudyPuck
</button>
```

**Post-login routing**: ✅ Deferred - will be designed with user experience
- Default landing page: TBD (dashboard, cards, onboarding?)
- First-time vs returning users: TBD (depends on UX design)
- Can be configured later via `callbackUrl` parameter

**Error Handling**: Auth0 provides branded error pages in Universal Login flow
- **Authentication errors**: Handled by Auth0's error pages (branded with your config)
- **Network/technical errors**: Need custom error handling in SvelteKit
- **Auth.js errors**: Return to your app with error parameters

**Error handling implementation**:
```javascript
// Auth.js provides error info in callback
const result = await signIn('auth0', { redirect: false });
if (result?.error) {
  // Handle client-side errors (network, etc.)
  console.error('Auth error:', result.error);
}
```

**Next Questions**: Session and token management patterns with Auth.js

*Decision pending: How should Auth.js sessions be configured for StudyPuck's needs?*

### Session & Token Management

✅ **Decision**: JWT sessions for edge performance and simplicity

**Rationale**: You're absolutely right - using a 3rd party auth provider should minimize session management complexity. JWT sessions align with this principle:
- Auth0 handles user authentication and token issuance
- Auth.js handles session cookies and validation
- No custom session storage or management needed

**Auth.js Session Configuration**:
```javascript
export const { handle, signIn, signOut } = SvelteKitAuth(async (event) => {
  return {
    providers: [/* Auth0 config */],
    session: {
      strategy: "jwt",
      maxAge: 24 * 60 * 60, // 24 hours (matches Auth0 tokens)
      updateAge: 60 * 60, // Refresh session data hourly
    },
    secret: event.platform.env.AUTH_SECRET,
    trustHost: true
  }
})
```

**What Auth.js handles automatically**:
- Secure httpOnly cookies for session storage
- CSRF protection
- Session expiration and renewal
- Cross-domain session handling (if needed)
- Token refresh with Auth0

**What you don't need to build**:
- Custom session storage logic
- Manual token validation
- Session security implementation
- Cross-device session sync complexity

*Next: Database integration for user profiles*

### Database Integration for User Profiles

✅ **User Identification**: Auth0 user ID as primary key

**You're absolutely correct**: Auth0's unique user ID (`sub` claim in JWT) is the obvious and only reliable choice:
- **Social providers**: Email addresses can change or be shared across providers
- **Account linking**: Same user might use Google one day, GitHub another
- **Stability**: Auth0 user ID remains constant regardless of email changes
- **Uniqueness**: Guaranteed unique across all Auth0 users

**Database Schema**:
```sql
CREATE TABLE users (
  auth0_user_id TEXT PRIMARY KEY, -- from JWT 'sub' claim
  email TEXT NOT NULL,
  display_name TEXT,
  native_language TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

✅ **Profile Creation**: Auto-create on first authentication

**You're right again**: First login creates profile with defaults:
```javascript
// In SvelteKit load function
export async function load({ locals }) {
  const session = await locals.getSession();
  if (session?.user) {
    // Check if user exists, create if not
    const user = await getOrCreateUser(session.user.sub, {
      email: session.user.email,
      display_name: session.user.name,
      // Default settings
    });
  }
}
```

✅ **Data Isolation**: Application logic is the correct approach

**You're thinking correctly**: Row-level security through application logic:
- **All queries include user filter**: `WHERE auth0_user_id = ?`
- **API route protection**: Verify session before database access
- **No cross-user data leakage**: Every query scoped to authenticated user

**Performance Considerations**:
1. **User lookup frequency**: ✅ Standard security pattern - acceptable performance
2. **Card queries**: ✅ Non-issue - schema already partitioned by user/language  
3. **Progress tracking**: Out of scope for authentication
4. **Database indexes**: `CREATE INDEX idx_user_cards ON cards(auth0_user_id)` (likely redundant given partitioning)

**User lookup on every request**: ✅ This IS the typical secure app pattern
- **Standard approach**: Every authenticated request validates user and loads profile
- **Performance**: Acceptable with proper indexing (microseconds for primary key lookup)
- **Alternatives**: Storing user data in JWT session reduces DB hits for basic info
- **Security**: No way around user verification on protected operations

**You're right about schema partitioning** - card tables are already user/language partitioned, so performance concerns are minimal.

*All your architectural instincts are sound. Next question?*

### PWA Authentication Considerations

**PWA Auth Tutorial Context**:
**What's different about PWA auth**:
- **Installation**: PWAs run like native apps, users expect persistent login
- **Offline usage**: Core PWA feature, but auth typically requires network
- **Service workers**: Can intercept auth requests, cache authentication state
- **App-like behavior**: Users expect to stay logged in like mobile apps

**Technical challenges**:
1. **Token expiry offline**: What happens when JWT expires but user is offline?
2. **Auth state persistence**: Maintaining login across PWA sessions
3. **Network restoration**: Sync auth state when connectivity returns
4. **Security**: Safely caching auth tokens in service workers

**Auth.js + PWA patterns**:
- **Session cookies**: Auth.js uses httpOnly cookies (good for PWA security)
- **Service worker**: Can't access httpOnly cookies (security feature)
- **Client-side auth state**: Need separate mechanism for offline auth checks

✅ **Decision**: Extended sessions (7 days) + graceful degradation

**Rationale**: Low security risk for language learning app, prioritize user experience
- **Session duration**: 7 days instead of 24 hours
- **Offline handling**: Show "connect to sync progress" message when offline + expired
- **Security appropriate**: Not banking/financial - convenience over strict security

**Auth.js Configuration Update**:
```javascript
session: {
  strategy: "jwt",
  maxAge: 7 * 24 * 60 * 60, // 7 days for PWA experience
  updateAge: 24 * 60 * 60, // Refresh daily when online
}
```

**PWA Implementation**:
- **Service worker**: Cache study content for offline use
- **Auth check**: Graceful degradation when sessions expire offline
- **Sync**: Progress uploads when connectivity restored

*All authentication architecture questions completed ✅*

## Security Requirements

### Token Security
- Secure token storage and transmission
- HTTPS-only in production
- Token expiration and rotation

### User Data Protection
- GDPR compliance for European users
- Data minimization principles
- Secure user data deletion

### API Security
- Authenticated API endpoints
- Rate limiting per user
- Input validation and sanitization

## Next Steps
1. ✅ **Service Selection**: Auth0 chosen
2. **Auth0 Configuration**: Set up tenant, configure social providers
3. **SvelteKit Integration**: Implement `@auth0/sveltekit-auth0` SDK
4. **Cloudflare Workers Auth**: Design JWT validation patterns
5. **Database Integration**: User profile management in D1
6. **Security Implementation**: Token handling and validation
7. **User Experience**: Design login/signup flows and error handling

## Decision Framework
- **Cost**: Free tier limits vs expected user growth
- **Developer Experience**: Integration complexity and documentation
- **Feature Completeness**: Social providers, security features, customization
- **Stack Compatibility**: How well it works with SvelteKit + Cloudflare
- **Future Flexibility**: Migration paths if requirements change

---
*Next: Service selection and detailed integration design*