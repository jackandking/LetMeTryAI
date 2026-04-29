#!/usr/bin/env node
/**
 * Profile Frequency Allocator
 *
 * Reads ad revenue data and allocates daily app slots proportional to
 * revenue-per-app. High-eCPM profiles get more slots, low-eCPM profiles
 * get fewer (minimum 0.5 = every other day).
 *
 * Output: .automation/.local/state/profile-slots.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(PROJECT_DIR, '.automation', '.local', 'state');

const TOTAL_DAILY_SLOTS = 4;
const MIN_SLOTS = 0.5;

const AD_DATA_FILE = path.join(STATE_DIR, 'ad-data-summary.json');
const OUTPUT_FILE = path.join(STATE_DIR, 'profile-slots.json');

const ALL_PROFILES = ['nanrenbao', 'womanai', 'parent-tools', 'elder-love'];

function loadAdData() {
    if (!fs.existsSync(AD_DATA_FILE)) {
        console.log('[allocator] No ad-data-summary.json found, skipping');
        return null;
    }
    return JSON.parse(fs.readFileSync(AD_DATA_FILE, 'utf-8'));
}

function computeRevenuePerApp(adData) {
    const days = adData.dateRange?.days || 7;
    const results = [];

    for (const profileId of ALL_PROFILES) {
        const profile = adData.profiles?.[profileId];
        if (!profile) {
            results.push({ profileId, revenuePerApp: 0, totalRevenue: 0 });
            continue;
        }
        const totalRevenue = profile.totalRevenue || 0;
        const appsPerWeek = days;
        const revenuePerApp = appsPerWeek > 0 ? totalRevenue / appsPerWeek : 0;
        results.push({ profileId, revenuePerApp, totalRevenue, ecpm: profile.avgEcpm || 0 });
    }

    return results.sort((a, b) => b.revenuePerApp - a.revenuePerApp);
}

function allocateSlots(ranked) {
    const allocation = {};
    const n = ranked.length;

    if (n === 0) return allocation;

    const median = ranked[Math.floor(n / 2)].revenuePerApp;

    let slotsAssigned = 0;

    for (const p of ranked) {
        if (p.revenuePerApp >= median && p.revenuePerApp > 0) {
            allocation[p.profileId] = { slotsPerDay: 1, schedule: 'daily' };
            slotsAssigned += 1;
        } else {
            allocation[p.profileId] = { slotsPerDay: MIN_SLOTS, schedule: 'alternate' };
            slotsAssigned += MIN_SLOTS;
        }
    }

    let remaining = TOTAL_DAILY_SLOTS - slotsAssigned;
    for (const p of ranked) {
        if (remaining <= 0) break;
        if (allocation[p.profileId].schedule === 'daily') {
            allocation[p.profileId].slotsPerDay += 0.5;
            allocation[p.profileId].schedule = 'daily+alternate';
            remaining -= 0.5;
        }
    }

    let dayToggle = 0;
    for (const p of ranked) {
        const a = allocation[p.profileId];
        if (a.schedule === 'alternate') {
            a.schedule = dayToggle % 2 === 0 ? 'alternate-even' : 'alternate-odd';
            dayToggle++;
        }
    }

    return allocation;
}

function main() {
    const adData = loadAdData();
    if (!adData) {
        process.exit(0);
    }

    const ranked = computeRevenuePerApp(adData);
    console.log('[allocator] Revenue/app ranking:');
    for (const r of ranked) {
        console.log(`  ${r.profileId}: ¥${r.revenuePerApp.toFixed(3)}/app (total ¥${r.totalRevenue.toFixed(2)}, eCPM ¥${r.ecpm})`);
    }

    const allocation = allocateSlots(ranked);

    const reasoning = ranked
        .map(r => `${r.profileId} ¥${r.revenuePerApp.toFixed(2)}/app`)
        .join(', ');

    const output = {
        generatedAt: new Date().toISOString(),
        totalDailySlots: TOTAL_DAILY_SLOTS,
        allocation,
        reasoning
    };

    const prev = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf-8') : '';
    const next = JSON.stringify(output, null, 2);

    if (prev.trim() === next.trim()) {
        console.log('[allocator] No change from previous allocation');
        return;
    }

    fs.writeFileSync(OUTPUT_FILE, next + '\n');
    console.log('[allocator] Written:', OUTPUT_FILE);
    console.log('[allocator] Allocation:');
    for (const [id, a] of Object.entries(allocation)) {
        console.log(`  ${id}: ${a.slotsPerDay} slots/day (${a.schedule})`);
    }
}

main();
