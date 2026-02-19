# StudyPuck Operations Documentation

**Purpose**: Operational procedures for all development scenarios and interaction patterns.

## 📋 Documentation Index

### **Core Infrastructure**
- [Database Branching Guide](./database-branching-guide.md) - Complete database branch management workflow
- [Environment Setup](./environment-setup.md) - Environment variable configuration across all platforms
- [GitHub Actions Setup](./github-actions-setup.md) - CI/CD pipeline configuration and troubleshooting

### **Development Interaction Patterns** 
- [Interactive Development](./interactive-development.md) - Human directing AI in local sessions (like Copilot CLI)
- [Autonomous AI Development](./autonomous-ai-development.md) - AI agents working independently on assigned issues
- [Manual Development](./manual-development.md) - Human developers working independently
- [Production Deployment](./production-deployment.md) - Safe deployment procedures with database migrations

### **Troubleshooting & Maintenance**
- [Troubleshooting Guide](./troubleshooting.md) - Common issues and solutions

## 🎯 **How to Choose the Right Workflow:**

### **Interactive Development** (This Session!)
- **Scenario**: Human working with AI assistant in real-time (Copilot CLI, ChatGPT, etc.)
- **Control**: Human directs, AI executes
- **Database**: Use development branch, human manages branching decisions
- **Example**: "Create a migration for the users table"

### **Autonomous AI Development** 
- **Scenario**: AI agent assigned to GitHub issue, works independently
- **Control**: AI manages entire workflow start to finish
- **Database**: AI creates feature branches, follows strict automated procedures
- **Example**: GitHub Copilot assigned to Issue #35

### **Manual Development**
- **Scenario**: Human developer working alone without AI assistance
- **Control**: Human does everything manually
- **Database**: Human creates branches, runs migrations, manages workflow
- **Example**: Traditional software development

## 🚨 **Current Session Type: INTERACTIVE DEVELOPMENT** ✅

## 🚨 Quick Reference

### **Emergency Procedures**
- **Broken main branch**: Revert via PR, never force push
- **Failed deployment**: Check Cloudflare Pages dashboard and GitHub Actions logs  
- **Database issues**: Use direct connection strings for migrations
- **Migration conflicts**: See [Troubleshooting Guide](./troubleshooting.md)

### **Key Principles**
- **"Last Possible Moment" migrations**: Development branch stays clean until production deployment
- **Feature isolation**: Use database branches for schema changes
- **Direct connections**: Required for reliable migration tracking
- **No manual deployment**: Everything automated via GitHub Actions + Cloudflare

## 📚 Documentation Standards

### **For Human Developers**
- Step-by-step procedures with clear decision points
- Environment-specific instructions
- Troubleshooting steps for common issues

### **For AI Agents**
- Precise command sequences and expected outputs
- Clear branching logic and conditionals
- Error handling procedures
- Automated cleanup instructions

---

**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: Production Ready