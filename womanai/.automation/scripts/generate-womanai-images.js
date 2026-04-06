#!/usr/bin/env node

import fs from 'fs';
import {
    buildCreateGeneratedImagesTableSql,
    buildGeneratedImageInsertStatement,
    buildGenerationPlan,
    computeTagScores,
    attachTagsToImages,
    loadConfig,
    scoreDirections
} from './womanai-image-pipeline.js';
import {
    ensureParentDirectory,
    ensureRuntimeDirectories,
    isExecutedDirectly,
    resolveConfigPath,
    resolveRuntimePath
} from './runtime-paths.js';
import { normalizeRows, postSql } from './db-client.js';

function parseArgs(argv) {
    const args = {
        dryRun: false,
        config: null
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--dry-run') {
            args.dryRun = true;
        } else if (token === '--config') {
            args.config = argv[index + 1];
            index += 1;
        } else if (token === '--help') {
            args.help = true;
        }
    }

    return args;
}

async function generateMiniMaxImage({ apiKey, prompt, aspectRatio, quality, fetchImpl = fetch }) {
    const response = await fetchImpl('https://api.minimax.chat/v1/image_generation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'image-01',
            prompt,
            aspect_ratio: aspectRatio,
            ...(quality ? { quality } : {})
        })
    });

    if (!response.ok) {
        throw new Error(`MiniMax request failed with HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.base_resp && result.base_resp.status_code !== 0) {
        throw new Error(result.base_resp.status_msg || 'MiniMax image generation failed');
    }

    return {
        imageUrl: result.data?.image_urls?.[0] || result.data?.[0]?.url,
        providerImageId: result.id || null
    };
}

async function fetchHotImages(config) {
    const sql = `SELECT id, image_url, view_count, created_at FROM ${config.database.imagesTable} WHERE deleted = 0 ORDER BY view_count DESC, created_at DESC LIMIT ?`;
    const result = await postSql(config.database.mysqlQueryEndpoint, sql, [config.generation.hotSampleLimit]);
    return normalizeRows(result);
}

function buildSummary(config, hotImages, taggedImages, tagScores, rankedDirections, generationPlan, generatedCandidates = []) {
    return {
        generatedAt: new Date().toISOString(),
        dryRun: generatedCandidates.length === 0,
        hotSampleCount: hotImages.length,
        taggedHotSampleCount: taggedImages.filter(image => image.tags.length > 0).length,
        topTags: tagScores.slice(0, 10),
        rankedDirections: rankedDirections.map(direction => ({
            key: direction.key,
            label: direction.label,
            score: direction.score,
            matchedImageCount: direction.matchedImageCount,
            sourceImageIds: direction.sourceImageIds,
            sourceViewCountSum: direction.sourceViewCountSum
        })),
        generationPlan,
        generatedCandidates
    };
}

export async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log('Usage: node generate-womanai-images.js [--dry-run] [--config path]');
        return;
    }

    const configPath = args.config || resolveConfigPath(import.meta.url);
    const config = loadConfig(configPath);
    ensureRuntimeDirectories(import.meta.url);

    await postSql(
        config.database.mysqlQueryEndpoint,
        buildCreateGeneratedImagesTableSql(config.database.generatedImagesTable)
    );

    const hotImages = await fetchHotImages(config);
    if (hotImages.length === 0) {
        throw new Error('No source images found in handsome_images');
    }

    const taggedImages = attachTagsToImages(hotImages, config.manualImageTags);
    const taggedHotImages = taggedImages.filter(image => image.tags.length > 0);
    if (taggedHotImages.length === 0) {
        throw new Error('No tagged hot images matched config.manualImageTags. Update womanai-image-gen.config.json before generating.');
    }

    const tagScores = computeTagScores(taggedHotImages);
    const rankedDirections = scoreDirections(taggedHotImages, config.directionTemplates)
        .filter(direction => direction.score > 0)
        .slice(0, config.generation.topDirections);

    if (rankedDirections.length === 0) {
        throw new Error('No direction templates matched the current tagged hot images.');
    }

    const generationPlan = buildGenerationPlan({
        rankedDirections,
        dailyVolume: config.generation.dailyVolume,
        promptFoundation: config.promptFoundation
    });

    const summaryPath = resolveRuntimePath(
        import.meta.url,
        'exports',
        `${config.generation.exportFilenamePrefix}-${Date.now()}.json`
    );

    if (args.dryRun) {
        const summary = buildSummary(config, hotImages, taggedImages, tagScores, rankedDirections, generationPlan, []);
        ensureParentDirectory(summaryPath);
        fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
        console.log(JSON.stringify(summary, null, 2));
        return;
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
        throw new Error('MINIMAX_API_KEY is required unless --dry-run is used');
    }

    const generatedCandidates = [];
    for (const planItem of generationPlan) {
        const generated = await generateMiniMaxImage({
            apiKey,
            prompt: planItem.promptText,
            aspectRatio: config.generation.aspectRatio,
            quality: config.generation.quality
        });

        if (!generated.imageUrl) {
            throw new Error(`MiniMax returned no image URL for direction ${planItem.directionKey}`);
        }

        const candidate = {
            ...planItem,
            imageUrl: generated.imageUrl,
            provider: config.generation.provider,
            providerImageId: generated.providerImageId
        };
        const statement = buildGeneratedImageInsertStatement(config.database.generatedImagesTable, candidate);
        await postSql(config.database.mysqlQueryEndpoint, statement.sql, statement.params);
        generatedCandidates.push(candidate);
    }

    const summary = buildSummary(config, hotImages, taggedImages, tagScores, rankedDirections, generationPlan, generatedCandidates);
    ensureParentDirectory(summaryPath);
    fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

    const logPath = resolveRuntimePath(import.meta.url, 'logs', `generate-womanai-images-${Date.now()}.log`);
    ensureParentDirectory(logPath);
    fs.writeFileSync(
        logPath,
        [
            `Generated ${generatedCandidates.length} candidate image(s)`,
            `Summary file: ${summaryPath}`,
            `Top directions: ${rankedDirections.map(direction => `${direction.key}:${direction.score}`).join(', ')}`
        ].join('\n') + '\n'
    );

    console.log(JSON.stringify(summary, null, 2));
}

if (isExecutedDirectly(import.meta.url)) {
    main().catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
