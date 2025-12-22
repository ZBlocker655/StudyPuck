# StudyPuck Learning Plan

**Created**: December 21, 2025  
**Purpose**: Track learning areas identified during architecture design phase

**Note**: Learning will happen during development phase or outside this architecture process. This document prevents forgetting identified learning opportunities.

## Authentication & Security 🔐

### OAuth 2.0 / OpenID Connect Fundamentals
**Why needed**: Using Auth0 as OpenID Connect provider with Auth.js
**Learning goals**:
- Understand OAuth 2.0 authorization flow
- Difference between OAuth 2.0 and OpenID Connect
- JWT token structure and validation
- Redirect URLs and callback handling
- Security best practices (PKCE, state parameters)

**Resources to explore**:
- Auth0 documentation on OpenID Connect
- OAuth 2.0 simplified explanations
- JWT.io for token inspection

### Auth.js Configuration & Patterns
**Why needed**: Using `@auth/sveltekit` for provider-neutral authentication
**Learning goals**:
- Auth.js provider configuration
- SvelteKit hooks integration (`hooks.server.ts`)
- Session management patterns
- Custom provider setup (Auth0 as OIDC)
- Environment variable handling in edge functions

**Resources to explore**:
- Auth.js official documentation
- SvelteKit Auth.js examples
- Cloudflare Workers + Auth.js tutorials

### SvelteKit Session Management
**Why needed**: Managing user state across application
**Learning goals**:
- SvelteKit load functions and auth checks
- Server vs client-side authentication
- Route protection patterns
- Session persistence and expiration
- SSR considerations for authenticated content

### Cloudflare Workers Security
**Why needed**: Deploying authentication on edge runtime
**Learning goals**:
- Environment variables in Cloudflare Workers
- Secrets management best practices
- Edge-compatible cryptography libraries
- CORS handling for authentication
- Production deployment security

## Future Architecture Topics 🏗️

### Internationalization (i18n)
**Why added**: Future monetization may require multiple languages
**Learning goals**:
- SvelteKit i18n patterns and libraries
- URL structure for multi-language apps (`/en/`, `/fr/`)
- RTL language support considerations
- Content management for translations
- SEO implications of internationalization

### Monetization Architecture
**Why added**: Future subscription model considerations
**Learning goals**:
- Stripe integration patterns
- Freemium vs subscription models
- Feature gating in SvelteKit
- Usage tracking and analytics
- Payment webhooks and security
- European tax compliance (VAT)

## Development Environment 💻

### Modern CSS Architecture
**Why needed**: Choosing styling approach for StudyPuck
**Learning goals**:
- CUBE CSS methodology evaluation and implementation
- Progressive design system development patterns
- CSS custom properties for theming and dark mode
- Modern CSS features (container queries, logical properties)
- CSS transitions and performance-optimized animations
- Accessibility considerations (reduced motion, color contrast)
- Responsive design patterns and mobile-first approach

### CSS Custom Properties & Theming
**Why needed**: Dark mode implementation and design system consistency
**Learning goals**:
- CSS custom properties (variables) mastery
- Dynamic theming with CSS and JavaScript
- System preference detection (`prefers-color-scheme`)
- Local storage for theme persistence
- Accessibility in dark mode design (contrast ratios)

### Animation & Interaction Design
**Why needed**: Selective animations for enhanced UX
**Learning goals**:
- CSS transitions and transform performance optimization
- View Transitions API exploration (cutting-edge)
- Micro-interactions and hover states
- Loading states and skeleton screens
- Accessibility with `prefers-reduced-motion`
- 60fps animation techniques (transform/opacity only)

### Monorepo & Build Tools
**Why needed**: Implementing PNPM + Turborepo monorepo structure
**Learning goals**:
- Turborepo configuration and pipeline setup
- PNPM workspaces management
- Build caching and optimization strategies
- Monorepo development workflows
- Package dependency management across workspace

### Testing Strategies
**Why needed**: Ensuring application quality and database operations
**Learning goals**:
- Modern test database strategies
- Unit vs integration testing patterns
- SvelteKit testing approaches
- Cloudflare Workers testing
- Database schema migration testing
- AI service mocking for tests

## Learning Priority Queue

### High Priority (Architecture Dependencies)
1. **OAuth 2.0/OpenID Connect** - Needed for auth implementation
2. **Auth.js patterns** - Needed for SvelteKit integration
3. **CSS Architecture & Design Systems** - Needed for UI development
4. **CSS Custom Properties & Theming** - Needed for dark mode implementation
5. **Animation & Interaction Design** - Needed for enhanced UX
6. **Turborepo & PNPM** - Needed for monorepo implementation

### Medium Priority (Development Quality)
7. **Testing strategies** - Needed before major development
8. **Cloudflare Workers security** - Needed for production deployment

### Low Priority (Future Features)
9. **Internationalization** - Future monetization consideration
10. **Monetization patterns** - Future business model

## Learning Resources

### Bookmarked for Later
- Auth.js SvelteKit documentation
- Cloudflare Workers security guide
- CUBE CSS methodology guide
- CSS custom properties and theming patterns
- Modern CSS animation techniques and accessibility
- View Transitions API documentation
- Modern testing patterns for SvelteKit
- Turborepo documentation and examples
- PNPM workspaces guide

### Community Resources
- SvelteKit Discord for auth questions
- Auth.js GitHub discussions
- Cloudflare Workers community examples

---
*This document will be updated as new learning areas are identified during development*