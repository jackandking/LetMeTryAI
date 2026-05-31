#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);

function printUsage() {
    console.log('Usage: node .automation/scripts/open-parent-revenue-copilot-tab.js');
}

if (process.argv[1] === __filename) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        printUsage();
        process.exit(0);
    }

    const result = spawnSync('osascript', [
        '-e',
        'tell application "Terminal" to activate',
        '-e',
        'tell application "Terminal" to do script "cd /Users/weiping/LetMeTryAI && node .automation/scripts/start-parent-revenue-session.js"'
    ], {
        encoding: 'utf-8'
    });

    if (result.status !== 0) {
        console.error(result.stderr || result.stdout);
        process.exit(result.status || 1);
    }

    process.stdout.write(result.stdout || '');
}
