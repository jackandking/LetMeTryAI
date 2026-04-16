/**
 * Usage Report Builder — 创作者采纳度报告
 *
 * 核心指标：已履单达人数量、已发布作品数（哪些 idea 最受短视频创作者欢迎）
 * 曝光/点击仅作为参考（取决于创作者本身的受欢迎度，不反映 idea 质量）
 *
 * 确定性操作，不需要 AI。
 */

import fs from 'fs';
import path from 'path';

/**
 * Parse a numeric string (with possible commas) into a number, or 0.
 */
function toNum(val) {
    if (val == null || val === '--') return 0;
    return parseInt(String(val).replace(/,/g, ''), 10) || 0;
}

/**
 * Load the latest kuaishou report JSON for a given date.
 * Falls back to the most recent file if today's doesn't exist.
 *
 * @param {string} metricsDir - directory containing kuaishou_report_YYYY-MM-DD.json
 * @param {string} dateStr - target date YYYY-MM-DD
 * @returns {{ data: object|null, date: string|null, filePath: string|null }}
 */
export function loadKuaishouReport(metricsDir, dateStr) {
    const exactPath = path.join(metricsDir, `kuaishou_report_${dateStr}.json`);
    if (fs.existsSync(exactPath)) {
        return {
            data: JSON.parse(fs.readFileSync(exactPath, 'utf-8')),
            date: dateStr,
            filePath: exactPath,
        };
    }

    // Fallback: find the most recent file
    const files = fs.readdirSync(metricsDir)
        .filter(f => f.startsWith('kuaishou_report_') && f.endsWith('.json'))
        .sort();

    if (files.length === 0) {
        return { data: null, date: null, filePath: null };
    }

    const latest = files[files.length - 1];
    const latestDate = latest.replace('kuaishou_report_', '').replace('.json', '');
    const latestPath = path.join(metricsDir, latest);
    return {
        data: JSON.parse(fs.readFileSync(latestPath, 'utf-8')),
        date: latestDate,
        filePath: latestPath,
    };
}

/**
 * Build a creator-adoption-focused usage report from kuaishou data.
 *
 * @param {string} reportDate - the date label for this report
 * @param {object} kuaishouReport - parsed kuaishou_report JSON (has .allTasks, .summary)
 * @returns {object} unified report
 */
export function buildUsageReport(reportDate, kuaishouReport) {
    const allTasks = kuaishouReport.allTasks || [];
    const tasksWithData = allTasks.filter(t => t.stats && typeof t.stats.error === 'undefined');

    // Per-task adoption metrics
    const taskMetrics = tasksWithData.map(t => ({
        planId: t.planId,
        name: t.name,
        source: t.source,
        status: t.status,
        daren: toNum(t.stats['已履单达人数量']),
        works: toNum(t.stats['已发布作品数']),
        exposure: toNum(t.stats['组件曝光数']),
        clicks: toNum(t.stats['组件点击数']),
    }));

    // Totals
    const totalDaren = taskMetrics.reduce((s, t) => s + t.daren, 0);
    const totalWorks = taskMetrics.reduce((s, t) => s + t.works, 0);
    const totalExposure = taskMetrics.reduce((s, t) => s + t.exposure, 0);
    const totalClicks = taskMetrics.reduce((s, t) => s + t.clicks, 0);

    // Rankings
    const byDaren = [...taskMetrics].sort((a, b) => b.daren - a.daren);
    const byWorks = [...taskMetrics].sort((a, b) => b.works - a.works);

    // Per-source (brand) aggregation
    const sourceMap = new Map();
    for (const t of taskMetrics) {
        const src = t.source || '未知';
        if (!sourceMap.has(src)) {
            sourceMap.set(src, { source: src, tasks: 0, daren: 0, works: 0, exposure: 0, clicks: 0 });
        }
        const s = sourceMap.get(src);
        s.tasks++;
        s.daren += t.daren;
        s.works += t.works;
        s.exposure += t.exposure;
        s.clicks += t.clicks;
    }
    const bySource = [...sourceMap.values()].sort((a, b) => b.daren - a.daren);

    return {
        date: reportDate,
        summary: {
            totalTasks: allTasks.length,
            tasksWithData: tasksWithData.length,
            totalDaren,
            totalWorks,
            worksPerDaren: totalDaren > 0 ? +(totalWorks / totalDaren).toFixed(2) : 0,
            totalExposure,
            totalClicks,
        },
        topByDaren: byDaren.slice(0, 15),
        topByWorks: byWorks.slice(0, 15),
        bySource,
        allTasks: taskMetrics,
    };
}

/**
 * Format the report as a plain-text email body.
 */
export function formatEmailBody(report) {
    const s = report.summary;
    const lines = [
        `📊 创作者采纳度日报 (${report.date})`,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '📈 总览',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `• 总任务数: ${s.totalTasks} 个 (有数据: ${s.tasksWithData})`,
        `• 总达人数: ${s.totalDaren.toLocaleString()}`,
        `• 总作品数: ${s.totalWorks.toLocaleString()}`,
        `• 作品/达人比: ${s.worksPerDaren}`,
        `• 总曝光数: ${s.totalExposure.toLocaleString()} (参考)`,
        `• 总点击数: ${s.totalClicks.toLocaleString()} (参考)`,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '👥 TOP 15 达人采纳（哪些 idea 最受创作者欢迎）',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ];

    report.topByDaren.forEach((t, i) => {
        lines.push(`${String(i + 1).padStart(2)}. ${t.name}`);
        lines.push(`    达人: ${t.daren} | 作品: ${t.works} | 来源: ${t.source}`);
    });

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 TOP 15 作品产出（哪些 idea 产生最多内容）');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    report.topByWorks.forEach((t, i) => {
        lines.push(`${String(i + 1).padStart(2)}. ${t.name}`);
        lines.push(`    作品: ${t.works} | 达人: ${t.daren} | 来源: ${t.source}`);
    });

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('🏷️ 按品牌汇总');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    report.bySource.forEach(s => {
        lines.push(`• ${s.source}: ${s.tasks} 任务 | ${s.daren} 达人 | ${s.works} 作品`);
    });

    lines.push('');
    lines.push('Best regards,');
    lines.push('Daily Usage Report Bot 🤖');

    return lines.join('\n');
}
