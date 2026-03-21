# StudyPuck Documentation

**Purpose**: Central hub for all StudyPuck project documentation.

## 📂 Documentation Structure

### **Requirements & Specifications**
- **[requirements/](./requirements/)** - Application requirements and user stories
- **[specs/](./specs/)** - Technical specifications and architecture analysis

### **Operational Documentation** 
- **[ops/](./ops/)** - Operational procedures for development, deployment, and maintenance
- **[decisions/](./decisions/)** - Architectural Decision Records (ADRs) for major technical decisions

## 🎯 Quick Navigation

### **For Developers**
- **Getting Started**: See [ops/README.md](./ops/README.md) for operational procedures
- **Database Setup**: [ops/database-branching-guide.md](./ops/database-branching-guide.md)
- **Environment Configuration**: [ops/environment-setup.md](./ops/environment-setup.md)
- **Remote Development**: [ops/remote-development.md](./ops/remote-development.md)
- **Development Workflows**: [interactive](./ops/interactive-development.md) | [manual](./ops/manual-development.md)

### **For AI Agents**  
- **Agent Procedures**: [ops/autonomous-ai-development.md](./ops/autonomous-ai-development.md)
- **Database Requirements**: [ops/database-branching-guide.md](./ops/database-branching-guide.md)
- **Troubleshooting**: [ops/troubleshooting.md](./ops/troubleshooting.md)

### **For Architecture Understanding**
- **Technical Decisions**: [decisions/README.md](./decisions/README.md)
- **Database Platform**: [decisions/2026/004-database-neon-postgres.md](./decisions/2026/004-database-neon-postgres.md)
- **Authentication**: [decisions/2025/003-auth-auth0-integration.md](./decisions/2025/003-auth-auth0-integration.md)
- **Tech Stack**: [decisions/2025/002-sveltekit-cloudflare-stack.md](./decisions/2025/002-sveltekit-cloudflare-stack.md)

## 📋 Documentation Types

### **Requirements (requirements/)**
- **Functional Requirements**: What the application should do
- **User Stories**: User-centered feature descriptions
- **Acceptance Criteria**: Testable requirements validation

### **Specifications (specs/)**
- **Architecture Analysis**: Technical design decisions and trade-offs
- **Implementation Plans**: Detailed implementation strategies
- **Technology Research**: Analysis of technology choices

### **Operations (ops/)**
- **Procedures**: Step-by-step operational workflows
- **Configuration**: Environment and deployment setup
- **Troubleshooting**: Common issues and solutions

### **Decisions (decisions/)**
- **ADRs**: Architectural Decision Records documenting major technical choices
- **Context**: Why decisions were made and what alternatives were considered  
- **Consequences**: Trade-offs and implications of decisions

## 🔍 Finding Information

### **Common Questions**

**"How do I set up the database?"**
→ [ops/database-branching-guide.md](./ops/database-branching-guide.md)

**"How do environment variables work?"**
→ [ops/environment-setup.md](./ops/environment-setup.md)

**"What's our development workflow?"**
→ [ops/interactive-development.md](./ops/interactive-development.md) (interactive), [ops/manual-development.md](./ops/manual-development.md) (manual), or [ops/autonomous-ai-development.md](./ops/autonomous-ai-development.md) (agents)

**"Why did we choose Neon Postgres?"**
→ [decisions/2026/004-database-neon-postgres.md](./decisions/2026/004-database-neon-postgres.md)

**"How does authentication work?"**
→ [decisions/2025/003-auth-auth0-integration.md](./decisions/2025/003-auth-auth0-integration.md)

**"I'm having issues with X"**
→ [ops/troubleshooting.md](./ops/troubleshooting.md)

### **Search Strategy**
```bash
# Search all documentation
grep -r "search term" docs/

# Search specific document types
grep -r "database" docs/ops/        # Operational procedures
grep -r "postgres" docs/decisions/  # Architectural decisions
grep -r "auth" docs/specs/          # Technical specifications
```

## 📝 Contributing to Documentation

### **Adding New Documentation**
- **Requirements**: Add to `requirements/` directory
- **Specifications**: Add to `specs/` directory  
- **Procedures**: Add to `ops/` directory
- **Decisions**: Follow ADR template in `decisions/README.md`

### **Documentation Standards**
- **Markdown Format**: All documentation in Markdown for version control
- **Clear Titles**: Descriptive titles that indicate purpose and scope
- **Table of Contents**: For longer documents (>2 pages)
- **Code Examples**: Include working code snippets where relevant
- **Links**: Cross-reference related documentation

### **Review Process**
- **Include in PRs**: Documentation changes reviewed alongside code
- **Keep Updated**: Update documentation when architectural changes occur
- **Validate Links**: Ensure internal links work correctly

---

**Last Updated**: February 2, 2026  
**Maintainer**: StudyPuck Development Team
