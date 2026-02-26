# ADR-004: Database Platform: Neon Postgres

**Date:** 2026-01-12  
**Status:** Accepted  
**Deciders:** @ZBlocker655  
**Technical Story:** [GitHub Issue #29](https://github.com/ZBlocker655/StudyPuck/issues/29)

## Context and Problem Statement

StudyPuck initially planned to use Cloudflare D1 as the database layer. However, the application may require vector search capabilities for enhanced language learning features (RAG, semantic search for cards). Additionally, as a learning project, using industry-standard technology stacks provides better professional development value.

## Decision Drivers

* **Vector Search Requirements**: Potential need for pgvector support for RAG and semantic card search
* **Industry Trends**: Postgres gaining momentum as preferred database for modern applications
* **Learning Value**: Professional development benefits of Postgres experience
* **Serverless Architecture**: Must align with existing serverless deployment strategy
* **Database Branching**: Need for isolated environments for testing and development
* **Cost Considerations**: Free tier adequacy for hobby project scale

## Considered Options

* **Option 1**: Continue with Cloudflare D1 + external vector database
* **Option 2**: Neon Postgres (serverless Postgres with branching)
* **Option 3**: Supabase Postgres (with integrated auth)
* **Option 4**: Traditional cloud Postgres (AWS RDS, Google Cloud SQL)

## Decision Outcome

**Chosen option:** **Neon Postgres**, because it provides native pgvector support, database branching capabilities, aligns with serverless architecture, and offers excellent developer experience for a learning project.

### Positive Consequences

* **pgvector Support**: Native vector search capabilities without external dependencies
* **Database Branching**: Isolated environments for development, testing, and feature work
* **Serverless**: Auto-scaling, pay-per-use billing model suitable for hobby projects
* **Industry Standard**: Postgres skills are broadly applicable and valuable
* **Developer Experience**: Excellent tooling, familiar SQL interface
* **Future-Proof**: Can easily migrate to other Postgres providers if needed

### Negative Consequences

* **Learning Curve**: More complex than D1 for simple operations
* **Cost Uncertainty**: Beyond free tier, costs may be higher than D1
* **Network Latency**: External database vs. Cloudflare's edge-integrated D1
* **Vendor Lock-in**: Neon-specific features (branching) create some dependency

## Pros and Cons of the Options

### Option 1: Continue with Cloudflare D1

* Good, because fully integrated with Cloudflare ecosystem
* Good, because minimal latency (edge database)
* Good, because very generous free tier
* Bad, because no native vector search support
* Bad, because would require external vector database for RAG features
* Bad, because less industry-standard learning value

### Option 2: Neon Postgres ✅

* Good, because native pgvector support for future RAG features
* Good, because database branching for isolated development environments
* Good, because serverless architecture with auto-scaling
* Good, because industry-standard Postgres with broad applicability
* Good, because excellent developer tooling and ecosystem
* Bad, because potential higher costs beyond free tier
* Bad, because external dependency (not Cloudflare-native)
* Bad, because additional network latency vs. edge database

### Option 3: Supabase Postgres

* Good, because Postgres with integrated auth and real-time features
* Good, because generous free tier (50k users)
* Good, because excellent developer experience
* Bad, because would conflict with Auth0 authentication decision
* Bad, because less flexibility in architecture choices
* Bad, because vendor lock-in to Supabase ecosystem

### Option 4: Traditional Cloud Postgres

* Good, because maximum control and flexibility
* Good, because can optimize for performance and cost
* Bad, because manual scaling and management overhead
* Bad, because no database branching capabilities
* Bad, because not aligned with serverless development workflow

## Links

* [GitHub Issue #29: Database Architecture Research](https://github.com/ZBlocker655/StudyPuck/issues/29)
* [Neon Documentation](https://neon.tech/docs)
* [pgvector Documentation](https://github.com/pgvector/pgvector)
* [Database Schema Design Spec](../../specs/database-schema-design.md)
* [Data Architecture Analysis](../../specs/data-architecture-analysis.md)

## Implementation Notes

* **Migration Strategy**: Direct implementation (no existing D1 data to migrate)
* **Schema Management**: Using Drizzle ORM for type-safe schema definition
* **Connection Strategy**: Direct connections for migrations, pooled for runtime (see [ADR-005](../2026/005-database-connection-strategy.md))
* **Environment Strategy**: Database branching for feature isolation and testing