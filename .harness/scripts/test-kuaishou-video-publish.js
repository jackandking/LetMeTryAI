#!/usr/bin/env node
/**
 * Test script for Kuaishou Open API video publish flow.
 * Run from prod directory.
 */
import fs from 'fs';
import path from 'path';

const APP_ID = 'ks683421244533878879';
const TOKEN_URL = 'https://letmetry.cloud/oauth/kuaishou/token';
const BASE = 'https://open.kuaishou.com';

const VIDEO_DIR = '.harness/.local/hot-task-video/nostalgia-classic-songs';
const VIDEO_FILE = path.join(VIDEO_DIR, 'nostalgia-classic-songs-kuaishou-hot-task-video.mp4');
const COVER_FILE = path.join(VIDEO_DIR, 'nostalgia-classic-songs-kuaishou-hot-task-video-reference-frame.png');

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  // 1. Get token
  console.log('Step 1: Getting token...');
  const tokenResp = await fetch(TOKEN_URL);
  const tokenData = await tokenResp.json();
  const token = tokenData.access_token;
  if (!token) { console.error('No token!'); process.exit(1); }
  console.log('  Token OK, expired:', tokenData.access_token_expired);

  // 2. Start upload
  console.log('Step 2: Starting upload...');
  const startResp = await fetch(BASE + '/openapi/photo/start_upload?access_token=' + token + '&app_id=' + APP_ID, { method: 'POST' });
  const startData = await startResp.json();
  console.log('  result:', startData.result);
  if (startData.result !== 1) { console.error('Start upload failed:', JSON.stringify(startData)); process.exit(1); }
  const uploadToken = startData.upload_token;
  const endpoint = startData.endpoint;
  console.log('  upload_token:', uploadToken);
  console.log('  endpoint:', endpoint);

  // 3. Upload video
  console.log('Step 3: Uploading video...');
  const videoBuffer = fs.readFileSync(VIDEO_FILE);
  console.log('  Video size:', (videoBuffer.length / 1024 / 1024).toFixed(2), 'MB');

  if (dryRun) {
    console.log('  [DRY-RUN] Skipping upload and publish');
    return;
  }

  const uploadResp = await fetch('http://' + endpoint + '/api/upload?upload_token=' + uploadToken, {
    method: 'POST',
    headers: { 'Content-Type': 'video/mp4' },
    body: videoBuffer,
  });
  const uploadData = await uploadResp.json();
  console.log('  Upload result:', uploadData.result);
  if (uploadData.result !== 1) { console.error('Upload failed:', JSON.stringify(uploadData)); process.exit(1); }

  // 4. Publish video
  console.log('Step 4: Publishing...');
  const caption = '经典老歌投票\n\n#经典老歌投票 #老人爱 #星火计划\n\n热门投票互动小程序「经典老歌投票」上线啦！点击左下角链接即可参与投票体验广告效果。';
  const coverBuffer = fs.readFileSync(COVER_FILE);

  const boundary = '----FormBoundary' + Date.now();
  const CRLF = '\r\n';

  const parts = [];
  // cover
  parts.push('--' + boundary + CRLF);
  parts.push('Content-Disposition: form-data; name="cover"; filename="cover.png"' + CRLF);
  parts.push('Content-Type: image/png' + CRLF);
  parts.push(CRLF);
  const coverHeader = Buffer.from(parts.join(''));

  // caption
  const captionParts = [];
  captionParts.push(CRLF + '--' + boundary + CRLF);
  captionParts.push('Content-Disposition: form-data; name="caption"' + CRLF);
  captionParts.push(CRLF);
  captionParts.push(caption);
  captionParts.push(CRLF + '--' + boundary + '--' + CRLF);
  const captionBuf = Buffer.from(captionParts.join(''));

  const body = Buffer.concat([coverHeader, coverBuffer, captionBuf]);

  const publishResp = await fetch(
    BASE + '/openapi/photo/publish?access_token=' + token + '&app_id=' + APP_ID + '&upload_token=' + uploadToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
      body: body,
    }
  );
  const publishData = await publishResp.json();
  console.log('  Publish response:', JSON.stringify(publishData, null, 2));

  if (publishData.result === 1) {
    console.log('\nSUCCESS! Video published.');
    console.log('  photo_id:', publishData.video_info?.photo_id);
  } else {
    console.log('\nFAILED. Status:', publishData.result);
  }
}

main().catch(e => console.error('ERROR:', e.message));
