#!/usr/bin/env node
/**
 * ad-data-collector.js
 *
 * Fetches ad revenue data from Kuaishou mini-program API for all profiles.
 * Uses the same app_id/app_secret as kuaishou-follow (from cron.env).
 *
 * Output: .automation/.local/state/ad-data-summary.json
 *
 * Data source: live API call to
 *   POST https://open.kuaishou.com/openapi/mp/developer/ad/data/query
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.resolve(__dirname, '../..');
const PROD_DIR = process.env.PROD_DIR || REPO_DIR;
const OUTPUT_FILE = path.join(REPO_DIR, '.automation', '.local', 'state', 'ad-data-summary.json');

const APP_CONFIG_FILE = path.join(PROD_DIR, '.harness', '.local', 'state', 'kuaishou-follow', 'app-config.local.json');
const CRON_ENV_FILE = path.join(PROD_DIR, '.harness', '.local', 'state', 'kuaishou-follow', 'cron.env');

const TOKEN_URL = 'https://open.kuaishou.com/oauth2/access_token';
const AD_DATA_URL = 'https://open.kuaishou.com/openapi/mp/developer/ad/data/query';
const DAYS_BACK = 7;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadAppConfigs() {
  if (!fs.existsSync(APP_CONFIG_FILE)) return [];
  const configs = JSON.parse(fs.readFileSync(APP_CONFIG_FILE, 'utf-8'));

  let envVars = {};
  if (fs.existsSync(CRON_ENV_FILE)) {
    const lines = fs.readFileSync(CRON_ENV_FILE, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) envVars[match[1]] = match[2];
    }
  }

  return configs.map(c => ({
    profileId: c.profileId,
    appId: c.appId,
    appSecret: c.appSecret || envVars[c.appSecretEnv] || '',
  })).filter(c => c.appId && c.appSecret);
}

async function getAccessToken(appId, appSecret) {
  const url = `${TOKEN_URL}?app_id=${appId}&app_secret=${encodeURIComponent(appSecret)}&grant_type=client_credentials`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.result !== 1) throw new Error(`Token failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function fetchAdData(appId, token, startMs, endMs) {
  const url = `${AD_DATA_URL}?app_id=${appId}&access_token=${token}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startTime: startMs, endTime: endMs, type: 0, page: 1, pageSize: 100 }),
  });
  return resp.json();
}

async function collectProfile(config, startMs, endMs) {
  const token = await getAccessToken(config.appId, config.appSecret);
  const result = await fetchAdData(config.appId, token, startMs, endMs);

  if (result.result !== 1) {
    return { error: result.error_msg || `result=${result.result}` };
  }

  const items = result.data?.items || [];
  let totalPulls = 0, totalImpressions = 0, totalClicks = 0, totalRevenue = 0;
  const dailyData = [];

  for (const item of items) {
    totalPulls += item.queryCnt || 0;
    totalImpressions += item.impression || 0;
    totalClicks += item.click || 0;
    totalRevenue += item.costTotal || 0;
    dailyData.push({
      date: item.date,
      pulls: item.queryCnt,
      impressions: item.impression,
      clicks: item.click,
      ecpm: item.ecpm,
      revenue: item.costTotal,
    });
  }

  return {
    appId: config.appId,
    totalPulls,
    totalImpressions,
    totalClicks,
    totalRevenue: +totalRevenue.toFixed(2),
    avgEcpm: totalImpressions > 0 ? +(totalRevenue / totalImpressions * 1000).toFixed(2) : 0,
    clickRate: totalImpressions > 0 ? +(totalClicks / totalImpressions * 100).toFixed(2) : 0,
    days: dailyData.length,
    dailyData,
  };
}

async function main() {
  console.log('[ad-data] Loading app configs...');
  const configs = loadAppConfigs();
  if (configs.length === 0) {
    console.log('[ad-data] No app configs found, skipping');
    process.exit(0);
  }
  console.log(`[ad-data] Found ${configs.length} profiles`);

  const now = new Date();
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - DAYS_BACK);
  const startMs = start.getTime();
  const endMs = end.getTime() - 1;

  console.log(`[ad-data] Fetching ${DAYS_BACK} days: ${start.toISOString().slice(0,10)} to ${new Date(endMs).toISOString().slice(0,10)}`);

  const profiles = {};
  let totalRevenue = 0;

  for (const config of configs) {
    try {
      const data = await collectProfile(config, startMs, endMs);
      profiles[config.profileId] = data;
      if (data.totalRevenue) {
        totalRevenue += data.totalRevenue;
        console.log(`[ad-data] ${config.profileId}: pulls=${data.totalPulls}, impressions=${data.totalImpressions}, clicks=${data.totalClicks}, revenue=${data.totalRevenue}元, ecpm=${data.avgEcpm}`);
      } else if (data.error) {
        console.log(`[ad-data] ${config.profileId}: ERROR ${data.error}`);
      } else {
        console.log(`[ad-data] ${config.profileId}: no revenue data`);
      }
    } catch (err) {
      console.error(`[ad-data] ${config.profileId}: ${err.message}`);
      profiles[config.profileId] = { error: err.message };
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    dateRange: { start: start.toISOString().slice(0,10), end: new Date(endMs).toISOString().slice(0,10), days: DAYS_BACK },
    totalRevenue: +totalRevenue.toFixed(2),
    profiles,
  };

  ensureDir(path.dirname(OUTPUT_FILE));
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`\n[ad-data] Total revenue (${DAYS_BACK}d): ${totalRevenue.toFixed(2)}元`);
  console.log(`[ad-data] Summary written to ${OUTPUT_FILE}`);
}

main().catch(e => { console.error('[ad-data] Fatal:', e.message); process.exit(1); });
