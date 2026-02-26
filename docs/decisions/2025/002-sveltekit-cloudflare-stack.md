# ADR-002: Frontend Framework and Deployment Stack

**Date:** 2025-11-21  
**Status:** Accepted  
**Deciders:** @ZBlocker655  
**Technical Story:** Derived from [SvelteKit Analysis](../specs/sveltekit-analysis.md) and [DevOps Environment Analysis](../specs/devops-environment-analysis.md)

## Context and Problem Statement

StudyPuck requires a modern frontend framework and deployment strategy that supports server-side rendering, progressive enhancement, efficient development workflows, and edge deployment. The application needs to handle language learning card interactions, user authentication, and potentially real-time features while maintaining excellent performance and developer experience.

## Decision Drivers

* **Developer Experience**: Modern development workflow with hot reload, TypeScript support, and excellent tooling
* **Performance**: Fast page loads, efficient bundling, and optimal Core Web Vitals
* **Edge Deployment**: Must work efficiently in Cloudflare Workers/Pages environment
* **Progressive Enhancement**: Application should work with and without JavaScript
* **Type Safety**: Full TypeScript support throughout the stack
* **Authentication Integration**: Must work well with Auth.js and Auth0
* **Database Integration**: Seamless integration with Drizzle ORM and Neon Postgres
* **Future Scalability**: Support for potential real-time features and PWA capabilities

## Considered Options

* **Option 1**: SvelteKit + Cloudflare Pages
* **Option 2**: Next.js + Vercel
* **Option 3**: Nuxt.js + Cloudflare Pages  
* **Option 4**: Astro + Cloudflare Pages
* **Option 5**: Remix + Cloudflare Pages

## Decision Outcome

**Chosen option:** **SvelteKit + Cloudflare Pages**, because it provides excellent developer experience, optimal performance for the use case, native edge deployment compatibility, and aligns perfectly with the serverless architecture requirements.

### Positive Consequences

* **Excellent Performance**: Svelte's compiled approach results in minimal runtime overhead
* **Great Developer Experience**: Intuitive syntax, excellent TypeScript support, fast hot reload
* **Edge-Native**: SvelteKit adapter-cloudflare provides seamless Cloudflare Workers integration
* **Progressive Enhancement**: Built-in support for working without JavaScript
* **Flexible Routing**: File-based routing with support for both SSR and SPA modes
* **Small Bundle Size**: Svelte's compilation approach minimizes JavaScript payload
* **Active Ecosystem**: Growing community with excellent third-party integrations

### Negative Consequences

* **Smaller Ecosystem**: Fewer third-party components compared to React ecosystem
* **Learning Curve**: Different mental model compared to React-style frameworks
* **Less Enterprise Adoption**: Smaller community in enterprise environments

## Pros and Cons of the Options

### Option 1: SvelteKit + Cloudflare Pages ✅

* Good, because Svelte's compiled approach delivers excellent runtime performance
* Good, because intuitive and productive developer experience
* Good, because excellent TypeScript integration out of the box
* Good, because SvelteKit adapter-cloudflare provides seamless edge deployment
* Good, because progressive enhancement is built into the framework philosophy
* Good, because small bundle sizes improve page load performance
* Good, because file-based routing aligns with mental model for card-based application
* Bad, because smaller third-party component ecosystem compared to React
* Bad, because less familiar to developers coming from React background
* Bad, because potentially more challenging to find developers if project scales

### Option 2: Next.js + Vercel

* Good, because largest ecosystem and community support
* Good, because excellent developer tooling and documentation
* Good, because mature authentication integrations (Auth.js native)
* Good, because proven at scale for enterprise applications
* Bad, because vendor lock-in to Vercel for optimal performance
* Bad, because more complex than needed for StudyPuck's requirements
* Bad, because React's runtime overhead vs. Svelte's compiled approach
* Bad, because would require migration away from Cloudflare ecosystem

### Option 3: Nuxt.js + Cloudflare Pages

* Good, because Vue's progressive enhancement philosophy
* Good, because excellent developer experience and tooling
* Good, because strong TypeScript support
* Bad, because Vue 3 Composition API learning curve
* Bad, because Cloudflare Workers adapter less mature than SvelteKit's
* Bad, because larger bundle sizes than Svelte approach

### Option 4: Astro + Cloudflare Pages

* Good, because island architecture with minimal JavaScript
* Good, because excellent performance for content-heavy sites
* Good, because can integrate components from multiple frameworks
* Bad, because primarily optimized for static sites, not interactive applications
* Bad, because less suitable for dynamic language learning interactions
* Bad, because authentication and database integration more complex

### Option 5: Remix + Cloudflare Pages

* Good, because excellent data loading patterns and progressive enhancement
* Good, because strong TypeScript support and developer experience
* Good, because React ecosystem benefits
* Bad, because Cloudflare Workers support still maturing
* Bad, because more complex than needed for StudyPuck's scale
* Bad, because React runtime overhead vs. compiled Svelte approach

## Technical Implementation Details

### SvelteKit Configuration
```typescript
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    })
  }
};
```

### Cloudflare Pages Integration
* **Deployment**: Automatic deployments from GitHub main branch
* **Environment**: Serverless functions for API routes and authentication
* **Performance**: Edge deployment for global low-latency access
* **Scalability**: Auto-scaling with pay-per-request pricing model

### Authentication Integration
```typescript
// hooks.server.ts - Auth.js integration
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

### Database Integration
```typescript
// Database queries in +page.server.ts
import { db } from '@studypuck/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getSession();
  if (!session?.user) throw redirect(302, '/auth/signin');
  
  const cards = await db.select().from(cardsTable)
    .where(eq(cardsTable.userId, session.user.id));
    
  return { cards };
};
```

## Performance Characteristics

**Core Web Vitals Optimization**:
- **LCP**: Server-side rendering ensures fast initial content
- **FID**: Minimal JavaScript reduces interaction latency
- **CLS**: Progressive enhancement prevents layout shift

**Bundle Size**:
- **Base Framework**: ~10kb (compiled Svelte runtime)
- **Route-based Splitting**: Automatic code splitting per route
- **Minimal Dependencies**: Svelte's compilation eliminates many runtime dependencies

**Edge Performance**:
- **Global CDN**: Cloudflare's edge network for worldwide deployment
- **Server Functions**: Cloudflare Workers for dynamic content
- **Caching**: Intelligent static asset caching with dynamic content support

## Future Evolution Path

### Progressive Web App (PWA)
- Service worker integration for offline card study
- Background sync for study progress
- App-like installation experience

### Real-time Features (Future)
- WebSocket support for collaborative study sessions
- Real-time progress tracking across devices
- Live study session sharing

### Mobile Applications (Future)
- Shared business logic between web and mobile via monorepo
- Svelte Native or Capacitor for mobile app development
- Consistent UI components across platforms

## Links

* [SvelteKit Documentation](https://kit.svelte.dev/)
* [SvelteKit Analysis Spec](../../specs/sveltekit-analysis.md)
* [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
* [DevOps Environment Analysis](../../specs/devops-environment-analysis.md)
* [Auth.js SvelteKit Integration](https://authjs.dev/reference/sveltekit)
* [ADR-003: Authentication Decision](./003-auth-auth0-integration.md)

## Implementation Status

* ✅ **SvelteKit Setup**: Configured with TypeScript and Vite
* ✅ **Cloudflare Adapter**: Deployed and working on studypuck.app
* ✅ **Authentication**: Auth.js + Auth0 integration complete
* ✅ **Database Integration**: Drizzle ORM working with server routes
* ✅ **Build Pipeline**: Turborepo orchestration with linting and type checking
* ⏳ **Progressive Enhancement**: Planned improvements for no-JavaScript functionality
* ⏳ **PWA Features**: Future implementation of service workers and offline support