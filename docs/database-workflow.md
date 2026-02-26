# Database Workflow Documentation

**Purpose**: Developer workflow guide for StudyPuck database operations using Drizzle ORM and Neon Postgres.

## 🚀 **Quick Start**

### **Development Workflow**
```bash
# From project root
cd packages/database

# Generate new migration after schema changes
pnpm migrate:generate

# Apply migrations to development database  
pnpm migrate:apply

# Open Drizzle Studio for visual inspection
pnpm migrate:studio
```

### **From Web Application**
```bash
# From project root, run database commands for web app
pnpm -F database migrate:generate
pnpm -F database migrate:apply
pnpm -F database migrate:studio
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
cd packages/database
pnpm migrate:generate
```

### **3. Review Generated Migration**
- Check `packages/database/migrations/XXXX_migration_name.sql`
- Verify SQL statements are correct
- Review any manual modifications needed

### **4. Apply Migration**
```bash
# Apply to development database
pnpm migrate:apply

# Verify with Drizzle Studio
pnpm migrate:studio
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
- Database connection configured in root `.env`
- Uses Neon Postgres with pgvector extension
- Supports database branching for feature development

### **Operational Procedures**
For complete operational workflows, see:
- [Database Branching Guide](./ops/database-branching-guide.md)
- [Environment Setup](./ops/environment-setup.md)
- [Interactive Development](./ops/interactive-development.md)

## 📚 **Additional Resources**

- **Drizzle Documentation**: [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **Neon Documentation**: [https://neon.tech/docs](https://neon.tech/docs)
- **StudyPuck Database Schema**: [packages/database/src/schema.ts](../packages/database/src/schema.ts)