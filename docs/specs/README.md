# StudyPuck Architecture Project

## Project Status: Architecture Design Phase
**Last Updated**: December 21, 2025  
**Current Phase**: Backend architecture finalization and AI integration design

## Project Context
StudyPuck is a hobby project focused on language learning through AI-powered translation drills and spaced repetition cards. The goal is to build a multi-platform application (web-first, then desktop/mobile) with minimal operating costs while learning modern development technologies.

## Architecture Exploration Agenda

### ✅ Completed Explorations
1. **Cross-Platform Strategy** → [cross-platform-analysis.md](cross-platform-analysis.md)
   - **Decision**: Start with PWA approach, evaluate Tauri for desktop later
   
2. **AI Service Selection** → [ai-service-analysis.md](ai-service-analysis.md)
   - **Decision**: Google Gemini Flash (primary), GPT-4o-mini (secondary)
   
3. **Data Architecture Foundation** → [data-architecture-analysis.md](data-architecture-analysis.md)
   - **Decision**: Cloudflare D1 + KV hybrid approach
   
4. **SvelteKit Evaluation** → [sveltekit-analysis.md](sveltekit-analysis.md)
   - **Decision**: Use SvelteKit for routing, SSR, and API organization
   
5. **DevOps & Development Environment** → [devops-environment-analysis.md](devops-environment-analysis.md)
   - **Decision**: GitHub Codespaces + Cloudflare Pages direct integration

6. **Database Schema Design** → [database-schema-design.md](database-schema-design.md)
   - **Decision**: Multi-application SRS architecture with JSON flexibility
   - **Artifacts**: Complete schema in [database-schema-draft.sql](database-schema-draft.sql)

7. **AI Integration Architecture** → [ai-integration-architecture.md](ai-integration-architecture.md)
   - **Decision**: Batch caching with rotation-based card selection and CEFR personalization
   - **Approach**: Cost-optimized with vendor flexibility and universal templates

8. **Authentication Implementation** → [auth-implementation-plan.md](auth-implementation-plan.md)
   - **Decision**: Auth0 (OIDC) + Auth.js + 7-day PWA sessions

9. **Monorepo Structure Design** → [monorepo-structure-design.md](monorepo-structure-design.md)
   - **Decision**: Standard monorepo with PNPM workspaces + Turborepo

10. **CSS Architecture & Methodology** → [css-architecture-analysis.md](css-architecture-analysis.md)
    - **Decision**: Progressive design system + CUBE CSS + dark mode + selective animations

### 🔄 In Progress Explorations
**Testing Strategy & Database Operations** 🧪 *Next*
- File: `testing-database-strategy.md` (to be created)
- Scope: Unit/integration testing patterns, test database spawning, schema migrations
- Questions: Modern test database strategies, migration tooling, CI/CD integration

### 📋 Pending Explorations (Priority Order)

#### Phase 1: Backend Architecture Finalization

#### Phase 2: Frontend & Development Environment
*2 topics completed, 3 remaining*

1. ✅ **Monorepo Structure Design** → [monorepo-structure-design.md](monorepo-structure-design.md)
   - **Decision**: Standard monorepo with PNPM workspaces + Turborepo

2. ✅ **CSS Architecture & Methodology** → [css-architecture-analysis.md](css-architecture-analysis.md)
   - **Decision**: Progressive design system + CUBE CSS + dark mode + selective animations

3. **Testing Strategy & Database Operations** 🧪
   - File: `css-architecture-analysis.md` (to be created)
   - Scope: CUBE CSS evaluation, modern CSS features, responsive design patterns
   - Questions: Container queries, view transitions, logical properties

5. **Testing Strategy & Database Operations** 🧪
   - File: `testing-database-strategy.md` (to be created)
   - Scope: Unit/integration testing patterns, test database spawning, schema migrations
   - Questions: Modern test database strategies, migration tooling, CI/CD integration

6. **Development Environment Setup** 💻
   - File: `development-setup-guide.md` (to be created)
   - Scope: Codespaces configuration, local fallback, tooling choices
   - Questions: Container specification, VS Code extensions, debugging setup

7. **Deployment Pipeline Design** 🚀
   - File: `deployment-pipeline-design.md` (to be created)
   - Scope: CI/CD workflow, environment management, rollback strategies
   - Questions: Testing integration, staging environments, monitoring

#### Phase 3: Advanced Features
8. **Offline Strategy Implementation** 📱
   - File: `offline-strategy-implementation.md` (to be created)
   - Scope: Service worker design, sync patterns, conflict resolution
   - Questions: Cache strategies, background sync, user experience

9. **Performance & Monitoring** 📈
   - File: `performance-monitoring-plan.md` (to be created)
   - Scope: Performance metrics, error tracking, user analytics
   - Questions: Monitoring tools, alerting, optimization strategies

10. **Internationalization Architecture** 🌐
    - File: `internationalization-architecture.md` (to be created)
    - Scope: Future i18n support, locale handling, RTL languages, content management
    - Questions: SvelteKit i18n patterns, URL structure, translation workflows

11. **Monetization Architecture** 💰
    - File: `monetization-architecture.md` (to be created)
    - Scope: Future subscription tiers, payment processing, feature gating
    - Questions: Stripe integration, freemium models, usage tracking

## Current Recommended Stack
Based on completed explorations:

- **Frontend**: SvelteKit + TypeScript + Pure CSS
- **Backend**: Cloudflare Workers + D1 + KV
- **AI**: Google Gemini Flash (proxied through Workers)
- **Auth**: Auth0 (free tier with social logins)
- **Development**: GitHub Codespaces
- **Deployment**: Cloudflare Pages (direct GitHub integration)
- **Cross-platform**: PWA initially, Tauri for desktop later
- **Project Structure**: Monorepo with extensible folder structure for web/desktop/mobile apps

## Key Decisions Made
- ✅ Multi-platform via PWA approach first
- ✅ Cost-optimized Cloudflare-centric stack
- ✅ AI-powered translation drills with commercial LLM
- ✅ Relational database with full-text search (no vector search initially)
- ✅ Modern CSS without preprocessors
- ✅ Simplified deployment pipeline

## Context Restoration Guide
To restore context after window refresh:
1. Read this file for current status
2. Review completed exploration files for detailed decisions
3. Check the "Next up" exploration for current focus
4. **Read functional requirements** in `docs/requirements/` for complete feature context
5. Reference [architecture-requirements.md](architecture-requirements.md) for foundational requirements

## Next Action
**Immediate focus**: Authentication Implementation - Design Auth0 integration patterns, session management, and security architecture for multi-user StudyPuck deployment.
