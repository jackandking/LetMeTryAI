#!/usr/bin/env node
/**
 * Daily Success Story — 达人榜成功故事
 *
 * Fetches video stats via Official API, identifies top performers,
 * generates promo text + video, emails the result.
 *
 * Usage:
 *   node .harness/scripts/daily-success-story.mjs [--recipient <email>] [--min-clicks N] [--top N] [--days N] [--dry-run] [--publish-video]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
    requestOfficialAccessToken,
    buildOfficialRequestAttempts,
    normalizeOfficialPayload,
    shouldContinueOfficialPagination
} from './kuaishou-follow-api.js';
import { loadFollowAppConfigs } from './kuaishou-follow-config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = resolve(__dirname, '..');
const PROJECT_DIR = resolve(HARNESS_DIR, '..');

const STATE_DIR = join(HARNESS_DIR, '.local', 'state', 'kuaishou-follow');
const OUTPUT_DIR = join(HARNESS_DIR, '.local', 'success-stories');
const DEDUP_FILE = join(OUTPUT_DIR, 'featured-videos.json');

const KS_APP_ID = 'ks683421244533878879';
const KS_TOKEN_URL = 'https://letmetry.cloud/oauth/kuaishou/token';
const KS_BASE = 'https://open.kuaishou.com';

const PROFILE_NAMES = {
    'elder-love': '爱老人',
    'parent-tools': '家长爱',
    nanrenbao: '男人宝',
    womanai: '女人爱'
};

const MEDALS = ['🏆', '🥈', '🥉'];

// ── CLI args ──

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        recipient: '',
        minClicks: 10,
        topN: 3,
        days: 30,
        dryRun: false,
        publishVideo: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--recipient': opts.recipient = args[++i] || ''; break;
            case '--min-clicks': opts.minClicks = parseInt(args[++i]) || 10; break;
            case '--top': opts.topN = parseInt(args[++i]) || 3; break;
            case '--days': opts.days = parseInt(args[++i]) || 30; break;
            case '--dry-run': opts.dryRun = true; break;
            case '--publish-video': opts.publishVideo = true; break;
        }
    }
    return opts;
}

// ── Dedup ──

function loadFeaturedVideos() {
    if (!existsSync(DEDUP_FILE)) return {};
    try { return JSON.parse(readFileSync(DEDUP_FILE, 'utf-8')); } catch { return {}; }
}

function saveFeaturedVideos(data) {
    writeFileSync(DEDUP_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function pruneFeaturedOlderThan(featured, days = 90) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    for (const key of Object.keys(featured)) {
        if (featured[key].featuredAt && new Date(featured[key].featuredAt).getTime() < cutoff) {
            delete featured[key];
        }
    }
}

// ── Env / Config ──

function loadCronEnv() {
    const envFile = join(STATE_DIR, 'cron.env');
    if (!existsSync(envFile)) return {};
    const env = {};
    for (const line of readFileSync(envFile, 'utf-8').split('\n')) {
        const m = line.match(/^([A-Z_]+)=(.+)$/);
        if (m) env[m[1]] = m[2];
    }
    return env;
}

// ── Data fetch ──

async function fetchAllVideos(configs) {
    const all = [];
    for (const profile of configs) {
        if (!profile.appSecret) continue;
        let token;
        try { token = await requestOfficialAccessToken({ appId: profile.appId, appSecret: profile.appSecret }); }
        catch (e) { console.log(`  [${profile.profileId}] Token failed: ${e.message}`); continue; }

        let cursor = '0';
        let pageCount = 0;
        for (let page = 0; page < 100; page++) {
            const attempts = buildOfficialRequestAttempts({
                accessToken: token.access_token,
                appId: profile.appId,
                pageSize: 500,
                cursor
            });
            let done = false;
            for (const attempt of attempts) {
                let payload;
                try { payload = JSON.parse(await (await fetch(attempt.url)).text()); } catch { continue; }
                if (payload?.result === 1) {
                    const records = normalizeOfficialPayload(payload).records || [];
                    records.forEach(r => { r._profile = profile.profileId; });
                    all.push(...records);
                    cursor = String(payload?.pcursor || '0');
                    if (!shouldContinueOfficialPagination(records, cursor)) cursor = '0';
                    done = true;
                    pageCount++;
                    break;
                }
            }
            if (!done || cursor === '0') break;
            await new Promise(r => setTimeout(r, 300));
        }
        console.log(`  [${profile.profileId}] ${pageCount} pages fetched`);
    }
    return all;
}

// ── Format helpers ──

function fmtCount(n) {
    return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n);
}

function ctr(clicks, shows) {
    return shows > 0 ? (clicks / shows * 100).toFixed(1) : '0';
}

// ── Text generation ──

function generateTextCopy(topVideos) {
    const lines = ['🎉 挂载小程序达人榜 — 用数据说话！\n'];

    for (let i = 0; i < topVideos.length; i++) {
        const r = topVideos[i];
        const click = parseInt(r.clickCnt || 0) || 0;
        const play = parseInt(r.playCnt || 0) || 0;
        const fans = parseInt(r.fansCnt || 0) || 0;
        const show = parseInt(r.showCnt || 0) || 0;
        const profileName = PROFILE_NAMES[r._profile] || r._profile;
        const url = r.videoUrl || '';

        lines.push(`${MEDALS[i]} TOP ${i + 1}：@${r.authorName}（${fmtCount(fans)}粉丝）`);
        lines.push(`📊 组件点击 ${click} 次 | 播放 ${fmtCount(play)} | 点击率 ${ctr(click, show)}%`);
        lines.push(`💡 挂载任务：${profileName}`);
        if (url) lines.push(`🔗 ${url}`);
        lines.push('');
    }

    lines.push('💰 发视频时顺手挂载小程序，零成本额外收益！');
    lines.push('🚀 不知道挂哪个？群里问我，帮你匹配最合适的任务！');
    return lines.join('\n');
}

function generateGroupPost(topVideos) {
    const authorMentions = topVideos.map(r => `@${r.authorName}`).join(' ');
    const lines = ['📢 本期达人榜出炉！恭喜上榜的优秀创作者 🎉\n'];

    for (let i = 0; i < topVideos.length; i++) {
        const r = topVideos[i];
        const click = parseInt(r.clickCnt || 0) || 0;
        const play = parseInt(r.playCnt || 0) || 0;
        const url = r.videoUrl || '';
        lines.push(`${MEDALS[i]} @${r.authorName} — 组件点击${click}次 播放${fmtCount(play)}`);
        if (url) lines.push(`   ${url}`);
    }

    lines.push('');
    lines.push(`${authorMentions} 感谢你们的优质内容！`);
    lines.push('');
    lines.push('发视频时顺手挂载小程序，零成本额外收益！');
    lines.push('不知道挂哪个？群里问我～');
    lines.push('');
    lines.push('#星火计划 #试试看');
    return lines.join('\n');
}

function generateNarration(topVideos) {
    const segments = topVideos.map((r, i) => {
        const click = parseInt(r.clickCnt || 0) || 0;
        const play = parseInt(r.playCnt || 0) || 0;
        const fans = parseInt(r.fansCnt || 0) || 0;
        return `第${['一', '二', '三'][i]}名，${r.authorName}。${fmtCount(fans)}粉丝。视频播放${fmtCount(play)}次。小程序点击${click}次。`;
    });

    return `恭喜上榜的创作者！挂载小程序达人榜来了。${segments.join(' ')} 发视频时顺手挂载小程序，零成本额外收益！想参与的话，群里问我，帮你匹配最合适的任务！`;
}

// ── HTML card ──

function generateHtmlCard(topVideos) {
    const dateStr = new Date().toISOString().slice(0, 10);
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=375, initial-scale=1.0">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:375px; height:667px; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); font-family:-apple-system,sans-serif; color:#fff; padding:24px; display:flex; flex-direction:column; }
.header { text-align:center; margin-bottom:20px; }
.header h1 { font-size:22px; margin-bottom:6px; }
.header p { font-size:13px; opacity:0.8; }
.card { background:rgba(255,255,255,0.15); border-radius:16px; padding:18px; margin-bottom:14px; backdrop-filter:blur(10px); }
.rank { font-size:28px; float:left; margin-right:10px; line-height:1; }
.card .author { font-size:17px; font-weight:700; margin-bottom:4px; }
.card .stats { font-size:13px; opacity:0.9; line-height:1.6; }
.stats .highlight { color:#FFD700; font-weight:700; font-size:15px; }
.footer { margin-top:auto; text-align:center; font-size:14px; opacity:0.9; padding:10px; }
.footer .cta { font-size:18px; font-weight:700; color:#FFD700; margin-bottom:6px; }
</style>
</head>
<body>
<div class="header">
  <h1>🏆 挂载小程序达人榜</h1>
  <p>近 30 天 · ${dateStr} · 真实数据</p>
</div>
${topVideos.map((r, i) => {
        const click = parseInt(r.clickCnt || 0) || 0;
        const play = parseInt(r.playCnt || 0) || 0;
        const fans = parseInt(r.fansCnt || 0) || 0;
        const show = parseInt(r.showCnt || 0) || 0;
        return `<div class="card">
  <span class="rank">${MEDALS[i]}</span>
  <div class="author">@${r.authorName}</div>
  <div class="stats">
    组件点击 <span class="highlight">${click}</span> 次 · 播放 ${fmtCount(play)} · 点击率 <span class="highlight">${ctr(click, show)}%</span><br>
    粉丝 ${fmtCount(fans)} · 挂载：${PROFILE_NAMES[r._profile] || r._profile}
  </div>
</div>`;
    }).join('\n')}
<div class="footer">
  <div class="cta">发视频挂小程序 零成本带量！</div>
  <div>不知道挂哪个？群里问我</div>
</div>
</body></html>`;
}

// ── ffmpeg resolver ──

function resolveFFmpeg() {
    const candidates = [
        join(PROJECT_DIR, 'node_modules', 'ffmpeg-static', 'ffmpeg'),
        '/opt/homebrew/bin/ffmpeg',
        '/usr/local/bin/ffmpeg'
    ];
    for (const p of candidates) {
        if (existsSync(p)) return p;
    }
    const which = spawnSync('which', ['ffmpeg']);
    if (which.status === 0) return which.stdout.toString().trim();
    return null;
}

function resolveFFprobe() {
    const candidates = [
        join(PROJECT_DIR, 'node_modules', 'ffprobe-static', 'ffprobe'),
        '/opt/homebrew/bin/ffprobe',
        '/usr/local/bin/ffprobe'
    ];
    for (const p of candidates) {
        if (existsSync(p)) return p;
    }
    const which = spawnSync('which', ['ffprobe']);
    if (which.status === 0) return which.stdout.toString().trim();
    return null;
}

// ── Video generation ──

async function generateVideo(topVideos, outputDir, ffmpeg, ffprobe) {
    const htmlContent = generateHtmlCard(topVideos);
    const htmlFile = join(outputDir, 'promo-card.html');
    writeFileSync(htmlFile, htmlContent, 'utf-8');

    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 3 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    const screenshotFile = join(outputDir, 'promo-card.png');
    await page.screenshot({ path: screenshotFile });
    await browser.close();
    console.log(`  Screenshot: ${screenshotFile}`);

    const narrationText = generateNarration(topVideos);
    console.log(`  Narration (${narrationText.length} chars): ${narrationText.slice(0, 60)}...`);

    const audioFile = join(outputDir, 'narration.aiff');
    const audioM4a = join(outputDir, 'narration.m4a');
    const dateStr = new Date().toISOString().slice(0, 10);
    const videoFile = join(outputDir, `success-story-${dateStr}.mp4`);

    // TTS — use say with file output, slower rate for completeness
    const safeText = narrationText.replace(/"/g, '\\"');
    execSync(`say -v Ting-Ting -r 180 -o "${audioFile}" "${safeText}"`);

    // Convert AIFF to M4A using ffmpeg (afconvert is unreliable after reboots)
    execSync(`"${ffmpeg}" -y -i "${audioFile}" -c:a aac -b:a 128k "${audioM4a}"`);

    // Get audio duration
    let duration;
    if (ffprobe) {
        const durationStr = execSync(`"${ffprobe}" -v quiet -show_entries format=duration -of csv=p=0 "${audioM4a}"`).toString().trim();
        duration = parseFloat(durationStr) + 1.0;
    } else {
        // Estimate: ~5 chars/sec for Chinese TTS at rate 180
        duration = Math.ceil(narrationText.length / 4.5) + 2;
    }
    console.log(`  Audio duration: ~${duration.toFixed(1)}s`);

    // Compose video — use audio duration + 1s padding, no -shortest
    execSync(`"${ffmpeg}" -y -loop 1 -i "${screenshotFile}" -i "${audioM4a}" -t ${duration} -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k "${videoFile}"`);
    console.log(`  Video: ${videoFile}`);

    return { screenshotFile, videoFile, htmlFile };
}

// ── Email ──

function sendEmail(subject, recipient, bodyFile, attachments = []) {
    const sendEmailScript = join(HARNESS_DIR, 'scripts', 'send-email.py');
    const attachArgs = attachments.flatMap(a => ['-a', a]);
    const result = spawnSync('python3', [sendEmailScript, ...attachArgs, subject, recipient, bodyFile], {
        stdio: 'inherit',
        cwd: PROJECT_DIR
    });
    return result.status === 0;
}

// ── Kuaishou video publishing (Open Platform API) ──

async function publishToKuaishou(videoFile, coverFile, caption) {
    console.log('Publishing video to Kuaishou...');

    // 1. Get token from cloud server
    const tokenResp = await fetch(KS_TOKEN_URL);
    const tokenData = await tokenResp.json();
    const token = tokenData.access_token;
    if (!token) throw new Error('No Kuaishou access token available');
    console.log(`  Token OK (expired: ${tokenData.access_token_expired})`);

    if (tokenData.access_token_expired) {
        console.log('  Token expired — attempting refresh...');
        const refreshResp = await fetch(KS_TOKEN_URL.replace('/token', '/refresh'));
        const refreshData = await refreshResp.json();
        if (!refreshData.access_token) throw new Error('Token refresh failed');
    }

    // Re-fetch token after potential refresh
    const freshTokenResp = await fetch(KS_TOKEN_URL);
    const freshTokenData = await freshTokenResp.json();
    const freshToken = freshTokenData.access_token;
    if (freshTokenData.access_token_expired) throw new Error('Token still expired after refresh');

    // 2. Start upload
    console.log('  Starting upload...');
    const startResp = await fetch(`${KS_BASE}/openapi/photo/start_upload?access_token=${freshToken}&app_id=${KS_APP_ID}`, { method: 'POST' });
    const startData = await startResp.json();
    if (startData.result !== 1) throw new Error(`Start upload failed: ${JSON.stringify(startData)}`);
    const uploadToken = startData.upload_token;
    const endpoint = startData.endpoint;

    // 3. Upload video binary
    const videoBuffer = readFileSync(videoFile);
    console.log(`  Uploading video (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);
    const uploadResp = await fetch(`http://${endpoint}/api/upload?upload_token=${uploadToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'video/mp4' },
        body: videoBuffer
    });
    const uploadData = await uploadResp.json();
    if (uploadData.result !== 1) throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);

    // 4. Publish with cover + caption (multipart)
    console.log('  Publishing...');
    const coverBuffer = readFileSync(coverFile);
    const boundary = '----FormBoundary' + Date.now();
    const CRLF = '\r\n';

    const parts = [];
    parts.push(`--${boundary}${CRLF}`);
    parts.push(`Content-Disposition: form-data; name="cover"; filename="cover.png"${CRLF}`);
    parts.push(`Content-Type: image/png${CRLF}`);
    parts.push(CRLF);
    const coverHeader = Buffer.from(parts.join(''));

    const captionParts = [];
    captionParts.push(`${CRLF}--${boundary}${CRLF}`);
    captionParts.push(`Content-Disposition: form-data; name="caption"${CRLF}`);
    captionParts.push(CRLF);
    captionParts.push(caption);
    captionParts.push(`${CRLF}--${boundary}--${CRLF}`);
    const captionBuf = Buffer.from(captionParts.join(''));

    const body = Buffer.concat([coverHeader, coverBuffer, captionBuf]);

    const publishResp = await fetch(
        `${KS_BASE}/openapi/photo/publish?access_token=${freshToken}&app_id=${KS_APP_ID}&upload_token=${uploadToken}`,
        {
            method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
            body
        }
    );
    const publishData = await publishResp.json();

    if (publishData.result === 1) {
        const photoId = publishData.video_info?.photo_id || '';
        console.log(`  Published! photo_id: ${photoId}`);
        return { success: true, photoId };
    }

    throw new Error(`Publish failed: ${JSON.stringify(publishData)}`);
}

// ── Main ──

async function main() {
    const opts = parseArgs();
    const cronEnv = loadCronEnv();
    const recipient = opts.recipient || cronEnv.KUAISHOU_FOLLOW_REPORT_TO || 'jackandking@163.com';

    console.log(`[daily-success-story] ${new Date().toISOString()}`);
    console.log(`  recipient=${recipient}, minClicks=${opts.minClicks}, top=${opts.topN}, days=${opts.days}`);

    mkdirSync(OUTPUT_DIR, { recursive: true });

    // Load app configs (merge cron.env secrets)
    const configFile = join(STATE_DIR, 'app-config.local.json');
    const envSecrets = loadCronEnv();
    const mergedEnv = { ...process.env, ...envSecrets };
    const configs = loadFollowAppConfigs({ configFile, env: mergedEnv });
    console.log(`  Loaded ${configs.length} profiles`);

    // Fetch all videos
    console.log('Fetching video data...');
    const allRecords = await fetchAllVideos(configs);
    console.log(`  Total: ${allRecords.length} videos`);

    // Filter by date range
    const cutoff = new Date(Date.now() - opts.days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const recent = allRecords.filter(r => (r.date || '') >= cutoff);
    console.log(`  In range (${opts.days}d): ${recent.length}`);

    // Sort by clicks, apply threshold
    const byClick = [...recent].sort((a, b) => (parseInt(b.clickCnt || 0) || 0) - (parseInt(a.clickCnt || 0) || 0));
    const qualified = byClick.filter(r => (parseInt(r.clickCnt || 0) || 0) >= opts.minClicks);

    // Dedup — skip recently featured videos
    const featured = loadFeaturedVideos();
    pruneFeaturedOlderThan(featured, 90);
    const fresh = qualified.filter(r => {
        const key = r.videoId || r.videoUrl || '';
        return key && !featured[key];
    });

    const topVideos = fresh.slice(0, opts.topN);

    if (topVideos.length === 0) {
        console.log('No new videos meeting threshold. Skipping.');
        process.exit(0);
    }

    console.log(`Found ${topVideos.length} videos to feature:`);
    for (const r of topVideos) {
        console.log(`  @${r.authorName} — ${r.clickCnt} clicks, ${r.playCnt} plays`);
    }

    if (opts.dryRun) {
        console.log('[dry-run] Would generate story. Exiting.');
        process.exit(0);
    }

    // Generate text outputs
    const dateStr = new Date().toISOString().slice(0, 10);
    const textBody = generateTextCopy(topVideos);
    const textFile = join(OUTPUT_DIR, `success-story-${dateStr}.txt`);
    writeFileSync(textFile, textBody, 'utf-8');
    console.log(`Text: ${textFile}`);

    const groupPost = generateGroupPost(topVideos);
    const groupPostFile = join(OUTPUT_DIR, `group-post-${dateStr}.txt`);
    writeFileSync(groupPostFile, groupPost, 'utf-8');
    console.log(`Group post: ${groupPostFile}`);

    // Generate email body with both copies
    const emailBody = [
        textBody,
        '\n' + '─'.repeat(40),
        '📋 以下可直接复制发到快手客户群：\n',
        groupPost
    ].join('\n');
    const emailBodyFile = join(OUTPUT_DIR, `email-body-${dateStr}.txt`);
    writeFileSync(emailBodyFile, emailBody, 'utf-8');

    // Generate video
    const ffmpeg = resolveFFmpeg();
    let videoResult = null;
    if (ffmpeg) {
        const ffprobe = resolveFFprobe();
        console.log(`Generating video (ffmpeg=${ffmpeg})...`);
        try {
            videoResult = await generateVideo(topVideos, OUTPUT_DIR, ffmpeg, ffprobe);
        } catch (e) {
            console.error(`Video generation failed: ${e.message}`);
        }
    } else {
        console.log('No ffmpeg available — skipping video generation');
    }

    // Publish to Kuaishou (if --publish-video and video was generated)
    let publishResult = null;
    if (opts.publishVideo && videoResult?.videoFile && videoResult?.screenshotFile) {
        const caption = generateGroupPost(topVideos);
        try {
            publishResult = await publishToKuaishou(videoResult.videoFile, videoResult.screenshotFile, caption);
        } catch (e) {
            console.error(`Kuaishou publish failed: ${e.message}`);
        }
    }

    // Send email
    const attachments = [];
    if (videoResult?.videoFile && existsSync(videoResult.videoFile)) {
        attachments.push(videoResult.videoFile);
    }
    if (videoResult?.screenshotFile && existsSync(videoResult.screenshotFile)) {
        attachments.push(videoResult.screenshotFile);
    }

    // Append publish result to email body if published
    if (publishResult?.success) {
        const publishNote = `\n\n📹 视频已自动发布到快手 (photo_id: ${publishResult.photoId})`;
        writeFileSync(emailBodyFile, emailBody + publishNote, 'utf-8');
    }

    const emailSubject = `[试试看AI] 达人榜 Top ${topVideos.length} — 成功故事 ${dateStr}`;
    console.log(`Sending email to ${recipient}...`);
    sendEmail(emailSubject, recipient, emailBodyFile, attachments);

    // Update dedup registry
    for (const r of topVideos) {
        const key = r.videoId || r.videoUrl || '';
        if (key) {
            featured[key] = {
                authorName: r.authorName,
                clickCnt: r.clickCnt,
                featuredAt: new Date().toISOString()
            };
        }
    }
    saveFeaturedVideos(featured);

    console.log('\nDone!');
    console.log(`  Text: ${textFile}`);
    console.log(`  Group post: ${groupPostFile}`);
    if (videoResult) {
        console.log(`  Image: ${videoResult.screenshotFile}`);
        console.log(`  Video: ${videoResult.videoFile}`);
    }
    if (publishResult?.success) {
        console.log(`  Published to Kuaishou: photo_id=${publishResult.photoId}`);
    }
}

main().catch(err => {
    console.error(`[daily-success-story] Fatal: ${err.message}`);
    process.exit(1);
});
