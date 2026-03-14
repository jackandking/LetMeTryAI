const DEFAULT_SOURCE_TASK_ID = '165805';
const DEFAULT_AUTH_FILE = 'kuaishou_auth.json';
const DEFAULT_SCRIPT_PATH = 'scripts/publish-kuaishou-task.js';
const BRAND_SOURCE_TASK_IDS = {
    'elder-love': '183044'
};

/**
 * Resolve the best template task id for a publish spec.
 *
 * @param {object} source Raw publish input.
 * @returns {string} Template task id.
 */
function resolveSourceTaskId(source) {
    if (typeof source.sourceTaskId === 'string' && source.sourceTaskId.trim()) {
        return source.sourceTaskId.trim();
    }

    if (typeof source.profileId === 'string' && BRAND_SOURCE_TASK_IDS[source.profileId]) {
        return BRAND_SOURCE_TASK_IDS[source.profileId];
    }

    if (typeof source.appId === 'string' && source.appId.trim() === 'elder-love') {
        return BRAND_SOURCE_TASK_IDS['elder-love'];
    }

    return DEFAULT_SOURCE_TASK_ID;
}

/**
 * Escape a shell argument using simple single-quote wrapping.
 *
 * @param {string} value Raw argument.
 * @returns {string} Shell-safe argument.
 */
function quoteShellArg(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * Normalize a publish specification using repository defaults.
 *
 * @param {object} spec Raw publish spec.
 * @returns {object} Normalized publish spec.
 */
export function normalizePublishSpec(spec) {
    const source = spec && typeof spec === 'object' ? spec : {};
    const appId = typeof source.appId === 'string' ? source.appId.trim() : '';
    const appName = typeof source.appName === 'string' ? source.appName.trim() : '';
    const description = typeof source.description === 'string' ? source.description.trim() : '';

    if (!appId || !appName || !description) {
        throw new Error('appId, appName, and description are required for Kuaishou publishing');
    }

    return {
        appId,
        appName,
        description,
        profileId: typeof source.profileId === 'string' && source.profileId.trim()
            ? source.profileId.trim()
            : null,
        sourceTaskId: resolveSourceTaskId(source),
        authFile: typeof source.authFile === 'string' && source.authFile.trim()
            ? source.authFile.trim()
            : DEFAULT_AUTH_FILE,
        headless: source.headless !== false,
        waitAfterFinishMs: Number.isInteger(source.waitAfterFinishMs) && source.waitAfterFinishMs >= 0
            ? source.waitAfterFinishMs
            : 0,
        deployedUrl: typeof source.deployedUrl === 'string' && source.deployedUrl.trim()
            ? source.deployedUrl.trim()
            : `https://letmetryai.cn/${appId}/`,
        scriptPath: typeof source.scriptPath === 'string' && source.scriptPath.trim()
            ? source.scriptPath.trim()
            : DEFAULT_SCRIPT_PATH
    };
}

/**
 * Build the exact command used to trigger publication.
 *
 * @param {object} spec Publish spec.
 * @returns {string} Shell command.
 */
export function buildPublishCommand(spec) {
    const normalized = normalizePublishSpec(spec);
    const envParts = [
        normalized.headless ? 'HEADLESS=true' : 'HEADLESS=false',
        `SOURCE_TASK_ID=${quoteShellArg(normalized.sourceTaskId)}`,
        `PUBLISH_WAIT_FOR_MANUAL_MS=${normalized.waitAfterFinishMs}`
    ];

    return `${envParts.join(' ')} node ${quoteShellArg(normalized.scriptPath)} ${quoteShellArg(normalized.appId)} ${quoteShellArg(normalized.appName)} ${quoteShellArg(normalized.description)}`;
}

/**
 * Build a repository-aware publish checklist.
 *
 * @param {object} spec Publish spec.
 * @returns {string[]} Ordered checklist items.
 */
export function buildPublishChecklist(spec) {
    const normalized = normalizePublishSpec(spec);

    return [
        `确认 ${normalized.deployedUrl} 已可访问，避免发布后落地页 404`,
        '确认代码已提交并推送到 GitHub',
        `确认 ${normalized.authFile} 可用；若登录失效则删除后重新登录`,
        `运行 ${buildPublishCommand(normalized)}`,
        '检查资源编辑、AI 封面、日期选择是否顺利完成',
        '确认最终发布成功，必要时人工补点提交按钮'
    ];
}

/**
 * Build a full publish plan for orchestration or prompting.
 *
 * @param {object} spec Publish spec.
 * @returns {object} Publish plan with dependencies and checks.
 */
export function buildPublishPlan(spec) {
    const normalized = normalizePublishSpec(spec);

    return {
        spec: normalized,
        command: buildPublishCommand(normalized),
        checklist: buildPublishChecklist(normalized),
        dependencies: {
            primaryScript: normalized.scriptPath,
            authFile: normalized.authFile,
            relatedSkills: ['kuaishou-scraper', 'anti-blocking', 'web-scraper-playwright'],
            templateTaskId: normalized.sourceTaskId
        },
        notes: [
            `默认模板任务 ID: ${normalized.sourceTaskId}`,
            '实际页面自动化由 scripts/publish-kuaishou-task.js 负责',
            '如 Kuaishou UI 变更，优先更新原脚本中的选择器'
        ]
    };
}
