#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpegStatic from 'ffmpeg-static';
import { chromium } from 'playwright';
import {
    HOT_TASK_APP,
    VIDEO_CAPTURE,
    buildArtifactBaseName,
    buildEmailBody,
    buildNarrationLines,
    buildOverlayLines
} from './hot-task-video-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const workDir = path.join(repoRoot, '.harness', '.local', 'hot-task-video', HOT_TASK_APP.appId);
const recordUrl = process.env.HOT_TASK_RECORD_URL || HOT_TASK_APP.appUrl;
const INTRO_TRIM_SECONDS = 1.2;
const artifactBaseName = buildArtifactBaseName();

const outputPaths = {
    rawVideo: path.join(workDir, `${artifactBaseName}.webm`),
    audio: path.join(workDir, `${artifactBaseName}-narration.m4a`),
    finalVideo: path.join(workDir, `${artifactBaseName}.mp4`),
    referenceFrame: path.join(workDir, `${artifactBaseName}-reference-frame.png`),
    emailBody: path.join(workDir, `${artifactBaseName}-email-body.txt`),
    metadata: path.join(workDir, `${artifactBaseName}-metadata.json`)
};

function runChecked(command, args, label) {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    if (result.status !== 0) {
        throw new Error(`${label} failed: ${(result.stderr || result.stdout || '').trim()}`);
    }
}

function parseDurationToSeconds(text) {
    const match = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!match) {
        throw new Error('Unable to parse media duration');
    }
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function getMediaDurationSeconds(filePath) {
    const result = spawnSync(ffmpegStatic, ['-i', filePath], { encoding: 'utf8' });
    const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
    return parseDurationToSeconds(combined);
}

async function ensureTooling() {
    const sayResult = spawnSync('bash', ['-lc', 'command -v say'], { encoding: 'utf8' });
    if (sayResult.status !== 0) {
        throw new Error('say is required but not available in PATH');
    }

    if (!ffmpegStatic) {
        throw new Error('ffmpeg-static is not available');
    }
}

function createOverlayMarkup(lines) {
    const escapedLines = lines.map(line => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));

    return `
        <div id="hotTaskBadge">快手热门任务</div>
        <div id="hotTaskOverlay">
            ${escapedLines.map((line, index) => `<div class="${index === 0 ? 'hot-task-title' : 'hot-task-line'}">${line}</div>`).join('')}
        </div>
    `;
}

async function injectOverlay(page) {
    const markup = createOverlayMarkup(buildOverlayLines());
    await page.evaluate((html) => {
        const style = document.createElement('style');
        style.textContent = `
            html, body {
                width: 100%;
                min-height: 100%;
                overflow-x: hidden;
            }

            #hotTaskBadge {
                position: fixed;
                top: 12px;
                right: 12px;
                z-index: 1000000;
                background: linear-gradient(135deg, #ff7a18 0%, #ff3d54 100%);
                color: #fff;
                padding: 8px 12px;
                border-radius: 999px;
                font: 700 14px/1.2 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
                box-shadow: 0 8px 18px rgba(255, 61, 84, 0.28);
                letter-spacing: 0.5px;
            }

            #hotTaskOverlay {
                position: fixed;
                left: 12px;
                bottom: 14px;
                width: calc(100% - 24px);
                z-index: 1000000;
                background: rgba(15, 23, 42, 0.76);
                color: #fff;
                border-radius: 14px;
                padding: 10px 12px 11px;
                box-shadow: 0 8px 18px rgba(15, 23, 42, 0.24);
                backdrop-filter: blur(6px);
                pointer-events: none;
                font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
            }

            #hotTaskOverlay .hot-task-title {
                font-size: 13px;
                font-weight: 700;
                margin-bottom: 4px;
                color: #ffe082;
            }

            #hotTaskOverlay .hot-task-line {
                font-size: 12px;
                line-height: 1.35;
                margin-top: 2px;
                word-break: break-word;
            }
        `;
        document.head.appendChild(style);

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);
    }, markup);
}

async function recordVideo() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: VIDEO_CAPTURE.viewportWidth, height: VIDEO_CAPTURE.viewportHeight },
        screen: { width: VIDEO_CAPTURE.viewportWidth, height: VIDEO_CAPTURE.viewportHeight },
        userAgent: VIDEO_CAPTURE.userAgent,
        isMobile: true,
        hasTouch: true,
        locale: 'zh-CN',
        ignoreHTTPSErrors: true,
        deviceScaleFactor: VIDEO_CAPTURE.deviceScaleFactor,
        recordVideo: {
            dir: workDir,
            size: { width: VIDEO_CAPTURE.recordWidth, height: VIDEO_CAPTURE.recordHeight }
        }
    });

    const page = await context.newPage();
    const video = page.video();

    await page.setExtraHTTPHeaders({
        'accept-language': 'zh-CN,zh;q=0.9',
        'upgrade-insecure-requests': '1'
    });
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'platform', { get: () => 'Linux armv8l' });
    });
    await page.goto(recordUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('#optionsContainer .option-card img', { state: 'visible', timeout: 30000 });
    await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
            Array.from(document.images).map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', resolve, { once: true });
                });
            })
        );
    });
    await injectOverlay(page);
    await page.screenshot({ path: outputPaths.referenceFrame, fullPage: false, timeout: 0 });
    await page.waitForTimeout(2600);
    await page.evaluate(() => window.scrollBy({ top: 260, behavior: 'smooth' }));
    await page.waitForTimeout(2800);
    await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(4200);

    if (!video) {
        throw new Error('Playwright video recorder did not initialize');
    }

    await page.close();
    const recordedPath = await video.path();
    await context.close();
    await browser.close();
    await fs.copyFile(recordedPath, outputPaths.rawVideo);
}

function synthesizeNarration() {
    const lines = buildNarrationLines();
    const segments = [];

    lines.forEach((line, index) => {
        const segmentPath = path.join(workDir, `narration-${index + 1}.aiff`);
        runChecked(
        'say',
            ['-v', 'Ting-Ting', '-r', '145', '-o', segmentPath, line],
            `say segment ${index + 1}`
        );
        segments.push(segmentPath);
    });

    const concatInputs = segments.flatMap((segmentPath) => ['-i', segmentPath]);
    const concatFilter = `${segments.map((_, index) => `[${index}:a]`).join('')}concat=n=${segments.length}:v=0:a=1[a]`;

    runChecked(
        ffmpegStatic,
        [
            '-y',
            ...concatInputs,
            '-filter_complex', concatFilter,
            '-map', '[a]',
            outputPaths.audio
        ],
        'ffmpeg audio concat'
    );
}

function muxVideo() {
    const audioDuration = getMediaDurationSeconds(outputPaths.audio);
    const rawVideoDuration = getMediaDurationSeconds(outputPaths.rawVideo);
    const trimmedVideoDuration = Math.max(rawVideoDuration - INTRO_TRIM_SECONDS, 0.1);
    const padDuration = Math.max(audioDuration - trimmedVideoDuration + 0.3, 0);
    const videoFilter = [
        padDuration > 0 ? `tpad=stop_mode=clone:stop_duration=${padDuration.toFixed(2)}` : null,
        `scale=${VIDEO_CAPTURE.outputWidth}:${VIDEO_CAPTURE.outputHeight}`
    ].filter(Boolean).join(',');

    runChecked(
        ffmpegStatic,
        [
            '-y',
            '-ss', String(INTRO_TRIM_SECONDS),
            '-i', outputPaths.rawVideo,
            '-i', outputPaths.audio,
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-vf', videoFilter,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            outputPaths.finalVideo
        ],
        'ffmpeg mux'
    );
}

async function writeArtifacts() {
    await fs.writeFile(outputPaths.emailBody, buildEmailBody(), 'utf8');
    await fs.writeFile(
        outputPaths.metadata,
        JSON.stringify(
            {
                app: HOT_TASK_APP,
                narrationLines: buildNarrationLines(),
                overlayLines: buildOverlayLines(),
                outputPaths
            },
            null,
            2
        ),
        'utf8'
    );
}

async function main() {
    await fs.mkdir(workDir, { recursive: true });
    await ensureTooling();
    await recordVideo();
    synthesizeNarration();
    muxVideo();
    await writeArtifacts();

    console.log(`video=${outputPaths.finalVideo}`);
    console.log(`emailBody=${outputPaths.emailBody}`);
    console.log(`metadata=${outputPaths.metadata}`);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
