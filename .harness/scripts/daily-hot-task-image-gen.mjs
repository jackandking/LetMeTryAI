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
    recordPromotionRun,
    saveHotTaskSelection
} from './hot-task-promo-workflow.js';
import { ImageGenerator } from '../../.agents/skills/ai-image-generator/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

function log(stage, message) {
    const ts = new Date().toISOString();
    console.log(`[hot-task-image][${ts}][${stage}] ${message}`);
}

function parseArgs(argv) {
    const options = { metricsDir: null, forceAppId: null, force: false, dryRun: false, cooldownDays: 90 };
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
    const style = '风格要求：扁平插画风格，色彩柔和，画面干净。关键要求：主体必须占画面80%以上，人物采用特写构图，填满整个画面，四周不要大面积留白，不要大面积纯色背景，视觉焦点集中在画面中央。正方形构图，无文字。';
    return `${base}${desc}${style}`;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    log('start', `dryRun=${options.dryRun} force=${options.force}`);

    const latestMetrics = loadLatestMetrics(options.metricsDir);
    const candidates = rankHotTaskCandidates(latestMetrics);
    const records = loadProcessedTaskLog();

    // Try candidates until we find one with new-format HTML (option-card)
    let candidate, app, appDir, indexPath, html, pageTitle, voteOptions;
    const skipped = [];
    const triedIds = new Set();

    for (let attempt = 0; attempt < candidates.length; attempt++) {
        candidate = selectPromotionCandidate(candidates.filter(c => !triedIds.has(c.metadata?.id)), records, {
            force: options.force,
            forceAppId: options.forceAppId,
            cooldownDays: options.cooldownDays
        });

        app = buildHotTaskAppFromCandidate(candidate);
        triedIds.add(candidate.metadata?.id);
        appDir = path.join(repoRoot, app.appId);
        indexPath = path.join(appDir, 'index.html');

        if (!existsSync(indexPath)) {
            log('skip', `${app.appId}: index.html not found`);
            skipped.push(app.appId);
            continue;
        }

        html = readFileSync(indexPath, 'utf8');
        pageTitle = extractPageTitle(html);
        voteOptions = extractOptionsFromHtml(html);

        if (voteOptions.length === 0) {
            log('skip', `${app.appId}: old HTML format (no option-card), skipping`);
            skipped.push(app.appId);
            continue;
        }

        // Check that existing images are present (page must be functional before we touch it)
        const imagesDir = path.join(appDir, 'images');
        const missingImages = voteOptions.filter(opt => {
            const imgPath = path.join(imagesDir, opt.imageFile);
            return !existsSync(imgPath);
        });
        if (missingImages.length > 0) {
            log('skip', `${app.appId}: ${missingImages.length} image(s) missing on disk (page already broken), skipping`);
            skipped.push(app.appId);
            continue;
        }

        break; // found a valid candidate
    }

    if (!voteOptions || voteOptions.length === 0) {
        log('abort', `All candidates have old HTML format. Skipped: ${skipped.join(', ')}`);
        // Send notification email
        const alertBody = `[hot-task-image] No compatible candidate found.\nSkipped apps (old format): ${skipped.join(', ')}\nTime: ${new Date().toISOString()}\n\nConsider supporting old HTML format if this happens frequently.`;
        const alertFile = path.join(repoRoot, '.harness', '.local', 'logs', 'hot-task-skip-alert.txt');
        writeFileSync(alertFile, alertBody, 'utf8');
        const sendScript = path.join(repoRoot, '.harness', 'scripts', 'send-email.py');
        const pythonBin = process.env.DAILY_PYTHON_BIN || 'python3';
        const alertTo = process.env.KUAISHOU_EMAIL_TO || 'jackandking@163.com';
        if (existsSync(sendScript)) {
            const { spawnSync: sp } = await import('node:child_process');
            sp(pythonBin, [sendScript, '[Hot Task] Skipped - old format apps only', alertTo, alertFile]);
        }
        return;
    }

    log('selected', `appId=${app.appId} pageTitle="${pageTitle}" options=${voteOptions.length} (skipped ${skipped.length} old-format apps)`);
    saveHotTaskSelection(candidate.metadata);

    if (options.dryRun) {
        for (const opt of voteOptions) {
            log('dry-run', `${opt.value}: ${opt.title} -> ${buildImagePrompt(pageTitle, opt).substring(0, 80)}...`);
        }
        return;
    }

    const generator = new ImageGenerator({ provider: 'minimax' });
    const imagesDir = path.join(appDir, 'images');
    const successfulOptions = [];

    for (const opt of voteOptions) {
        const prompt = buildImagePrompt(pageTitle, opt);
        log('generate', `Option="${opt.title}" prompt="${prompt.substring(0, 60)}..."`);

        try {
            const result = await generator.generate({ prompt, aspect_ratio: '1:1' });
            if (!result.url) {
                throw new Error('No image URL returned');
            }

            const outputName = `${opt.value}.jpg`;
            const tmpPath = path.join(imagesDir, `${opt.value}.tmp.jpg`);
            const outputPath = path.join(imagesDir, outputName);

            await generator.downloadImage(result.url, tmpPath);

            // Verify the downloaded file is valid (non-empty)
            const stat = await import('node:fs').then(m => m.statSync(tmpPath));
            if (stat.size < 1000) {
                throw new Error(`Downloaded image too small (${stat.size} bytes), likely corrupt`);
            }

            // Atomic replace: rename tmp to final
            const { renameSync } = await import('node:fs');
            renameSync(tmpPath, outputPath);

            successfulOptions.push(opt);
            log('saved', `${outputName} -> ${outputPath}`);
        } catch (err) {
            log('error', `Failed to generate image for ${opt.value}: ${err.message}`);
            // Clean up tmp file if exists
            const tmpPath = path.join(imagesDir, `${opt.value}.tmp.jpg`);
            try { const { unlinkSync } = await import('node:fs'); unlinkSync(tmpPath); } catch {}
        }
    }

    // Only update HTML for images that were actually generated successfully
    if (successfulOptions.length > 0) {
        const indexHtmlPath2 = path.join(appDir, 'index.html');
        if (existsSync(indexHtmlPath2)) {
            let htmlContent = readFileSync(indexHtmlPath2, 'utf8');
            const originalHtml = htmlContent;
            for (const opt of successfulOptions) {
                const oldRef = `images/${opt.imageFile}`;
                const newRef = `images/${opt.value}.jpg`;
                htmlContent = htmlContent.replaceAll(oldRef, newRef);
            }
            if (htmlContent !== originalHtml) {
                writeFileSync(indexHtmlPath2, htmlContent, 'utf8');
                log('html', `Updated ${successfulOptions.length}/${voteOptions.length} image references`);
            }
        }
    } else {
        log('warn', 'No images generated successfully — HTML left unchanged');
    }

    // Git commit
    const gitAdd = spawnSync('git', ['add', `${app.appId}/images/`, `${app.appId}/index.html`], { cwd: repoRoot, encoding: 'utf8' });
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
