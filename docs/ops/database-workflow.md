# Database Workflow Documentation

**Purpose**: Developer workflow guide for StudyPuck database operations using Drizzle ORM and Neon Postgres.

## 🚀 **Quick Start**

### **Development Workflow**
```bash
# Generate new migration after schema changes
pnpm db:generate:secure

# Apply migrations to development database  
pnpm db:migrate:secure

# Open Drizzle Studio for visual inspection
pnpm db:studio:secure
```

### **From Web Application**
```bash
# From project root, use the secure wrappers
pnpm db:migrate:secure
pnpm db:studio:secure
```

## 📋 **Migration Workflow**

### **1. Schema Changes**
```typescript
// Edit packages/database/src/schema.ts
export const newTable = pgTable('new_table', {
  id: text('id').primaryKey(),
  // ... your columns
});
```

### **2. Generate Migration**
```bash
pnpm db:generate:secure
```

### **3. Review Generated Migration**
- Check `packages/database/migrations/XXXX_migration_name.sql`
- Verify SQL statements are correct
- Review any manual modifications needed

### **4. Apply Migration**
```bash
# Apply to development database
pnpm db:migrate:secure

# Verify with Drizzle Studio
pnpm db:studio:secure
```

## 🧪 **Testing Migrations**

### **Validate Schema Sync**
```bash
# Check if schema matches database
pnpm migrate:check
```

### **Push Schema (Development Only)**
```bash
# Push schema changes without migration (dev only!)
pnpm migrate:push
```

## 🔬 **Database Testing Infrastructure**

### **Quick Reference**

```bash
cd packages/database

# Start Docker test database
pnpm test:setup

# Run all database integration tests (Docker)
pnpm test

# Run in watch mode during development
pnpm test:watch

# Run ephemeral Neon tests (requires NEON_TEST_DATABASE_URL)
pnpm test:neon

# Stop and remove test database
pnpm test:cleanup
```

### **Two-Tier Testing Strategy**

| Test Type | File Pattern | Database | Runs In |
|---|---|---|---|
| Integration (permanent) | `*.test.ts` | Docker Compose | Every CI push |
| Real-world validation (ephemeral) | `*-issue-N.neon.test.ts` | Neon branch | Manual / on-demand |

See [Database Branching Guide](./database-branching-guide.md#testing-strategy) for full details on the ephemeral Neon test lifecycle, naming conventions, and the CI enforcement script.

## ⚠️ **Best Practices**

### **Migration Guidelines**
- ✅ **Always review** generated migrations before applying
- ✅ **Test migrations** on development database first
- ✅ **Backup data** before major schema changes
- ❌ **Never edit** applied migration files
- ❌ **Don't use** `migrate:push` in production

### **Schema Design**
- Use descriptive table and column names
- Add proper indexes for performance
- Include proper constraints and validations
- Document complex relationships

### **Version Control**
- Commit both schema changes AND generated migrations
- Include descriptive commit messages for database changes
- Tag releases with database version information

## 🔧 **Troubleshooting**

### **Common Issues**
1. **"Migration failed"**: Check database connection and permissions
2. **"Schema mismatch"**: Run `pnpm migrate:check` to identify differences
3. **"Table already exists"**: Previous migration may have partially applied

### **Recovery Commands**
```bash
# Drop migration tracking (DANGER: development only)
pnpm migrate:drop

# Reset to specific migration
# (Edit migration journal manually if needed)
```

## 🔗 **Integration with StudyPuck**

### **From Web Application (apps/web)**
```typescript
// Import database utilities
import { db, users } from '@studypuck/database';

// Use in your code
const newUser = await db.insert(users).values({
  userId: 'user_123',
  email: 'user@example.com'
});
```

### **Environment Setup**
- Database connection injected at command runtime by the secure StudyPuck env wrapper
- Uses Neon Postgres with pgvector extension
- Supports database branching for feature development

### **Operational Procedures**
For complete operational workflows, see:
- [Database Branching Guide](./database-branching-guide.md)
- [Environment Setup](./environment-setup.md)
- [Interactive Development](./interactive-development.md)

## 📚 **Additional Resources**

- **Drizzle Documentation**: [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **Neon Documentation**: [https://neon.tech/docs](https://neon.tech/docs)
- **StudyPuck Database Schema**: [packages/database/src/schema.ts](../packages/database/src/schema.ts)
