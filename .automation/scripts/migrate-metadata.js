#!/usr/bin/env node

/**
 * One-time migration: split apps-metadata.json into per-app metadata.json files.
 *
 * Usage:
 *   node .automation/scripts/migrate-metadata.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../..');
const APPS_METADATA_PATH = path.join(REPO_DIR, 'apps-metadata.json');

const dryRun = process.argv.includes('--dry-run');

const raw = fs.readFileSync(APPS_METADATA_PATH, 'utf-8');
const parsed = JSON.parse(raw);
const apps = parsed.apps || [];

let created = 0;
let skipped = 0;
const stale = [];

for (const entry of apps) {
    const dir = path.join(REPO_DIR, entry.directory);

    if (!fs.existsSync(dir)) {
        stale.push(entry.id);
        continue;
    }

    const outPath = path.join(dir, 'metadata.json');

    if (fs.existsSync(outPath)) {
        skipped++;
        continue;
    }

    if (dryRun) {
        console.log(`[dry-run] would write ${path.relative(REPO_DIR, outPath)}`);
        created++;
        continue;
    }

    fs.writeFileSync(outPath, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
    created++;
}

console.log(`\nMigration complete${dryRun ? ' (dry-run)' : ''}:`);
console.log(`  Created: ${created}`);
console.log(`  Skipped (already exists): ${skipped}`);
console.log(`  Stale (directory missing): ${stale.length}`);
if (stale.length > 0) {
    console.log(`  Stale IDs: ${stale.join(', ')}`);
}
