#!/usr/bin/env node
/**
 * 快手星火「图片任务」coverage 门禁（Owner 2026-11-13 规则）
 *
 * 【规则】凡发布到快手星火计划的男人宝单图任务，图片 coverage_pct 必须严格 > 50。
 * 【作用域】仅约束「快手星火任务发布」这个出口。
 *           自己网站（画廊展示 / 投稿 / 审核 / 预览页 / 宣传卡片）目前没有此限制，
 *           本次也不新增：低遮蔽图照常在站内投稿、审核、展示，只是不发快手任务。
 *           11-08 的 safeCardIds 白名单是另一条渠道侧约束，与此无关，不要互相泛化。
 *
 * 【为什么做成共享模块】发布有 Playwright / HTTP API / 备用 API 三条脚本路径，
 *   规则散落极易被绕过。所有出口统一调用 enforceKuaishouImageCoverage()，
 *   fail-closed：查不到、字段缺失、网络异常一律拒绝，不提供跳过开关。
 *   --force 只忽略「已发布去重记录」，不绕过本门禁。
 *
 * 调用方：
 *   - publish-kuaishou-task.js          (Playwright 主路径)
 *   - publish-kuaishou-api.js           (HTTP API 路径)
 *   - publish-kuaishou-api.mjs          (备用 HTTP 路径)
 *   - nanrenbao-scratch-publish/scripts/publish-scratch-tasks.js (编排层预筛)
 */

export const MIN_KS_IMAGE_COVERAGE = 50;
export const DEFAULT_COVERAGE_QUERY_URL = 'https://letmetry.cn/mysql/query';

// 男人宝单图任务的 appId 形如 nanrenbao/beauty-scratch?id=892
// 只匹配带数字 id 的 nanrenbao 路径，避免误伤其他品牌（parent-tools / womanai / elder-love）
// 或功能性页面（nanrenbao/back-view-killer 之类无 id 的入口）。
const NANRENBAO_IMAGE_ID_RE = /(?:^|\/)nanrenbao\/[^?#]*[?&]id=(\d+)/;

/** 解析 appId 中的图片 mysql id；非图片任务返回 null（门禁不适用）。 */
export function parseNanrenbaoImageId(appId) {
    const m = String(appId == null ? '' : appId).match(NANRENBAO_IMAGE_ID_RE);
    return m ? Number(m[1]) : null;
}

/** 纯函数：严格 > 50 才放行。NULL / 缺失 / 非数字一律不通过。 */
export function evaluateCoverage(coverage) {
    if (coverage == null || coverage === '') {
        return { allowed: false, coverage: null, reason: 'missing' };
    }
    const n = Number(coverage);
    if (!Number.isFinite(n)) {
        return { allowed: false, coverage: null, reason: 'missing' };
    }
    return n > MIN_KS_IMAGE_COVERAGE
        ? { allowed: true, coverage: n, reason: 'ok' }
        : { allowed: false, coverage: n, reason: 'too_low' };
}

/** 从线上只读端点取该图的 coverage_pct。 */
export async function fetchImageCoverage(imageId, opts = {}) {
    const url = opts.queryUrl || DEFAULT_COVERAGE_QUERY_URL;
    const fetchImpl = opts.fetchImpl || globalThis.fetch;
    const id = Number(imageId);
    if (!Number.isInteger(id) || id <= 0) throw new Error(`非法图片 id: ${imageId}`);
    const sql = `SELECT id, coverage_pct, review_status FROM beauty_images WHERE id=${id}`;
    const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params: [] }),
        signal: AbortSignal.timeout(opts.timeoutMs || 10000),
    });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(`beauty_images 查不到 id=${id}`);
    }
    return rows[0];
}

/**
 * 发布前门禁。返回：
 *   { applied:false, allowed:true }                 非图片任务，不适用
 *   { applied:true,  allowed:true,  imageId, coverage }
 *   { applied:true,  allowed:false, imageId, reason, ... }  调用方应拒绝发布
 */
export async function enforceKuaishouImageCoverage(appId, opts = {}) {
    const imageId = parseNanrenbaoImageId(appId);
    if (imageId == null) return { applied: false, allowed: true, imageId: null };
    try {
        const row = await fetchImageCoverage(imageId, opts);
        const verdict = evaluateCoverage(row && row.coverage_pct);
        return {
            applied: true,
            allowed: verdict.allowed,
            imageId,
            coverage: verdict.coverage,
            reason: verdict.reason,
            reviewStatus: row && row.review_status,
        };
    } catch (e) {
        return {
            applied: true,
            allowed: false,
            imageId,
            reason: 'query_failed',
            error: e && e.message ? e.message : String(e),
        };
    }
}

/** 统一拒绝文案，避免出现「不知道为什么被拦」的黑洞。 */
export function formatGateError(result) {
    const head = `❌ [KS_IMAGE_COVERAGE_GATE] 拒绝发布快手星火任务：图片 id=${result.imageId}`;
    const scope = `   作用域：仅约束快手星火任务发布的图片（coverage_pct 必须 > ${MIN_KS_IMAGE_COVERAGE}）；网站画廊/投稿/预览不受此限制，低遮蔽图可在站内正常展示。`;
    if (result.reason === 'query_failed') {
        return `${head}\n   无法核验 coverage：${result.error}\n   为安全起见按不通过处理（fail-closed）。请检查 /mysql/query 可达性后重试。\n${scope}`;
    }
    if (result.reason === 'missing') {
        return `${head}\n   coverage_pct 缺失或 NULL，规则要求严格 > ${MIN_KS_IMAGE_COVERAGE}，按不通过处理。\n${scope}`;
    }
    return `${head}\n   coverage_pct=${result.coverage}，规则要求严格 > ${MIN_KS_IMAGE_COVERAGE}。\n   请改发 coverage>50 的图；这张图可以留在站内画廊，只是不发快手任务。\n${scope}`;
}
