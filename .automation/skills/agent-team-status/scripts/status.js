#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { formatAgentTeamStatus, getAgentTeamStatus } from '../../../shared/agent-team/status.js';

const __filename = fileURLToPath(import.meta.url);

function printUsage() {
    const invokedPath = process.argv[1] || '.automation/skills/agent-team-status/scripts/status.js';
    console.log(`Usage: node ${invokedPath} [--json]`);
}

export function main(argv = process.argv.slice(2)) {
    if (argv.includes('--help') || argv.includes('-h')) {
        printUsage();
        return 0;
    }

    const jsonMode = argv.includes('--json');
    const status = getAgentTeamStatus({ fromUrl: import.meta.url });

    if (jsonMode) {
        console.log(JSON.stringify(status, null, 2));
    } else {
        console.log(formatAgentTeamStatus(status));
    }

    return 0;
}

if (process.argv[1] === __filename) {
    process.exitCode = main();
}
