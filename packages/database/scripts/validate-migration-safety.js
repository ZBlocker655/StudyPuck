#!/usr/bin/env node

/**
 * Migration Safety Validator
 * Checks for potentially destructive operations in migration files
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const DESTRUCTIVE_PATTERNS = [
  /DROP\s+TABLE/i,
  /DROP\s+COLUMN/i,
  /DROP\s+INDEX/i,
  /TRUNCATE/i,
  /DELETE\s+FROM/i,
  /ALTER\s+TABLE\s+\w+\s+DROP/i,
  /ALTER\s+COLUMN\s+\w+\s+DROP/i
];

const WARNING_PATTERNS = [
  /ALTER\s+TABLE\s+\w+\s+ALTER\s+COLUMN/i,
  /CREATE\s+UNIQUE\s+INDEX/i,
  /ADD\s+CONSTRAINT.*FOREIGN\s+KEY/i
];

async function validateMigrationSafety() {
  try {
    const migrationsDir = join(process.cwd(), 'migrations');
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql'));

    let hasDestructiveOperations = false;
    let hasWarnings = false;

    console.log('🔍 Validating migration safety...\n');

    for (const file of sqlFiles) {
      const filepath = join(migrationsDir, file);
      const content = await readFile(filepath, 'utf-8');
      
      console.log(`📄 Checking ${file}:`);

      // Check for destructive patterns
      for (const pattern of DESTRUCTIVE_PATTERNS) {
        if (pattern.test(content)) {
          console.log(`  ❌ DESTRUCTIVE: Found ${pattern.source}`);
          hasDestructiveOperations = true;
        }
      }

      // Check for warning patterns
      for (const pattern of WARNING_PATTERNS) {
        if (pattern.test(content)) {
          console.log(`  ⚠️  WARNING: Found ${pattern.source} - review for impact`);
          hasWarnings = true;
        }
      }

      if (!DESTRUCTIVE_PATTERNS.some(p => p.test(content)) && 
          !WARNING_PATTERNS.some(p => p.test(content))) {
        console.log(`  ✅ Safe migration`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Checked ${sqlFiles.length} migration files`);
    
    if (hasDestructiveOperations) {
      console.log(`  ❌ DESTRUCTIVE operations found - manual review required`);
      console.log(`  🚨 Production deployment blocked`);
      process.exit(1);
    }

    if (hasWarnings) {
      console.log(`  ⚠️  Warnings found - review recommended`);
    }

    console.log(`  ✅ No destructive operations detected`);
    console.log(`  🚀 Safe for production deployment`);

  } catch (error) {
    console.error(`❌ Migration safety validation failed:`, error.message);
    process.exit(1);
  }
}

validateMigrationSafety();