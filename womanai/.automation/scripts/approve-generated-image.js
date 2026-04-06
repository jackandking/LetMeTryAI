#!/usr/bin/env node

import {
    APPROVED_STATUS,
    REJECTED_STATUS,
    buildCreateGeneratedImagesTableSql,
    buildReviewUpdateStatement,
    loadConfig
} from './womanai-image-pipeline.js';
import { extractInsertId, normalizeRows, postSql } from './db-client.js';
import { isExecutedDirectly, resolveConfigPath } from './runtime-paths.js';

function parseArgs(argv) {
    const args = {
        id: null,
        action: 'approve',
        note: null,
        config: null
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--id') {
            args.id = Number(argv[index + 1]);
            index += 1;
        } else if (token === '--action') {
            args.action = argv[index + 1];
            index += 1;
        } else if (token === '--note') {
            args.note = argv[index + 1];
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
    if (args.help || !Number.isInteger(args.id) || args.id <= 0) {
        console.log('Usage: node approve-generated-image.js --id 12 [--action approve|reject] [--note "reason"] [--config path]');
        if (!args.help) {
            process.exitCode = 1;
        }
        return;
    }

    if (!['approve', 'reject'].includes(args.action)) {
        throw new Error(`Unsupported action: ${args.action}`);
    }

    const config = loadConfig(args.config || resolveConfigPath(import.meta.url));
    await postSql(
        config.database.mysqlQueryEndpoint,
        buildCreateGeneratedImagesTableSql(config.database.generatedImagesTable)
    );

    const candidateSql = `SELECT id, image_url, status FROM ${config.database.generatedImagesTable} WHERE id = ? LIMIT 1`;
    const candidates = normalizeRows(await postSql(config.database.mysqlQueryEndpoint, candidateSql, [args.id]));
    const candidate = candidates[0];

    if (!candidate) {
        throw new Error(`Generated image candidate ${args.id} was not found`);
    }

    if (candidate.status === APPROVED_STATUS && args.action === 'approve') {
        throw new Error(`Generated image candidate ${args.id} is already approved`);
    }

    if (args.action === 'reject') {
        const update = buildReviewUpdateStatement(config.database.generatedImagesTable, {
            candidateId: args.id,
            status: REJECTED_STATUS,
            reviewNote: args.note || 'Rejected manually'
        });
        await postSql(config.database.mysqlQueryEndpoint, update.sql, update.params);
        console.log(JSON.stringify({ id: args.id, status: REJECTED_STATUS }, null, 2));
        return;
    }

    const duplicateSql = `SELECT id, deleted FROM ${config.database.imagesTable} WHERE SUBSTRING(image_url, 1, 255) = SUBSTRING(?, 1, 255) LIMIT 1`;
    const existingRows = normalizeRows(await postSql(config.database.mysqlQueryEndpoint, duplicateSql, [candidate.image_url]));
    let approvedImageId = existingRows[0]?.id || null;
    const wasDeleted = Number(existingRows[0]?.deleted || 0) === 1;

    if (approvedImageId && wasDeleted) {
        const reactivateSql = `UPDATE ${config.database.imagesTable} SET deleted = 0 WHERE id = ?`;
        await postSql(config.database.mysqlQueryEndpoint, reactivateSql, [approvedImageId]);
    } else if (!approvedImageId) {
        const insertSql = `INSERT INTO ${config.database.imagesTable} (image_url, created_at) VALUES (?, NOW())`;
        const insertResult = await postSql(config.database.mysqlQueryEndpoint, insertSql, [candidate.image_url]);
        approvedImageId = extractInsertId(insertResult);
    }

    const update = buildReviewUpdateStatement(config.database.generatedImagesTable, {
        candidateId: args.id,
        status: APPROVED_STATUS,
        reviewNote: args.note || 'Approved manually',
        approvedImageId
    });
    await postSql(config.database.mysqlQueryEndpoint, update.sql, update.params);

    console.log(JSON.stringify({ id: args.id, status: APPROVED_STATUS, approvedImageId }, null, 2));
}

if (isExecutedDirectly(import.meta.url)) {
    main().catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
