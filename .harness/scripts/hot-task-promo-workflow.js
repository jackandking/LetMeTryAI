import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildHotTaskApp } from './hot-task-video-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

export const HOT_TASK_PROMO_PATHS = {
    repoRoot,
    stateDir: path.join(repoRoot, '.harness', '.local', 'state'),
    processedLog: path.join(repoRoot, '.harness', '.local', 'state', 'hot-task-video-processed.jsonl'),
    hotTaskStateFile: path.join(repoRoot, '.harness', '.local', 'state', 'hot-task-app-id.txt'),
    localMetricsDir: path.join(repoRoot, '.harness', '.local', 'exports', 'metrics', 'kuaishou', 'daily'),
    prodMetricsDir: path.join(repoRoot, '..', 'prod', 'LetMeTryAI', '.harness', '.local', 'exports', 'metrics', 'kuaishou', 'daily')
};

function readJsonFile(filePath) {
    return JSON.parse(readFileSync(filePath, 'utf8'));
}

function listMetricsDates(metricsDir, prefix) {
    return readdirSync(metricsDir)
        .filter((fileName) => fileName.startsWith(prefix) && fileName.endsWith('.json'))
        .map((fileName) => fileName.slice(prefix.length, -'.json'.length));
}

function scoreDeltaCandidate(candidate) {
    const deltaDaren = Number(candidate.deltaDaren || 0);
    const deltaWorks = Number(candidate.deltaWorks || 0);
    const deltaExposure = Number(candidate.deltaExposure || 0);
    const daren = Number(candidate.daren || 0);
    const works = Number(candidate.works || 0);

    return deltaDaren * 1_000_000 + deltaWorks * 10_000 + deltaExposure + daren * 10 + works;
}

function scoreReportCandidate(task) {
    const stats = task.stats || {};
    const daren = Number(stats.darenCount || stats.daren || 0);
    const works = Number(stats.workCount || stats.works || 0);
    const exposure = Number(stats.totalExposure || stats.exposure || 0);

    return daren * 1_000_000 + works * 10_000 + exposure;
}

function buildMetadataIndex() {
    const index = new Map();
    const entries = readdirSync(repoRoot, { withFileTypes: true });

    entries.forEach((entry) => {
        if (!entry.isDirectory() || entry.name.startsWith('.')) {
            return;
        }

        const metadataPath = path.join(repoRoot, entry.name, 'metadata.json');
        if (!existsSync(metadataPath)) {
            return;
        }

        const metadata = readJsonFile(metadataPath);
        if (!metadata?.id || !metadata?.name || metadata.status === 'archived') {
            return;
        }

        index.set(metadata.id, metadata);
        index.set(metadata.name, metadata);
    });

    return index;
}

export function resolveMetricsDir(preferredDir) {
    const candidates = [preferredDir, HOT_TASK_PROMO_PATHS.localMetricsDir, HOT_TASK_PROMO_PATHS.prodMetricsDir]
        .filter(Boolean);

    const resolved = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isDirectory());
    if (!resolved) {
        throw new Error('No Kuaishou metrics directory found');
    }

    return resolved;
}

export function loadLatestMetrics(metricsDir) {
    const resolvedMetricsDir = resolveMetricsDir(metricsDir);
    const reportDates = listMetricsDates(resolvedMetricsDir, 'kuaishou_report_');
    const deltaDates = listMetricsDates(resolvedMetricsDir, 'kuaishou_delta_');
    const availableDates = reportDates.filter((date) => deltaDates.includes(date)).sort();

    if (availableDates.length === 0) {
        throw new Error(`No paired Kuaishou report/delta files found in ${resolvedMetricsDir}`);
    }

    const reportDate = availableDates[availableDates.length - 1];
    const reportPath = path.join(resolvedMetricsDir, `kuaishou_report_${reportDate}.json`);
    const deltaPath = path.join(resolvedMetricsDir, `kuaishou_delta_${reportDate}.json`);

    return {
        metricsDir: resolvedMetricsDir,
        reportDate,
        reportPath,
        deltaPath,
        report: readJsonFile(reportPath),
        delta: readJsonFile(deltaPath)
    };
}

export function rankHotTaskCandidates({ report, delta, reportDate }) {
    const metadataIndex = buildMetadataIndex();
    const reportTasks = new Map(
        (report.allTasks || []).map((task) => [task.name, task])
    );
    const deltaCandidates = (delta.delta?.allDeltas || [])
        .filter((candidate) => metadataIndex.has(candidate.name))
        .map((candidate) => {
            const reportTask = reportTasks.get(candidate.name) || null;
            const metadata = metadataIndex.get(candidate.name);
            const score = scoreDeltaCandidate(candidate);

            return {
                ...candidate,
                metadata,
                reportTask,
                reportDate,
                score,
                selectedBy: 'delta-first'
            };
        })
        .sort((left, right) => right.score - left.score);

    if (deltaCandidates.length > 0) {
        return deltaCandidates;
    }

    return (report.allTasks || [])
        .filter((task) => metadataIndex.has(task.name))
        .map((task) => {
            const metadata = metadataIndex.get(task.name);
            const score = scoreReportCandidate(task);

            return {
                planId: task.planId,
                name: task.name,
                source: task.source,
                daren: Number(task.stats?.darenCount || task.stats?.daren || 0),
                works: Number(task.stats?.workCount || task.stats?.works || 0),
                exposure: Number(task.stats?.totalExposure || task.stats?.exposure || 0),
                deltaDaren: 0,
                deltaWorks: 0,
                deltaExposure: 0,
                isNew: false,
                metadata,
                reportTask: task,
                reportDate,
                score,
                selectedBy: 'report-fallback'
            };
        })
        .sort((left, right) => right.score - left.score);
}

export function loadProcessedTaskLog(logPath = HOT_TASK_PROMO_PATHS.processedLog) {
    if (!existsSync(logPath)) {
        return [];
    }

    return readFileSync(logPath, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

export function hasSuccessfulPromotion(record, { appId, reportDate, now = new Date(), cooldownDays = 0 }) {
    const successStatuses = new Set(['sent', 'images_generated']);
    if (!successStatuses.has(record.status) || record.appId !== appId) {
        return false;
    }

    if (record.reportDate === reportDate) {
        return true;
    }

    if (!cooldownDays) {
        return false;
    }

    const processedAt = new Date(record.processedAt);
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    return Number.isFinite(processedAt.getTime()) && (now.getTime() - processedAt.getTime()) < cooldownMs;
}

export function selectPromotionCandidate(candidates, records, options = {}) {
    const {
        force = false,
        forceAppId = null,
        cooldownDays = 0,
        now = new Date()
    } = options;

    const filteredCandidates = forceAppId
        ? candidates.filter((candidate) => candidate.metadata?.id === forceAppId)
        : candidates;

    if (filteredCandidates.length === 0) {
        throw new Error(forceAppId ? `No candidate found for appId ${forceAppId}` : 'No hot-task candidates found');
    }

    if (force) {
        return filteredCandidates[0];
    }

    const selectedCandidate = filteredCandidates.find((candidate) => {
        return !records.some((record) => hasSuccessfulPromotion(record, {
            appId: candidate.metadata.id,
            reportDate: candidate.reportDate,
            cooldownDays,
            now
        }));
    });

    if (!selectedCandidate) {
        throw new Error('No unprocessed hot-task candidate available after dedup');
    }

    return selectedCandidate;
}

export function buildHotTaskAppFromCandidate(candidate, overrides = {}) {
    const metadata = candidate.metadata;
    if (!metadata) {
        throw new Error(`Unable to resolve metadata for candidate ${candidate.name}`);
    }

    const miniAppName = candidate.reportTask?.miniAppName || candidate.miniAppName || '';

    return buildHotTaskApp({
        appId: metadata.id,
        pageTitle: metadata.name,
        appTitle: metadata.name,
        appUrl: `https://letmetryai.cn/${metadata.url || metadata.id}/`,
        miniAppName,
        ...overrides
    });
}

export function formatMetricsSummary(candidate) {
    return {
        daren: Number(candidate.daren || 0),
        works: Number(candidate.works || 0),
        exposure: Number(candidate.exposure || 0),
        deltaDaren: Number(candidate.deltaDaren || 0),
        deltaWorks: Number(candidate.deltaWorks || 0),
        deltaExposure: Number(candidate.deltaExposure || 0),
        isNew: Boolean(candidate.isNew),
        score: candidate.score
    };
}

export function recordPromotionRun(entry, logPath = HOT_TASK_PROMO_PATHS.processedLog) {
    mkdirSync(path.dirname(logPath), { recursive: true });
    appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

const PROFILE_NAME_TO_ID = {
    '男人宝': 'nanrenbao',
    '女人爱': 'womanai',
    '家长爱': 'parent-tools',
    '爱老人': 'elder-love'
};

export function resolveProfileIdFromMetadata(metadata = {}) {
    if (metadata.profileId) {
        return metadata.profileId;
    }
    const keywords = Array.isArray(metadata.keywords) ? metadata.keywords : [];
    for (const keyword of keywords) {
        const matched = PROFILE_NAME_TO_ID[keyword];
        if (matched) {
            return matched;
        }
    }
    return '';
}

export function saveHotTaskSelection(metadata = {}, stateFile = HOT_TASK_PROMO_PATHS.hotTaskStateFile) {
    const profileId = resolveProfileIdFromMetadata(metadata);
    const payload = {
        appId: metadata.id || '',
        name: metadata.name || '',
        profileId,
        savedAt: new Date().toISOString()
    };
    mkdirSync(path.dirname(stateFile), { recursive: true });
    writeFileSync(stateFile, JSON.stringify(payload, null, 2), 'utf8');
    return payload;
}

