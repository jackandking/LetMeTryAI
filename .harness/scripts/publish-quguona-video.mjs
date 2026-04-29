#!/usr/bin/env node
/**
 * Record a demo video of "去过哪" app and publish to Kuaishou.
 * Run from prod directory on 192.168.1.6.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_URL = 'https://letmetryai.cn/quguona/';
const KS_APP_ID = 'ks683421244533878879';
const MINI_APP_ID = 'ks655273748878573030'; // 人人爱男人宝
const TOKEN_URL = 'https://letmetry.cloud/oauth/kuaishou/token';
const BASE = 'https://open.kuaishou.com';
const OUTPUT_DIR = path.join(__dirname, '../.local/hot-task-video/quguona');

const CAPTION = `你去过中国多少个省？来标记一下你的足迹吧！

#去过哪 #中国足迹地图 #旅行打卡 #互动小程序

点击左下角链接，标记你去过的省份，生成专属足迹地图！`;

async function recordVideo() {
  console.log('Step 1: Recording demo video...');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 360, height: 640 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1080, height: 1920 },
    },
  });

  const page = await context.newPage();
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Interact: click several provinces
  const provinces = ['北京', '上海', '广东', '四川', '云南', '浙江', '海南', '山东'];
  for (const name of provinces) {
    const tag = page.locator(`.province-tag:has-text("${name}")`);
    if (await tag.isVisible()) {
      await tag.click();
      await page.waitForTimeout(600);
    }
  }

  await page.waitForTimeout(1500);

  // Scroll to show the map with highlights
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(2000);

  // Click generate button
  const genBtn = page.locator('#generate-btn');
  if (await genBtn.isVisible()) {
    await genBtn.click();
    await page.waitForTimeout(3000);
  }

  // Close context to save video
  const video = page.video();
  await context.close();
  await browser.close();

  const videoPath = await video.path();
  const finalPath = path.join(OUTPUT_DIR, 'quguona-demo.mp4');
  fs.renameSync(videoPath, finalPath);
  console.log('  Video saved:', finalPath, `(${(fs.statSync(finalPath).size / 1024 / 1024).toFixed(2)} MB)`);

  // Take a cover screenshot separately
  const browser2 = await chromium.launch({ headless: true });
  const ctx2 = await browser2.newContext({
    viewport: { width: 360, height: 640 },
  });
  const page2 = await ctx2.newPage();
  await page2.goto(APP_URL, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1000);
  // Click some provinces for the cover
  for (const name of ['北京', '上海', '广东', '四川', '浙江']) {
    const tag = page2.locator(`.province-tag:has-text("${name}")`);
    if (await tag.isVisible()) await tag.click();
    await page2.waitForTimeout(200);
  }
  await page2.waitForTimeout(500);
  const coverPath = path.join(OUTPUT_DIR, 'quguona-cover.png');
  await page2.screenshot({ path: coverPath });
  await browser2.close();
  console.log('  Cover saved:', coverPath);

  return { videoPath: finalPath, coverPath };
}

async function publishVideo(videoPath, coverPath) {
  // Get token
  console.log('Step 2: Getting token...');
  const tokenResp = await fetch(TOKEN_URL);
  const tokenData = await tokenResp.json();
  const token = tokenData.access_token;
  if (!token) { console.error('No token!', tokenData); process.exit(1); }
  console.log('  Token OK, expired:', tokenData.access_token_expired);

  // Start upload
  console.log('Step 3: Starting upload...');
  const startResp = await fetch(BASE + '/openapi/photo/start_upload?access_token=' + token + '&app_id=' + KS_APP_ID, { method: 'POST' });
  const startData = await startResp.json();
  if (startData.result !== 1) { console.error('Start upload failed:', startData); process.exit(1); }
  const uploadToken = startData.upload_token;
  const endpoint = startData.endpoint;
  console.log('  endpoint:', endpoint);

  // Upload video
  console.log('Step 4: Uploading video...');
  const videoBuffer = fs.readFileSync(videoPath);
  console.log('  Size:', (videoBuffer.length / 1024 / 1024).toFixed(2), 'MB');
  const uploadResp = await fetch('http://' + endpoint + '/api/upload?upload_token=' + uploadToken, {
    method: 'POST',
    headers: { 'Content-Type': 'video/mp4' },
    body: videoBuffer,
  });
  const uploadData = await uploadResp.json();
  if (uploadData.result !== 1) { console.error('Upload failed:', uploadData); process.exit(1); }
  console.log('  Upload OK');

  // Publish
  console.log('Step 5: Publishing...');
  const coverBuffer = fs.readFileSync(coverPath);
  const boundary = '----FormBoundary' + Date.now();
  const CRLF = '\r\n';

  const parts = [];
  parts.push('--' + boundary + CRLF);
  parts.push('Content-Disposition: form-data; name="cover"; filename="cover.png"' + CRLF);
  parts.push('Content-Type: image/png' + CRLF);
  parts.push(CRLF);
  const coverHeader = Buffer.from(parts.join(''));

  const captionParts = [];
  captionParts.push(CRLF + '--' + boundary + CRLF);
  captionParts.push('Content-Disposition: form-data; name="caption"' + CRLF);
  captionParts.push(CRLF);
  captionParts.push(CAPTION);
  captionParts.push(CRLF + '--' + boundary + '--' + CRLF);
  const captionBuf = Buffer.from(captionParts.join(''));

  const body = Buffer.concat([coverHeader, coverBuffer, captionBuf]);

  const publishResp = await fetch(
    BASE + '/openapi/photo/publish?access_token=' + token + '&app_id=' + KS_APP_ID + '&upload_token=' + uploadToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
      body: body,
    }
  );
  const publishData = await publishResp.json();
  console.log('  Publish response:', JSON.stringify(publishData, null, 2));

  if (publishData.result !== 1) { console.error('Publish failed!'); process.exit(1); }
  const photoId = publishData.video_info?.photo_id;
  console.log('  photo_id:', photoId);

  // Bind mini-app (wait 60s)
  console.log('Step 6: Waiting 60s before binding mini-app...');
  await new Promise(r => setTimeout(r, 60000));

  const bindParams = new URLSearchParams({
    access_token: token,
    app_id: KS_APP_ID,
    photo_id: photoId,
    plc_mp_app_id: MINI_APP_ID,
    plc_title: '去过哪 - 中国足迹地图',
    plc_mp_path: 'pages/rewardedWebview/rewardedWebview?target=quguona&showAd=true',
  });

  const bindResp = await fetch(BASE + '/openapi/photo/mp_plc/bind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bindParams.toString(),
  });
  const bindData = await bindResp.json();
  console.log('  Bind response:', JSON.stringify(bindData));

  if (bindData.result === 1 || bindData.result === 10001005) {
    console.log('\nSUCCESS! Video published and mini-app bound.');
  } else {
    console.log('\nWARNING: Bind may have failed:', bindData);
  }

  return photoId;
}

async function main() {
  const { videoPath, coverPath } = await recordVideo();
  await publishVideo(videoPath, coverPath);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
