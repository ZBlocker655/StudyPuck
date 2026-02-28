#!/usr/bin/env node
/**
 * Ephemeral Neon Test Enforcement
 *
 * Finds all *.neon.test.ts files and enforces:
 * 1. Each filename must include 'issue-N' (issue number is mandatory)
 * 2. The linked GitHub issue must be OPEN (closed issue = stale test to delete)
 *
 * Runs in CI on every push. See docs/ops/database-branching-guide.md for
 * the full ephemeral test lifecycle documentation.
 */

import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();

function findNeonTests(dir, results = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        findNeonTests(fullPath, results);
      } else if (entry.endsWith('.neon.test.ts')) {
        results.push(fullPath);
      }
    } catch {
      // Skip unreadable entries
    }
  }
  return results;
}

const files = findNeonTests(ROOT);

if (files.length === 0) {
  console.log('✅ No ephemeral Neon test files found.');
  process.exit(0);
}

console.log(`🔍 Checking ${files.length} ephemeral Neon test file(s)...\n`);

let failed = false;

for (const file of files) {
  const rel = relative(ROOT, file);
  const filename = file.split(/[\\/]/).pop();
  const match = filename.match(/issue-(\d+)/);

  if (!match) {
    console.error(`❌ Missing issue number: ${rel}`);
    console.error(`   All .neon.test.ts files must include 'issue-N' in the filename.`);
    console.error(`   Example: migration-issue-36.neon.test.ts\n`);
    failed = true;
    continue;
  }

  const issueNumber = match[1];

  try {
    const state = execSync(
      `gh issue view ${issueNumber} --json state --jq .state`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (state === 'CLOSED') {
      console.error(`❌ Stale ephemeral Neon test found:`);
      console.error(`   ${rel}`);
      console.error(`   Issue #${issueNumber} is CLOSED. Delete this file before merging.\n`);
      failed = true;
    } else {
      console.log(`   ✅ ${rel} → issue #${issueNumber} is ${state}`);
    }
  } catch (e) {
    // gh CLI unavailable or unauthenticated — warn but don't block
    console.warn(`   ⚠️  Could not check issue #${issueNumber} for ${rel}: ${e.message}`);
    console.warn(`      Skipping check (gh CLI not available or not authenticated)\n`);
  }
}

console.log('');

if (failed) {
  process.exit(1);
}

console.log('✅ All ephemeral Neon test files are linked to open issues.');
