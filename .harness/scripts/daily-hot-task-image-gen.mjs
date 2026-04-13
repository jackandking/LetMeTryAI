#!/usr/bin/env node
/**
 * Daily Hot Task Image Generator
 * 为当日最热门的投票 App 选项生成 AI 优化配图
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
    HOT_TASK_PROMO_PATHS,
    loadLatestMetrics,
    rankHotTaskCandidates,
    loadProcessedTaskLog,
    selectPromotionCandidate,
    buildHotTaskAppFromCandidate,
    recordPromotionRun
} from './hot-task-promo-workflow.js';
import { ImageGenerator } from '../../.agents/skills/ai-image-generator/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

function log(stage, message) {
    const ts = new Date().toISOString();
    console.log(`[hot-task-image][${ts}][${stage}] ${message}`);
}

function parseArgs(argv) {
    const options = { metricsDir: null, forceAppId: null, force: false, dryRun: false, cooldownDays: 1 };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = argv[i + 1];
        if (arg === '--metrics-dir') { options.metricsDir = next; i += 1; }
        else if (arg === '--force-app-id') { options.forceAppId = next; i += 1; }
        else if (arg === '--cooldown-days') { options.cooldownDays = Number(next || 1); i += 1; }
        else if (arg === '--force') { options.force = true; }
        else if (arg === '--dry-run') { options.dryRun = true; }
        else { throw new Error(`Unknown argument: ${arg}`); }
    }
    return options;
}

function extractOptionsFromHtml(html) {
    const options = [];
    // Match each option-card block
    const cardRegex = /<label class="option-card">[\s\S]*?<\/label>/g;
    const cards = html.match(cardRegex) || [];

    for (const card of cards) {
        const valueMatch = card.match(/<input[^>]*value="([^"]+)"/);
        const imgMatch = card.match(/<img[^>]*src="images\/([^"]+)"[^>]*alt="([^"]*)"/);
        const titleMatch = card.match(/<h3 class="option-title">([^<]+)<\/h3>/);
        const captionMatch = card.match(/<p class="option-caption">([^<]+)<\/p>/);

        if (valueMatch && titleMatch) {
            options.push({
                value: valueMatch[1],
                imageFile: imgMatch ? imgMatch[1] : `${valueMatch[1]}.svg`,
                alt: imgMatch ? imgMatch[2] : '',
                title: titleMatch[1].trim(),
                caption: captionMatch ? captionMatch[1].trim() : ''
            });
        }
    }

    return options;
}

function extractPageTitle(html) {
    const match = html.match(/<title>([^<]*)<\/title>/i);
    return match ? match[1].trim() : '';
}

function buildImagePrompt(pageTitle, option) {
    const base = `为投票页面「${pageTitle}」的选项「${option.title}」生成一张简洁的配图。`;
    const desc = option.caption ? `画面内容要体现：${option.caption}。` : '';
    const style = '风格要求：扁平插画风格，色彩柔和，画面干净，主体突出，适合手机端投票页面展示，正方形构图，无文字。';
    return `${base}${desc}${style}`;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    log('start', `dryRun=${options.dryRun} force=${options.force}`);

    const latestMetrics = loadLatestMetrics(options.metricsDir);
    const candidates = rankHotTaskCandidates(latestMetrics);
    const records = loadProcessedTaskLog();

    const candidate = selectPromotionCandidate(candidates, records, {
        force: options.force,
        forceAppId: options.forceAppId,
        cooldownDays: options.cooldownDays
    });

    const app = buildHotTaskAppFromCandidate(candidate);
    const appDir = path.join(repoRoot, app.appId);
    const indexPath = path.join(appDir, 'index.html');

    if (!existsSync(indexPath)) {
        throw new Error(`index.html not found: ${indexPath}`);
    }

    const html = readFileSync(indexPath, 'utf8');
    const pageTitle = extractPageTitle(html);
    const voteOptions = extractOptionsFromHtml(html);

    if (voteOptions.length === 0) {
        throw new Error(`No vote options found in ${indexPath}`);
    }

    log('selected', `appId=${app.appId} pageTitle="${pageTitle}" options=${voteOptions.length}`);

    if (options.dryRun) {
        for (const opt of voteOptions) {
            log('dry-run', `${opt.value}: ${opt.title} -> ${buildImagePrompt(pageTitle, opt).substring(0, 80)}...`);
        }
        return;
    }

    const generator = new ImageGenerator({ provider: 'minimax' });
    const imagesDir = path.join(appDir, 'images');

    for (const opt of voteOptions) {
        const prompt = buildImagePrompt(pageTitle, opt);
        log('generate', `Option="${opt.title}" prompt="${prompt.substring(0, 60)}..."`);

        try {
            const result = await generator.generate({ prompt, aspect_ratio: '1:1' });
            if (!result.url) {
                throw new Error('No image URL returned');
            }

            const ext = path.extname(opt.imageFile) || '.png';
            // Keep original extension to avoid rewriting index.html references
            const outputPath = path.join(imagesDir, opt.imageFile);

            await generator.downloadImage(result.url, outputPath);
            log('saved', `${opt.imageFile} -> ${outputPath}`);
        } catch (err) {
            log('error', `Failed to generate image for ${opt.value}: ${err.message}`);
        }
    }

    // Git commit
    const gitAdd = spawnSync('git', ['add', `${app.appId}/images/`], { cwd: repoRoot, encoding: 'utf8' });
    if (gitAdd.status !== 0) {
        log('warn', `git add failed: ${gitAdd.stderr || gitAdd.stdout}`);
    } else {
        const gitCommit = spawnSync('git', ['commit', '-m', `chore(images): AI optimize hot-task images for ${app.appId}`], { cwd: repoRoot, encoding: 'utf8' });
        if (gitCommit.status === 0) {
            const gitPush = spawnSync('git', ['push'], { cwd: repoRoot, encoding: 'utf8' });
            log('git', gitPush.status === 0 ? 'Pushed image updates' : `Push failed: ${gitPush.stderr || gitPush.stdout}`);
        } else {
            log('git', `Nothing to commit or commit failed: ${gitCommit.stderr || gitCommit.stdout}`);
        }
    }

    recordPromotionRun({
        reportDate: candidate.reportDate,
        appId: app.appId,
        pageTitle: app.pageTitle,
        appUrl: app.appUrl,
        selectedBy: candidate.selectedBy,
        metricsSummary: {
            daren: Number(candidate.daren || 0),
            works: Number(candidate.works || 0),
            exposure: Number(candidate.exposure || 0)
        },
        status: 'images_generated',
        processedAt: new Date().toISOString()
    });

    log('done', `Generated images for ${app.appId}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
