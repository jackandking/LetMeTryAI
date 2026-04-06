#!/usr/bin/env node

import { buildCreateGeneratedImagesTableSql } from './womanai-image-pipeline.js';
import { loadConfig } from './womanai-image-pipeline.js';
import { normalizeRows, postSql } from './db-client.js';
import { isExecutedDirectly, resolveConfigPath } from './runtime-paths.js';

function parseArgs(argv) {
    const args = {
        status: 'pending_review',
        limit: 20,
        config: null
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--status') {
            args.status = argv[index + 1];
            index += 1;
        } else if (token === '--limit') {
            args.limit = Number(argv[index + 1]);
            index += 1;
        } else if (token === '--config') {
            args.config = argv[index + 1];
            index += 1;
        } else if (token === '--help') {
            args.help = true;
        }
    }

    return args;
}

export async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log('Usage: node list-generated-images.js [--status pending_review] [--limit 20] [--config path]');
        return;
    }

    const config = loadConfig(args.config || resolveConfigPath(import.meta.url));
    await postSql(
        config.database.mysqlQueryEndpoint,
        buildCreateGeneratedImagesTableSql(config.database.generatedImagesTable)
    );

    const sql = `SELECT id, direction_key, direction_label, status, image_url, source_view_count_sum, created_at FROM ${config.database.generatedImagesTable} WHERE status = ? ORDER BY created_at DESC LIMIT ?`;
    const rows = normalizeRows(await postSql(config.database.mysqlQueryEndpoint, sql, [args.status, args.limit]));
    console.log(JSON.stringify(rows, null, 2));
}

if (isExecutedDirectly(import.meta.url)) {
    main().catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
