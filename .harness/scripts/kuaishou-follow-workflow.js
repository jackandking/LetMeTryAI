import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const FOLLOW_STATUSES = ['followed', 'skipped', 'failed', 'already-followed'];
export const DEFAULT_START_URL = 'https://daren.kuaishou.com/distribution-plan-list';
export const DEFAULT_SAMPLE_LIMIT = 5;
export const DEFAULT_DAILY_FOLLOW_CAP = 100;
export const DEFAULT_HOURLY_BATCH_SIZE = 10;
export const DEFAULT_MIN_FOLLOW_INTERVAL_MS = 60 * 1000;
export const DEFAULT_REPORT_HOUR = 14;
export const END_OF_DAY_REASONS = new Set([
    'queue-empty',
    'daily-cap-reached',
    'rate-limited'
]);

export function buildFollowRuntimePaths(repoRoot) {
    const baseDir = join(repoRoot, '.harness', '.local', 'state', 'kuaishou-follow');

    return {
        baseDir,
        sessionsDir: join(baseDir, 'sessions'),
        exportsDir: join(baseDir, 'exports'),
        dailyRunsDir: join(baseDir, 'daily-runs'),
        reportsDir: join(baseDir, 'reports'),
        historyFile: join(baseDir, 'follow-history.jsonl'),
        queueFile: join(baseDir, 'pending-queue.json'),
        appConfigFile: join(baseDir, 'app-config.local.json'),
        latestSessionFile: join(baseDir, 'latest-session.json'),
        discoveriesFile: join(baseDir, 'discoveries.jsonl')
    };
}

export function ensureFollowRuntime(paths) {
    [paths.baseDir, paths.sessionsDir, paths.exportsDir, paths.dailyRunsDir, paths.reportsDir].forEach(dir => {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    });
}

export function normalizeCreatorIdentity(value) {
    return String(value ?? '')
        .trim()
        .replace(/^@+/, '')
        .replace(/\s+/g, '')
        .toLowerCase();
}

export function normalizeDisplayName(value) {
    return String(value ?? '').trim();
}

export function buildCreatorKey(record) {
    const creatorId = normalizeCreatorIdentity(record?.creatorId);
    if (creatorId) {
        return `id:${creatorId}`;
    }

    const handle = normalizeCreatorIdentity(record?.handle);
    if (handle) {
        return `handle:${handle}`;
    }

    const displayName = normalizeDisplayName(record?.displayName);
    if (displayName) {
        return `name:${displayName}`;
    }

    return '';
}

export function buildManualSession({
    planId = '',
    startUrl = DEFAULT_START_URL,
    limit = DEFAULT_SAMPLE_LIMIT,
    now = new Date(),
    actor = {}
} = {}) {
    const timestamp = now instanceof Date ? now.toISOString() : String(now);
    const compactTimestamp = timestamp.replace(/[-:.TZ]/g, '').slice(0, 14);

    return {
        sessionId: `kuaishou-follow-${compactTimestamp}`,
        mode: 'manual_assist',
        status: 'running',
        startedAt: timestamp,
        endedAt: null,
        planId: planId ? String(planId) : '',
        startUrl,
        sampleLimit: Number(limit) > 0 ? Number(limit) : DEFAULT_SAMPLE_LIMIT,
        actor,
        notes: []
    };
}

export function completeSession(session, {
    status = 'done',
    note = '',
    endedAt = new Date().toISOString()
} = {}) {
    const nextNotes = Array.isArray(session.notes) ? [...session.notes] : [];
    if (note) {
        nextNotes.push(note);
    }

    return {
        ...session,
        status,
        endedAt,
        notes: nextNotes
    };
}

export function createFollowRecord({
    sessionId = '',
    planId = '',
    creatorId = '',
    handle = '',
    displayName = '',
    status = 'followed',
    reason = '',
    sourceUrl = '',
    now = new Date()
} = {}) {
    if (!FOLLOW_STATUSES.includes(status)) {
        throw new Error(`Unsupported follow status: ${status}`);
    }

    const timestamp = now instanceof Date ? now.toISOString() : String(now);
    const normalizedCreatorId = normalizeCreatorIdentity(creatorId);
    const normalizedHandle = normalizeCreatorIdentity(handle);
    const normalizedDisplayName = normalizeDisplayName(displayName);

    if (!normalizedCreatorId && !normalizedHandle && !normalizedDisplayName) {
        throw new Error('At least one creator identifier is required');
    }

    return {
        sessionId,
        planId: planId ? String(planId) : '',
        creatorId: normalizedCreatorId,
        handle: normalizedHandle,
        displayName: normalizedDisplayName,
        creatorKey: buildCreatorKey({
            creatorId: normalizedCreatorId,
            handle: normalizedHandle,
            displayName: normalizedDisplayName
        }),
        status,
        reason: String(reason ?? '').trim(),
        sourceUrl: String(sourceUrl ?? '').trim(),
        processedAt: timestamp
    };
}

export function parseJsonLines(content) {
    return String(content ?? '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => JSON.parse(line));
}

export function readFollowHistory(historyFile) {
    if (!existsSync(historyFile)) {
        return [];
    }

    return parseJsonLines(readFileSync(historyFile, 'utf-8'));
}

export function appendFollowRecord(historyFile, record) {
    appendFileSync(historyFile, `${JSON.stringify(record)}\n`, 'utf-8');
}

export function readJsonFile(filePath, fallbackValue) {
    if (!existsSync(filePath)) {
        return fallbackValue;
    }

    return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function writeJsonFile(filePath, payload) {
    writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return filePath;
}

export function createDiscoveryRecord({
    kind = 'note',
    url = '',
    title = '',
    summary = '',
    timeRange = '',
    fields = [],
    sample = {},
    now = new Date()
} = {}) {
    const timestamp = now instanceof Date ? now.toISOString() : String(now);

    return {
        kind: String(kind ?? '').trim() || 'note',
        url: String(url ?? '').trim(),
        title: String(title ?? '').trim(),
        summary: String(summary ?? '').trim(),
        timeRange: String(timeRange ?? '').trim(),
        fields: Array.isArray(fields)
            ? fields.map(item => String(item ?? '').trim()).filter(Boolean)
            : [],
        sample: sample && typeof sample === 'object' ? sample : {},
        recordedAt: timestamp
    };
}

export function appendDiscoveryRecord(discoveriesFile, record) {
    appendFileSync(discoveriesFile, `${JSON.stringify(record)}\n`, 'utf-8');
}

export function readDiscoveryHistory(discoveriesFile) {
    if (!existsSync(discoveriesFile)) {
        return [];
    }

    return parseJsonLines(readFileSync(discoveriesFile, 'utf-8'));
}

export function saveSession(paths, session) {
    ensureFollowRuntime(paths);
    const sessionFile = join(paths.sessionsDir, `${session.sessionId}.json`);
    writeFileSync(sessionFile, JSON.stringify(session, null, 2), 'utf-8');
    writeFileSync(paths.latestSessionFile, JSON.stringify(session, null, 2), 'utf-8');
    return sessionFile;
}

export function readLatestSession(latestSessionFile) {
    if (!existsSync(latestSessionFile)) {
        return null;
    }

    return JSON.parse(readFileSync(latestSessionFile, 'utf-8'));
}

export function buildCandidateKey(candidate) {
    const creatorId = normalizeCreatorIdentity(candidate?.authorOpenId || candidate?.creatorId);
    if (creatorId) {
        return `id:${creatorId}`;
    }

    const sourceUrl = String(candidate?.videoUrl || candidate?.sourceUrl || '').trim();
    if (sourceUrl) {
        return `url:${sourceUrl}`;
    }

    const displayName = normalizeDisplayName(candidate?.authorName || candidate?.displayName);
    if (displayName) {
        return `name:${displayName}`;
    }

    return '';
}

export function isFollowableVideoUrl(url = '') {
    const normalized = String(url ?? '').trim();
    return /^https:\/\/www\.kuaishou\.com\/short-video\/[^/?#]+$/u.test(normalized);
}

export function scoreCandidate(candidate) {
    const dateScore = Date.parse(candidate?.planDate || '') || 0;
    const playScore = Number(candidate?.playCnt || 0) || 0;
    const clickScore = Number(candidate?.clickCnt || 0) || 0;
    const createdAtScore = Date.parse(candidate?.createdAt || '') || 0;
    return dateScore * 1_000_000_000 + playScore * 1_000 + clickScore + createdAtScore;
}

export function createPendingCandidate({
    profileId = '',
    profileName = '',
    appId = '',
    planDate = '',
    sourceStrategy = 'official',
    record = {},
    now = new Date()
} = {}) {
    const videoUrl = String(record.videoUrl || record.sourceUrl || '').trim();
    if (!isFollowableVideoUrl(videoUrl)) {
        throw new Error(`Candidate is missing a followable short-video URL: ${videoUrl || '<empty>'}`);
    }

    const timestamp = now instanceof Date ? now.toISOString() : String(now);
    const authorOpenId = normalizeCreatorIdentity(record.openId || record.authorOpenId || record.creatorId);
    const authorName = normalizeDisplayName(record.authorName || record.displayName || record.handle);
    const videoId = String(record.videoId || '').trim();
    const queueKey = buildCandidateKey({
        authorOpenId,
        creatorId: authorOpenId,
        authorName,
        displayName: authorName,
        videoUrl
    });

    if (!queueKey) {
        throw new Error('Candidate is missing a stable identity key');
    }

    return {
        queueKey,
        profileId: String(profileId || '').trim(),
        profileName: String(profileName || '').trim(),
        appId: String(appId || '').trim(),
        planDate: String(planDate || record.date || '').trim(),
        sourceStrategy: String(sourceStrategy || '').trim() || 'official',
        authorOpenId,
        authorName,
        videoId,
        videoUrl,
        sourceUrl: videoUrl,
        caption: String(record.caption || '').trim(),
        playCnt: String(record.playCnt || '').trim(),
        clickCnt: String(record.clickCnt || '').trim(),
        attemptCount: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        deferUntil: '',
        lastAttemptAt: '',
        lastError: ''
    };
}

export function hasProcessedCreator(records, candidate) {
    const creatorId = normalizeCreatorIdentity(candidate?.creatorId);
    const handle = normalizeCreatorIdentity(candidate?.handle);
    const sourceUrl = String(candidate?.sourceUrl ?? '').trim();
    const authorOpenId = normalizeCreatorIdentity(candidate?.authorOpenId);

    return records.some(record => {
        const sameCreatorId = creatorId && normalizeCreatorIdentity(record.creatorId) === creatorId;
        const sameHandle = handle && normalizeCreatorIdentity(record.handle) === handle;
        const sameSourceUrl = sourceUrl && String(record.sourceUrl ?? '').trim() === sourceUrl;
        const sameAuthorOpenId = authorOpenId && normalizeCreatorIdentity(record.creatorId) === authorOpenId;
        return Boolean(sameCreatorId || sameHandle || sameSourceUrl || sameAuthorOpenId);
    });
}

export function pickUnprocessedCandidates(candidates, records, limit = 1) {
    const maxItems = Number(limit) > 0 ? Number(limit) : 1;
    const selected = [];

    for (const candidate of candidates) {
        if (hasProcessedCreator(records, candidate)) {
            continue;
        }

        selected.push(candidate);
        if (selected.length >= maxItems) {
            break;
        }
    }

    return selected;
}

export function filterRecordsByPlanId(records, planId = '') {
    const normalizedPlanId = String(planId ?? '').trim();
    if (!normalizedPlanId) {
        return [...records];
    }

    return records.filter(record => String(record.planId ?? '').trim() === normalizedPlanId);
}

export function summarizeFollowRecords(records) {
    const summary = {
        total: records.length,
        uniqueCreators: 0,
        followed: 0,
        alreadyFollowed: 0,
        skipped: 0,
        failed: 0
    };

    const creatorKeys = new Set();
    for (const record of records) {
        const creatorKey = buildCreatorKey(record);
        if (creatorKey) {
            creatorKeys.add(creatorKey);
        }

        if (record.status === 'followed') {
            summary.followed += 1;
        } else if (record.status === 'already-followed') {
            summary.alreadyFollowed += 1;
        } else if (record.status === 'skipped') {
            summary.skipped += 1;
        } else if (record.status === 'failed') {
            summary.failed += 1;
        }
    }

    summary.uniqueCreators = creatorKeys.size;
    return summary;
}

export function formatStatusReport({ session, summary, records }) {
    const recent = [...records].slice(-5).reverse();
    const lines = [
        'Kuaishou Follow Workflow',
        `Session: ${session?.sessionId || 'none'}`,
        `Plan ID: ${session?.planId || 'all plans'}`,
        `Status: ${session?.status || 'idle'}`,
        `Start URL: ${session?.startUrl || DEFAULT_START_URL}`,
        `Started: ${session?.startedAt || 'n/a'}`,
        `Ended: ${session?.endedAt || 'n/a'}`,
        '',
        `Processed: ${summary.total} (unique ${summary.uniqueCreators})`,
        `Followed: ${summary.followed}`,
        `Already followed: ${summary.alreadyFollowed || 0}`,
        `Skipped: ${summary.skipped}`,
        `Failed: ${summary.failed}`
    ];

    if (recent.length > 0) {
        lines.push('', 'Recent records:');
        recent.forEach(record => {
            lines.push(
                `- ${record.status} ${record.displayName || record.handle || record.creatorId} ` +
                `[plan ${record.planId || '-'} at ${record.processedAt}]`
            );
        });
    }

    return lines.join('\n');
}

export function buildManualStartInstructions(session) {
    const lines = [
        'Manual flow is ready:',
        '1. In the opened creator browser, locate the target 星火计划/分销计划任务。',
        '2. Open the task使用者/达人列表，先人工挑一小批样本。',
        '3. 每处理完一个账号，执行 record 命令落状态，避免重复 follow。',
        '4. 当前这轮结束后执行 finish 命令，保存人工备注。'
    ];

    if (session.planId) {
        lines.splice(1, 0, `- Target planId: ${session.planId}`);
    }

    return lines.join('\n');
}

export function formatPageInspectionReport({
    requestedUrl = '',
    url = '',
    title = '',
    screenshotPath = '',
    text = ''
} = {}) {
    const compactText = String(text ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 600);

    const lines = [
        'Kuaishou Page Inspection',
        `Requested URL: ${requestedUrl || 'n/a'}`,
        `Resolved URL: ${url || 'n/a'}`,
        `Title: ${title || 'n/a'}`
    ];

    if (screenshotPath) {
        lines.push(`Screenshot: ${screenshotPath}`);
    }

    if (compactText) {
        lines.push('', 'Visible text:', compactText);
    }

    return lines.join('\n');
}

export function buildObservationPaths(repoRoot) {
    const followPaths = buildFollowRuntimePaths(repoRoot);
    const observerDir = join(followPaths.baseDir, 'observer');

    return {
        observerDir,
        eventsFile: join(observerDir, 'events.jsonl'),
        latestFile: join(observerDir, 'latest-observer.json'),
        sessionsDir: join(observerDir, 'sessions'),
        screenshotsDir: join(observerDir, 'screenshots'),
        browserProfileDir: join(observerDir, 'chrome-profile')
    };
}

export function loadPendingQueue(queueFile) {
    const queue = readJsonFile(queueFile, []);
    return Array.isArray(queue) ? queue : [];
}

export function savePendingQueue(queueFile, queue) {
    return writeJsonFile(queueFile, Array.isArray(queue) ? queue : []);
}

export function buildDailyRunFile(dailyRunsDir, dateKey) {
    return join(dailyRunsDir, `${String(dateKey || '').trim()}.json`);
}

export function createDailyRunState(dateKey) {
    return {
        date: String(dateKey || '').trim(),
        ingestion: null,
        hourlyRuns: [],
        report: null
    };
}

export function loadDailyRunState(dailyRunsDir, dateKey) {
    const state = readJsonFile(buildDailyRunFile(dailyRunsDir, dateKey), null);
    if (!state || typeof state !== 'object') {
        return createDailyRunState(dateKey);
    }

    return {
        date: String(state.date || dateKey || '').trim(),
        ingestion: state.ingestion || null,
        hourlyRuns: Array.isArray(state.hourlyRuns) ? state.hourlyRuns : [],
        report: state.report || null
    };
}

export function saveDailyRunState(dailyRunsDir, dateKey, state) {
    return writeJsonFile(buildDailyRunFile(dailyRunsDir, dateKey), {
        date: String(dateKey || '').trim(),
        ingestion: state?.ingestion || null,
        hourlyRuns: Array.isArray(state?.hourlyRuns) ? state.hourlyRuns : [],
        report: state?.report || null
    });
}

export function updateDailyIngestionState(dailyRunsDir, dateKey, ingestion) {
    const state = loadDailyRunState(dailyRunsDir, dateKey);
    state.ingestion = ingestion;
    saveDailyRunState(dailyRunsDir, dateKey, state);
    return state;
}

export function appendHourlyRunState(dailyRunsDir, dateKey, hourlyRun) {
    const state = loadDailyRunState(dailyRunsDir, dateKey);
    state.hourlyRuns.push(hourlyRun);
    saveDailyRunState(dailyRunsDir, dateKey, state);
    return state;
}

export function updateDailyReportState(dailyRunsDir, dateKey, report) {
    const state = loadDailyRunState(dailyRunsDir, dateKey);
    state.report = report;
    saveDailyRunState(dailyRunsDir, dateKey, state);
    return state;
}

export function mergeCandidatesIntoQueue(queue, incomingCandidates, history = []) {
    const existingQueue = Array.isArray(queue) ? [...queue] : [];
    const processedHistory = Array.isArray(history) ? history : [];
    const indexByKey = new Map(existingQueue.map((candidate, index) => [buildCandidateKey(candidate), index]));
    let added = 0;
    let replaced = 0;
    let skipped = 0;

    for (const candidate of incomingCandidates) {
        if (hasProcessedCreator(processedHistory, {
            authorOpenId: candidate.authorOpenId,
            creatorId: candidate.authorOpenId,
            displayName: candidate.authorName,
            sourceUrl: candidate.videoUrl
        })) {
            skipped += 1;
            continue;
        }

        const candidateKey = buildCandidateKey(candidate);
        const existingIndex = indexByKey.get(candidateKey);
        if (existingIndex === undefined) {
            existingQueue.push(candidate);
            indexByKey.set(candidateKey, existingQueue.length - 1);
            added += 1;
            continue;
        }

        const existingCandidate = existingQueue[existingIndex];
        if (scoreCandidate(candidate) > scoreCandidate(existingCandidate)) {
            existingQueue[existingIndex] = {
                ...candidate,
                attemptCount: existingCandidate.attemptCount || 0,
                deferUntil: existingCandidate.deferUntil || '',
                lastAttemptAt: existingCandidate.lastAttemptAt || '',
                lastError: existingCandidate.lastError || ''
            };
            replaced += 1;
        } else {
            skipped += 1;
        }
    }

    return {
        queue: existingQueue,
        added,
        replaced,
        skipped
    };
}

export function computeDailyQuotaUsage(records, dateKey) {
    return (Array.isArray(records) ? records : []).filter(record => {
        return String(record?.processedAt || '').slice(0, 10) === String(dateKey || '').trim()
            && record.status === 'followed';
    }).length;
}

export function buildRoundRobinBatch(queue, {
    limit = DEFAULT_HOURLY_BATCH_SIZE,
    now = new Date()
} = {}) {
    const effectiveLimit = Number(limit) > 0 ? Number(limit) : DEFAULT_HOURLY_BATCH_SIZE;
    const timestamp = now instanceof Date ? now.toISOString() : String(now);
    const available = (Array.isArray(queue) ? queue : []).filter(candidate => {
        return !candidate.deferUntil || String(candidate.deferUntil) <= timestamp;
    });
    const groupOrder = [];
    const groups = new Map();

    for (const candidate of available) {
        const key = String(candidate.profileId || '').trim() || 'default';
        if (!groups.has(key)) {
            groups.set(key, []);
            groupOrder.push(key);
        }
        groups.get(key).push(candidate);
    }

    const selected = [];
    while (selected.length < effectiveLimit) {
        let progressed = false;
        for (const key of groupOrder) {
            const group = groups.get(key);
            if (!group || group.length === 0) {
                continue;
            }
            selected.push(group.shift());
            progressed = true;
            if (selected.length >= effectiveLimit) {
                break;
            }
        }
        if (!progressed) {
            break;
        }
    }

    return selected;
}

export function updateQueuedCandidate(queue, queueKey, update) {
    return (Array.isArray(queue) ? queue : []).map(candidate => {
        if (buildCandidateKey(candidate) !== queueKey) {
            return candidate;
        }
        return {
            ...candidate,
            ...update,
            updatedAt: update?.updatedAt || new Date().toISOString()
        };
    });
}

export function removeQueuedCandidate(queue, queueKey) {
    return (Array.isArray(queue) ? queue : []).filter(candidate => buildCandidateKey(candidate) !== queueKey);
}

export function buildNextDayResumeAt(now = new Date(), reportHour = DEFAULT_REPORT_HOUR) {
    const next = now instanceof Date ? new Date(now.getTime()) : new Date(now);
    next.setUTCDate(next.getUTCDate() + 1);
    return `${next.toISOString().slice(0, 10)}T${String(reportHour).padStart(2, '0')}:00:00.000+08:00`;
}

export function shouldSendEndOfDayReport(dayState, {
    queue = [],
    dateKey = '',
    history = [],
    dailyCap = DEFAULT_DAILY_FOLLOW_CAP
} = {}) {
    if (dayState?.report?.sentAt) {
        return false;
    }

    const quotaUsed = computeDailyQuotaUsage(history, dateKey);
    const latestRun = Array.isArray(dayState?.hourlyRuns) && dayState.hourlyRuns.length > 0
        ? dayState.hourlyRuns[dayState.hourlyRuns.length - 1]
        : null;
    const activeQueueSize = (Array.isArray(queue) ? queue : []).filter(candidate => {
        return !candidate.deferUntil || String(candidate.deferUntil).slice(0, 10) === String(dateKey || '').trim();
    }).length;

    return activeQueueSize === 0
        || quotaUsed >= Number(dailyCap || DEFAULT_DAILY_FOLLOW_CAP)
        || END_OF_DAY_REASONS.has(String(latestRun?.stopReason || '').trim());
}

export function buildDailyEmailReport({
    dateKey,
    dayState,
    history = [],
    queue = [],
    dailyCap = DEFAULT_DAILY_FOLLOW_CAP
} = {}) {
    const scopedHistory = (Array.isArray(history) ? history : []).filter(record => {
        return String(record?.processedAt || '').slice(0, 10) === String(dateKey || '').trim();
    });
    const summary = summarizeFollowRecords(scopedHistory);
    const quotaUsed = computeDailyQuotaUsage(history, dateKey);
    const pendingCount = (Array.isArray(queue) ? queue : []).length;
    const pendingByProfile = (Array.isArray(queue) ? queue : []).reduce((result, candidate) => {
        const key = String(candidate?.profileId || candidate?.profileName || 'unknown').trim() || 'unknown';
        result[key] = (result[key] || 0) + 1;
        return result;
    }, {});
    const hourlyRuns = Array.isArray(dayState?.hourlyRuns) ? dayState.hourlyRuns : [];
    const latestRun = hourlyRuns.length > 0 ? hourlyRuns[hourlyRuns.length - 1] : null;
    const subject = `[Harness] Kuaishou follow report ${dateKey}`;
    const lines = [
        `Date: ${dateKey}`,
        `Daily cap: ${dailyCap}`,
        `Quota used: ${quotaUsed}`,
        `Hourly runs: ${hourlyRuns.length}`,
        `Followed: ${summary.followed}`,
        `Already followed: ${summary.alreadyFollowed || 0}`,
        `Skipped: ${summary.skipped}`,
        `Failed: ${summary.failed}`,
        `Pending carry-over: ${pendingCount}`,
        `Stop reason: ${latestRun?.stopReason || 'n/a'}`
    ];

    if (dayState?.ingestion) {
        lines.push(
            '',
            'Ingestion:',
            `- apps: ${dayState.ingestion.appCount || 0}`,
            `- fetched: ${dayState.ingestion.totalFetched || 0}`,
            `- eligible: ${dayState.ingestion.eligibleCandidates || 0}`,
            `- queue added: ${dayState.ingestion.queueAdded || 0}`,
            `- skipped missing URL: ${dayState.ingestion.skippedMissingVideoUrl || 0}`
        );
        if (Array.isArray(dayState.ingestion.apps) && dayState.ingestion.apps.length > 0) {
            lines.push('', 'Per-app ingestion:');
            dayState.ingestion.apps.forEach(app => {
                const pendingForApp = pendingByProfile[String(app.profileId || '').trim()] || 0;
                lines.push(
                    `- ${app.profileId}: fetched ${app.fetched || 0}, ` +
                    `eligible ${app.acceptedCandidates || 0}, ` +
                    `queue added ${app.queueAdded || 0}, ` +
                    `queue replaced ${app.queueReplaced || 0}, ` +
                    `queue skipped ${app.queueSkipped || 0}, ` +
                    `pending ${pendingForApp}`
                );
            });
        }
    } else {
        lines.push('', 'Ingestion:', '- not run yet for this date');
    }

    if (hourlyRuns.length > 0) {
        lines.push('', 'Hourly runs:');
        hourlyRuns.forEach((run, index) => {
            lines.push(
                `- #${index + 1} at ${run.startedAt}: attempted ${run.attempted || 0}, ` +
                `followed ${run.followed || 0}, already-followed ${run.alreadyFollowed || 0}, ` +
                `failed ${run.failed || 0}, stopReason ${run.stopReason || 'n/a'}`
            );
        });
    }

    lines.push('', 'Pending queue by app:');
    if (Object.keys(pendingByProfile).length === 0) {
        lines.push('- none');
    } else {
        Object.entries(pendingByProfile)
            .sort(([left], [right]) => left.localeCompare(right))
            .forEach(([profileId, count]) => {
                lines.push(`- ${profileId}: ${count}`);
            });
    }

    return {
        subject,
        body: lines.join('\n'),
        summary: {
            date: dateKey,
            dailyCap,
            quotaUsed,
            pendingCount,
            pendingByProfile,
            ingestion: dayState?.ingestion || null,
            hourlyRuns,
            historySummary: summary
        }
    };
}

export function ensureObservationRuntime(paths) {
    [
        paths.observerDir,
        paths.sessionsDir,
        paths.screenshotsDir,
        paths.browserProfileDir
    ].forEach(dir => {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    });
}

export function createObservationSession({
    startUrl = '',
    debugPort = 9333,
    now = new Date()
} = {}) {
    const timestamp = now instanceof Date ? now.toISOString() : String(now);
    const compactTimestamp = timestamp.replace(/[-:.TZ]/g, '').slice(0, 14);

    return {
        observerSessionId: `kuaishou-observe-${compactTimestamp}`,
        startedAt: timestamp,
        endedAt: null,
        status: 'running',
        startUrl,
        debugPort
    };
}

export function saveObservationSession(paths, session) {
    ensureObservationRuntime(paths);
    const sessionFile = join(paths.sessionsDir, `${session.observerSessionId}.json`);
    writeFileSync(sessionFile, JSON.stringify(session, null, 2), 'utf-8');
    writeFileSync(paths.latestFile, JSON.stringify(session, null, 2), 'utf-8');
    return sessionFile;
}

export function createObservationEvent({
    sessionId = '',
    type = 'unknown',
    url = '',
    title = '',
    targetText = '',
    targetSelector = '',
    value = '',
    screenshotPath = '',
    metadata = null,
    now = new Date()
} = {}) {
    const timestamp = now instanceof Date ? now.toISOString() : String(now);
    const normalizedMetadata = metadata && typeof metadata === 'object'
        ? Object.fromEntries(
            Object.entries(metadata)
                .filter(([, candidate]) => candidate !== undefined && candidate !== null && candidate !== '')
                .map(([key, candidate]) => [key, String(candidate).slice(0, 400)])
        )
        : null;

    const event = {
        sessionId,
        type,
        url: String(url ?? '').trim(),
        title: String(title ?? '').trim(),
        targetText: String(targetText ?? '').trim().slice(0, 200),
        targetSelector: String(targetSelector ?? '').trim().slice(0, 400),
        value: String(value ?? '').trim().slice(0, 200),
        screenshotPath: String(screenshotPath ?? '').trim(),
        timestamp
    };

    if (normalizedMetadata && Object.keys(normalizedMetadata).length > 0) {
        event.metadata = normalizedMetadata;
    }

    return event;
}

export function appendObservationEvent(eventsFile, event) {
    appendFileSync(eventsFile, `${JSON.stringify(event)}\n`, 'utf-8');
}

export function formatObservationReport({
    session,
    eventsFile = '',
    browserProfileDir = '',
    screenshotDir = ''
} = {}) {
    const lines = [
        'Kuaishou Observe Session',
        `Session: ${session?.observerSessionId || 'n/a'}`,
        `Status: ${session?.status || 'n/a'}`,
        `Start URL: ${session?.startUrl || 'n/a'}`,
        `Debug Port: ${session?.debugPort || 'n/a'}`
    ];

    if (eventsFile) {
        lines.push(`Events: ${eventsFile}`);
    }
    if (screenshotDir) {
        lines.push(`Screenshots: ${screenshotDir}`);
    }
    if (browserProfileDir) {
        lines.push(`Chrome profile: ${browserProfileDir}`);
    }

    return lines.join('\n');
}
