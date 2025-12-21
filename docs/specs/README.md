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

### 🔄 In Progress Explorations
**AI Integration Architecture** 🤖 *Active*
- File: `ai-integration-architecture.md` (in progress)
- Scope: Drill complexity, prompt engineering, caching strategy
- Questions: Translation sophistication, context generation, API rate limiting

### 📋 Pending Explorations (Priority Order)

#### Phase 1: Backend Architecture Finalization
1. **Authentication Implementation** 🔐
   - File: `auth-implementation-plan.md` (to be created)
   - Scope: Auth0 integration, user session management, security patterns
   - Questions: Social login flow, session persistence, role management

#### Phase 2: Frontend & Development Environment
3. **Monorepo Structure Design** 📁
   - File: `monorepo-structure-design.md` (to be created)
   - Scope: Folder organization, shared packages, build tooling coordination
   - Questions: Package management, shared types/utilities, deployment strategies per app

4. **CSS Architecture & Methodology** 📝
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

8. **Performance & Monitoring** 📈
   - File: `performance-monitoring-plan.md` (to be created)
   - Scope: Performance metrics, error tracking, user analytics
   - Questions: Monitoring tools, alerting, optimization strategies

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
**Immediate focus**: AI Integration Architecture - Design prompt engineering strategies, caching layers, and API integration patterns for translation drill generation and card review assistance.
