#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'child_process';
import { getBrandProfile } from '../.agents/skills/brand-profiles/scripts/profile-loader.js';
import {
    buildTopicBrief,
    scoreTopicCandidate
} from '../.agents/skills/topic-selector/scripts/topic-selector.js';
import { buildScaffoldPlan } from '../.agents/skills/voting-app-scaffold/scripts/scaffold.js';
import { buildPublishPlan } from '../.agents/skills/kuaishou-publisher/scripts/publisher.js';
import { validateVotingAppDirectory } from './validate-voting-app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '..');
const APPS_METADATA_PATH = path.join(REPO_DIR, 'apps-metadata.json');
const FIGHTER_JETS_STYLES_PATH = path.join(REPO_DIR, 'fighter-jets', 'styles.css');
const EMAIL_DRAFT_PATH = path.join(REPO_DIR, 'email_draft.txt');
const DEFAULT_DAILY_LOG_DIR = path.join(REPO_DIR, 'logs', 'daily-orchestrator');
const DEFAULT_MODEL = 'gpt-5-mini';
const DEFAULT_PROFILE_ID = 'nanrenbao';
const COMMIT_TRAILER = 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>';
const DEFAULT_HEARTBEAT_INTERVAL_MS = Math.max(
    5000,
    Number.parseInt(process.env.DAILY_HEARTBEAT_INTERVAL_MS || '15000', 10) || 15000
);

function normalizeKebabId(value, fallback = 'daily-vote') {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || fallback;
}

function logProgress(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[daily-run][${timestamp}][${level}] ${message}`);
}

function logStage(stage, message) {
    logProgress(`${stage}: ${message}`);
}

function formatCommand(command, args = [], shell = false) {
    const parts = [command, ...args].filter(Boolean);
    const rendered = parts.join(' ').trim();
    return shell ? `(shell) ${rendered}` : rendered;
}

export function formatProgressHeartbeat(label, elapsedMs) {
    const elapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));
    return `${label} still running (${elapsedSeconds}s elapsed)`;
}

function normalizeOption(option, index) {
    const source = option && typeof option === 'object' ? option : {};
    const fallbackLabel = `选项${index + 1}`;
    const label = typeof source.label === 'string' && source.label.trim() ? source.label.trim() : fallbackLabel;
    const value = normalizeKebabId(
        typeof source.value === 'string' && source.value.trim() ? source.value : label,
        `option-${index + 1}`
    );

    return {
        label,
        value,
        caption: typeof source.caption === 'string' && source.caption.trim() ? source.caption.trim() : label,
        alt: typeof source.alt === 'string' && source.alt.trim() ? source.alt.trim() : label,
        image: typeof source.image === 'string' && source.image.trim() ? source.image.trim() : `${value}.svg`
    };
}

function normalizeTopicCandidate(candidate, index) {
    const source = candidate && typeof candidate === 'object' ? candidate : {};
    const options = Array.isArray(source.options) ? source.options.map(normalizeOption) : [];

    return {
        appId: normalizeKebabId(
            typeof source.appId === 'string' && source.appId.trim() ? source.appId : source.title,
            `daily-vote-${index + 1}`
        ),
        title: typeof source.title === 'string' ? source.title.trim() : '',
        pageTitle: typeof source.pageTitle === 'string' && source.pageTitle.trim()
            ? source.pageTitle.trim()
            : typeof source.title === 'string'
                ? source.title.trim()
                : '',
        appName: typeof source.appName === 'string' && source.appName.trim()
            ? source.appName.trim()
            : typeof source.pageTitle === 'string' && source.pageTitle.trim()
                ? source.pageTitle.trim()
                : typeof source.title === 'string'
                    ? source.title.trim()
                    : '',
        summary: typeof source.summary === 'string' ? source.summary.trim() : '',
        description: typeof source.description === 'string' && source.description.trim()
            ? source.description.trim()
            : typeof source.summary === 'string'
                ? source.summary.trim()
                : '',
        question: typeof source.question === 'string' ? source.question.trim() : '',
        category: typeof source.category === 'string' ? source.category.trim() : '',
        format: typeof source.format === 'string' ? source.format.trim() : 'vote',
        keywords: Array.isArray(source.keywords) ? source.keywords : [],
        signals: Array.isArray(source.signals) ? source.signals : [],
        qualities: Array.isArray(source.qualities) ? source.qualities : [],
        riskFlags: Array.isArray(source.riskFlags) ? source.riskFlags : [],
        sourceTaskId: typeof source.sourceTaskId === 'string' && source.sourceTaskId.trim()
            ? source.sourceTaskId.trim()
            : null,
        options
    };
}

function ensureTopicCandidateShape(candidate) {
    if (!candidate.title) {
        throw new Error('Each topic candidate must include title');
    }
    if (!candidate.category) {
        throw new Error(`Topic candidate "${candidate.title}" is missing category`);
    }
    if (!candidate.question) {
        throw new Error(`Topic candidate "${candidate.title}" is missing question`);
    }
    if (candidate.options.length < 2) {
        throw new Error(`Topic candidate "${candidate.title}" must include at least two options`);
    }
}

export function extractJsonObject(text) {
    const raw = typeof text === 'string' ? text : '';
    const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/);
    if (fencedMatch && fencedMatch[1]) {
        return fencedMatch[1].trim();
    }

    let depth = 0;
    let startIndex = -1;
    let inString = false;
    let escapeNext = false;

    for (let index = 0; index < raw.length; index += 1) {
        const character = raw[index];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (character === '\\') {
            escapeNext = true;
            continue;
        }

        if (character === '"') {
            inString = !inString;
            continue;
        }

        if (inString) {
            continue;
        }

        if (character === '{') {
            if (depth === 0) {
                startIndex = index;
            }
            depth += 1;
        } else if (character === '}') {
            depth -= 1;
            if (depth === 0 && startIndex >= 0) {
                return raw.slice(startIndex, index + 1);
            }
        }
    }

    throw new Error('Could not extract JSON object from Copilot output');
}

export function parseTopicSelectionResponse(text) {
    const payload = JSON.parse(extractJsonObject(text));
    const topicCandidates = Array.isArray(payload?.topicCandidates)
        ? payload.topicCandidates.map(normalizeTopicCandidate)
        : [];

    topicCandidates.forEach(ensureTopicCandidateShape);

    if (topicCandidates.length === 0) {
        throw new Error('Model response did not include any valid topicCandidates');
    }

    return {
        profileId: typeof payload.profileId === 'string' && payload.profileId.trim()
            ? payload.profileId.trim()
            : DEFAULT_PROFILE_ID,
        reportSummary: typeof payload.reportSummary === 'string' ? payload.reportSummary.trim() : '',
        topicCandidates
    };
}

function getDailyLogDir() {
    return process.env.DAILY_LOG_DIR || DEFAULT_DAILY_LOG_DIR;
}

function createLogFilePath(prefix) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logDir = getDailyLogDir();
    fs.mkdirSync(logDir, { recursive: true });
    return path.join(logDir, `${prefix}-${timestamp}.log`);
}

function writeDebugLog(prefix, content) {
    const logPath = createLogFilePath(prefix);
    fs.writeFileSync(logPath, typeof content === 'string' ? content : String(content), 'utf-8');
    return logPath;
}

export function parseCopilotEventStream(text) {
    const raw = typeof text === 'string' ? text : '';
    const events = raw
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        })
        .filter(Boolean);

    const assistantMessage = [...events]
        .reverse()
        .find(event => event.type === 'assistant.message' && typeof event.data?.content === 'string');

    if (assistantMessage?.data?.content) {
        return assistantMessage.data.content;
    }

    const reasoningMessage = [...events]
        .reverse()
        .find(event => event.type === 'assistant.reasoning' && typeof event.data?.content === 'string');

    if (reasoningMessage?.data?.content) {
        return reasoningMessage.data.content;
    }

    throw new Error('Could not locate assistant.message content in Copilot JSON event stream');
}

function chooseBestTopicCandidate(topicCandidates, profile) {
    const scored = topicCandidates
        .map(candidate => ({
            candidate,
            scoring: scoreTopicCandidate(candidate, profile)
        }))
        .filter(item => item.scoring.accepted)
        .sort((left, right) => right.scoring.score - left.scoring.score);

    if (scored.length === 0) {
        throw new Error(`No accepted topic candidates found for profile ${profile.id}`);
    }

    return scored[0];
}

export function buildTopicSelectionPrompt({ profile, currentDate }) {
    return [
        `今天是 ${currentDate}。`,
        '你要为 LetMeTryAI 的日更投票页挑选热点话题。',
        '先自己检索今天的科技/军事/体育热点，再生成候选方案。',
        '你只需要返回 JSON，不要写代码，不要创建文件，不要给解释，不要使用 Markdown 代码块。',
        '必须返回一个 JSON object，结构如下：',
        '{',
        '  "profileId": "品牌ID",',
        '  "reportSummary": "一句中文总结，可选",',
        '  "topicCandidates": [',
        '    {',
        '      "appId": "ascii-kebab-case slug",',
        '      "title": "候选主题标题",',
        '      "pageTitle": "页面展示标题",',
        '      "appName": "应用名称",',
        '      "summary": "为何适合做投票",',
        '      "description": "metadata 用的一句话描述",',
        '      "question": "投票问题句子",',
        '      "category": "科技|军事|体育|娱乐|生活|教育|工具 之一",',
        '      "format": "vote",',
        '      "keywords": ["关键词"],',
        '      "signals": ["正向信号"],',
        '      "qualities": ["直观","可配图","可投票"],',
        '      "riskFlags": [],',
        '      "sourceTaskId": "可选，若该品牌有特定快手模板可填",',
        '      "options": [',
        '        { "label": "选项名", "value": "ascii-id", "caption": "展示文案", "alt": "图片alt", "image": "ascii-name.svg" }',
        '      ]',
        '    }',
        '  ]',
        '}',
        '要求：',
        '- 提供 3 个 topicCandidates。',
        '- 每个候选必须有 2-4 个 options。',
        '- appId、options.value、options.image 必须是 ASCII kebab-case 风格。',
        '- 问题、标题、选项要适合做 fighter-jets 风格的图文投票页。',
        '- 避免低俗、侵权、血腥、政治敏感、医疗误导。',
        `品牌画像如下：${JSON.stringify(profile)}`
    ].join('\n');
}

export function buildFallbackTopicSelectionPrompt({ profile, currentDate }) {
    return [
        `今天是 ${currentDate}。`,
        '请只返回一个 JSON object。',
        '不要解释，不要 Markdown，不要代码块，不要任何额外文本。',
        '生成 3 个来自今天科技/军事/体育热点的投票候选。',
        `profileId 固定为 ${profile.id}。`,
        '返回字段只能有：profileId, reportSummary, topicCandidates。',
        '每个 topicCandidates 元素必须包含：appId, title, pageTitle, appName, summary, description, question, category, format, keywords, signals, qualities, riskFlags, options。',
        '每个 options 元素必须包含：label, value, caption, alt, image。',
        'appId、value、image 只能用 ASCII 字母数字和连字符。',
        `品牌画像：${JSON.stringify(profile)}`
    ].join('\n');
}

function runProcess(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: options.cwd || REPO_DIR,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        shell: options.shell === true,
        env: options.env ? { ...process.env, ...options.env } : process.env
    });

    return {
        status: result.status ?? 1,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        error: result.error || null
    };
}

function runChecked(command, args, options = {}) {
    const result = runProcess(command, args, options);
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
        throw new Error(output || `${command} exited with code ${result.status}`);
    }
    return result;
}

async function runStreamingProcess(command, args, options = {}) {
    const cwd = options.cwd || REPO_DIR;
    const env = options.env ? { ...process.env, ...options.env } : process.env;
    const label = options.label || command;
    const shell = options.shell === true;
    const heartbeatIntervalMs = Math.max(0, options.heartbeatIntervalMs || DEFAULT_HEARTBEAT_INTERVAL_MS);

    logProgress(`Starting ${label}: ${formatCommand(command, args, shell)}`);

    return await new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            env,
            shell,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        const startedAt = Date.now();
        const heartbeatTimer = heartbeatIntervalMs > 0
            ? setInterval(() => {
                logProgress(formatProgressHeartbeat(label, Date.now() - startedAt));
            }, heartbeatIntervalMs)
            : null;

        child.stdout?.on('data', chunk => {
            const text = chunk.toString();
            stdout += text;
            if (options.passthroughStdout) {
                process.stdout.write(text);
            }
        });

        child.stderr?.on('data', chunk => {
            const text = chunk.toString();
            stderr += text;
            if (options.passthroughStderr) {
                process.stderr.write(text);
            }
        });

        child.on('error', error => {
            if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
            }
            reject(error);
        });

        child.on('close', code => {
            if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
            }
            logProgress(`Finished ${label} with exit code ${code ?? 1}`);
            resolve({
                status: code ?? 1,
                stdout,
                stderr,
                error: null
            });
        });
    });
}

async function runStreamingChecked(command, args, options = {}) {
    const result = await runStreamingProcess(command, args, options);
    if (result.status !== 0) {
        const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
        throw new Error(output || `${command} exited with code ${result.status}`);
    }
    return result;
}

async function runCopilotJsonPrompt({ model, copilotBin, prompt, mode }) {
    const result = await runStreamingChecked(
        copilotBin,
        ['--model', model, '--allow-all-tools', '--output-format', 'json', '--yolo', '-p', prompt],
        {
            cwd: REPO_DIR,
            label: `Copilot topic selection (${mode})`
        }
    );
    const rawOutput = [result.stdout, result.stderr].filter(Boolean).join('\n');
    const rawLogPath = writeDebugLog('copilot-topic-response', rawOutput);
    logStage('topics', `Saved raw Copilot response to ${rawLogPath}`);

    return {
        rawOutput,
        rawLogPath,
        messageContent: parseCopilotEventStream(rawOutput)
    };
}

async function requestStructuredTopics({ model, profile, currentDate, copilotBin }) {
    const attempts = [
        { mode: 'primary', prompt: buildTopicSelectionPrompt({ profile, currentDate }) },
        { mode: 'fallback', prompt: buildFallbackTopicSelectionPrompt({ profile, currentDate }) }
    ];
    const failures = [];

    for (const attempt of attempts) {
        try {
            logStage('topics', `Requesting structured candidates via ${attempt.mode} prompt`);
            const response = await runCopilotJsonPrompt({
                model,
                copilotBin,
                prompt: attempt.prompt,
                mode: attempt.mode
            });
            const parsed = parseTopicSelectionResponse(response.messageContent);

            return {
                ...parsed,
                rawResponsePath: response.rawLogPath,
                responseMode: attempt.mode
            };
        } catch (error) {
            failures.push(`${attempt.mode}: ${error instanceof Error ? error.message : String(error)}`);
            logStage('topics', `Attempt ${attempt.mode} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    throw new Error(`Failed to get structured topic JSON. ${failures.join(' | ')}`);
}

function buildScaffoldSpec(selected, profile) {
    const candidate = selected.candidate;
    const options = candidate.options;
    const topicBrief = buildTopicBrief(candidate, profile);
    const appId = normalizeKebabId(candidate.appId || candidate.title);
    const coverImage = options[0] ? `${appId}/images/${options[0].image}` : `${appId}/images/cover.svg`;

    return {
        appId,
        appName: candidate.appName || candidate.pageTitle || candidate.title,
        category: candidate.category,
        description: candidate.description || candidate.summary || candidate.question,
        question: candidate.question,
        title: candidate.pageTitle || candidate.title,
        topicBrief,
        brandProfile: profile,
        options,
        tags: Array.from(
            new Set(['投票', candidate.category, ...candidate.keywords.filter(item => typeof item === 'string')])
        ),
        coverImage,
        inputName: normalizeKebabId(profile.id, 'vote-choice')
    };
}

function loadAppsMetadata(appsMetadataPath) {
    const parsed = JSON.parse(fs.readFileSync(appsMetadataPath, 'utf-8'));
    const apps = Array.isArray(parsed?.apps) ? parsed.apps : [];
    return {
        ...parsed,
        apps
    };
}

export function upsertAppsMetadata(appsMetadataPath, entry) {
    const parsed = loadAppsMetadata(appsMetadataPath);
    const existingIndex = parsed.apps.findIndex(app => app && app.id === entry.id);

    if (existingIndex >= 0) {
        parsed.apps.splice(existingIndex, 1, entry);
    } else {
        parsed.apps.unshift(entry);
    }

    fs.writeFileSync(appsMetadataPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf-8');
}

export function materializeScaffoldPlan({
    scaffoldPlan,
    repoDir = REPO_DIR,
    appsMetadataPath = APPS_METADATA_PATH,
    stylesTemplatePath = FIGHTER_JETS_STYLES_PATH
}) {
    if (!scaffoldPlan?.validation?.valid) {
        throw new Error(`Scaffold plan is invalid: ${scaffoldPlan.validation.errors.join('; ')}`);
    }

    const outputDir = path.join(repoDir, scaffoldPlan.outputDir);
    if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length > 0) {
        throw new Error(`Output directory already exists and is not empty: ${scaffoldPlan.outputDir}`);
    }

    fs.mkdirSync(path.join(outputDir, 'images'), { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'index.html'), scaffoldPlan.files.indexHtml, 'utf-8');
    fs.writeFileSync(path.join(outputDir, 'app.js'), scaffoldPlan.files.appJs, 'utf-8');
    fs.copyFileSync(stylesTemplatePath, path.join(outputDir, 'styles.css'));

    Object.entries(scaffoldPlan.files.generatedAssets).forEach(([relativeAssetPath, content]) => {
        const assetPath = path.join(outputDir, relativeAssetPath);
        fs.mkdirSync(path.dirname(assetPath), { recursive: true });
        fs.writeFileSync(assetPath, content, 'utf-8');
    });

    upsertAppsMetadata(appsMetadataPath, scaffoldPlan.metadataEntry);

    return {
        outputDir,
        metadataEntry: scaffoldPlan.metadataEntry,
        filesWritten: [
            path.join(outputDir, 'index.html'),
            path.join(outputDir, 'app.js'),
            path.join(outputDir, 'styles.css'),
            ...Object.keys(scaffoldPlan.files.generatedAssets).map(relativeAssetPath =>
                path.join(outputDir, relativeAssetPath)
            )
        ]
    };
}

function ensureCleanWorktree(repoDir) {
    const status = runChecked('git', ['--no-pager', 'status', '--porcelain'], { cwd: repoDir });
    if (status.stdout.trim()) {
        throw new Error('Working tree is not clean; aborting unattended daily run');
    }
}

async function wait(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyDeployedUrl(url, retries, delayMs) {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        logStage('deploy', `Checking ${url} (attempt ${attempt}/${retries})`);
        const result = runProcess('curl', ['-fsSLI', url], { cwd: REPO_DIR });
        if (result.status === 0) {
            logStage('deploy', `Deployment reachable on attempt ${attempt}`);
            return { success: true, attempts: attempt, output: result.stdout };
        }
        if (attempt < retries) {
            logStage('deploy', `Not reachable yet; waiting ${Math.round(delayMs / 1000)}s before retry`);
            await wait(delayMs);
        }
    }

    return {
        success: false,
        attempts: retries,
        output: `curl failed for ${url}`
    };
}

function commitAndPush({ repoDir, appDirRelative, appId, appName }) {
    logStage('git', `Staging ${appDirRelative} and apps-metadata.json`);
    runChecked('git', ['add', '--', appDirRelative, 'apps-metadata.json'], { cwd: repoDir });

    const diffResult = runProcess('git', ['diff', '--cached', '--quiet'], { cwd: repoDir });
    if (diffResult.status === 0) {
        throw new Error('No staged changes found for daily app commit');
    }

    const message = `Add daily app: ${appName || appId}\n\n${COMMIT_TRAILER}`;
    logStage('git', `Creating commit for ${appName || appId}`);
    runChecked('git', ['commit', '-m', message], { cwd: repoDir });

    const pushTarget = resolveGitPushTarget({
        repoDir,
        pushBranch: process.env.DAILY_GIT_PUSH_BRANCH,
        pushRemote: process.env.DAILY_GIT_PUSH_REMOTE
    });
    logStage('git', `Pushing HEAD to ${pushTarget.remote} ${pushTarget.refspec}`);
    runChecked('git', ['push', pushTarget.remote, pushTarget.refspec], { cwd: repoDir });
}

export function resolveGitPushTarget({ repoDir = REPO_DIR, pushBranch, pushRemote } = {}) {
    const remote = pushRemote || process.env.DAILY_GIT_PUSH_REMOTE || 'origin';
    const explicitBranch = typeof pushBranch === 'string' && pushBranch.trim()
        ? pushBranch.trim()
        : typeof process.env.DAILY_GIT_PUSH_BRANCH === 'string' && process.env.DAILY_GIT_PUSH_BRANCH.trim()
            ? process.env.DAILY_GIT_PUSH_BRANCH.trim()
            : '';

    if (explicitBranch) {
        return {
            remote,
            branch: explicitBranch,
            refspec: `HEAD:${explicitBranch}`
        };
    }

    const branchResult = runChecked('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir });
    const branch = branchResult.stdout.trim();
    if (!branch || branch === 'HEAD') {
        throw new Error('Unable to determine git push target branch; set DAILY_GIT_PUSH_BRANCH');
    }

    return {
        remote,
        branch,
        refspec: `HEAD:${branch}`
    };
}

function writeEmailDraft(emailDraftPath, summaryLines) {
    fs.writeFileSync(emailDraftPath, `${summaryLines.join(os.EOL)}${os.EOL}`, 'utf-8');
}

function sendEmail({ emailDraftPath, subject, toEmail, pythonBin }) {
    return runChecked(pythonBin, ['send_email.py', subject, toEmail, emailDraftPath], {
        cwd: REPO_DIR
    });
}

function formatSummary(state) {
    const selectedTitle = state.selectedCandidate?.title || '未选出';
    const deployedUrl = state.deployedUrl || 'N/A';

    return [
        `Daily run status: ${state.status}`,
        `Profile: ${state.profileId}`,
        `Selected topic: ${selectedTitle}`,
        `App ID: ${state.appId || 'N/A'}`,
        `Model: ${state.model}`,
        `Validation: ${state.validationPassed ? 'passed' : 'not passed'}`,
        `Git push: ${state.gitPushed ? 'done' : 'not done'}`,
        `Deploy URL: ${deployedUrl}`,
        `Deployment check: ${state.deployVerified ? 'reachable' : 'not verified'}`,
        `Kuaishou publish: ${state.publishSucceeded ? 'done' : 'failed or skipped'}`,
        `Report summary: ${state.reportSummary || 'N/A'}`,
        `Response mode: ${state.responseMode || 'N/A'}`,
        `Raw response log: ${state.rawResponsePath || 'N/A'}`,
        state.errorMessage ? `Failure reason: ${state.errorMessage}` : 'Failure reason: none'
    ];
}

export async function runDailyOrchestrator(options = {}) {
    const repoDir = options.repoDir || REPO_DIR;
    const model = options.model || process.env.DAILY_COPILOT_MODEL || DEFAULT_MODEL;
    const profileId = options.profileId || process.env.DAILY_PROFILE_ID || DEFAULT_PROFILE_ID;
    const copilotBin = options.copilotBin || process.env.COPILOT_BIN || 'copilot';
    const emailDraftPath = options.emailDraftPath || process.env.EMAIL_DRAFT_PATH || EMAIL_DRAFT_PATH;
    const pythonBin = options.pythonBin || process.env.DAILY_PYTHON_BIN || '/usr/local/bin/python3';
    const toEmail = options.toEmail || process.env.DAILY_REPORT_TO || 'jackandking@163.com';
    const emailSubject = options.emailSubject || process.env.DAILY_REPORT_SUBJECT || '[Copilot Report] Daily Update';
    const skipGit = options.skipGit === true || process.env.DAILY_SKIP_GIT === 'true';
    const skipPublish = options.skipPublish === true || process.env.DAILY_SKIP_PUBLISH === 'true';
    const skipEmail = options.skipEmail === true || process.env.DAILY_SKIP_EMAIL === 'true';
    const allowDirty = options.allowDirty === true || process.env.DAILY_ALLOW_DIRTY_WORKTREE === 'true';
    const deployRetries = Number.parseInt(process.env.DAILY_DEPLOY_RETRIES || '10', 10);
    const deployDelayMs = Number.parseInt(process.env.DAILY_DEPLOY_RETRY_DELAY_MS || '15000', 10);

    const state = {
        status: 'failed',
        profileId,
        model,
        validationPassed: false,
        gitPushed: false,
        deployVerified: false,
        publishSucceeded: false,
        reportSummary: '',
        errorMessage: '',
        rawResponsePath: '',
        responseMode: ''
    };

    try {
        logProgress(
            `Starting orchestrator (profile=${profileId}, model=${model}, repo=${repoDir}, logs=${getDailyLogDir()})`
        );
        if (!allowDirty) {
            logStage('preflight', 'Checking worktree cleanliness');
            ensureCleanWorktree(repoDir);
        }

        const profile = getBrandProfile(profileId);
        const currentDate = new Date().toISOString().slice(0, 10);
        logStage('topics', `Loaded brand profile ${profile.id}`);
        const modelResponse = options.topicResponse || await requestStructuredTopics({
            model,
            profile,
            currentDate,
            copilotBin
        });
        const selected = chooseBestTopicCandidate(modelResponse.topicCandidates, profile);
        logStage('topics', `Selected candidate "${selected.candidate.title}" (score=${selected.scoring.score})`);
        const scaffoldSpec = buildScaffoldSpec(selected, profile);
        const scaffoldPlan = buildScaffoldPlan(scaffoldSpec);
        logStage('scaffold', `Materializing app ${scaffoldPlan.metadataEntry.id}`);
        const materialized = materializeScaffoldPlan({
            scaffoldPlan,
            repoDir
        });

        state.selectedCandidate = selected.candidate;
        state.appId = scaffoldPlan.metadataEntry.id;
        state.deployedUrl = `https://letmetryai.cn/${state.appId}/`;
        state.reportSummary = modelResponse.reportSummary;
        state.rawResponsePath = modelResponse.rawResponsePath || '';
        state.responseMode = modelResponse.responseMode || '';

        logStage('validation', `Running validator for ${scaffoldPlan.outputDir}`);
        runChecked('node', ['scripts/validate-voting-app.js', scaffoldPlan.outputDir], { cwd: repoDir });
        const validationResult = validateVotingAppDirectory(materialized.outputDir);
        if (!validationResult.valid) {
            throw new Error(`Validator rejected generated app: ${validationResult.errors.join('; ')}`);
        }
        state.validationPassed = true;
        logStage('validation', 'Validator passed');

        if (!skipGit) {
            commitAndPush({
                repoDir,
                appDirRelative: scaffoldPlan.outputDir,
                appId: scaffoldPlan.metadataEntry.id,
                appName: scaffoldPlan.metadataEntry.name
            });
            state.gitPushed = true;

            const deployCheck = await verifyDeployedUrl(state.deployedUrl, deployRetries, deployDelayMs);
            if (!deployCheck.success) {
                throw new Error(`Deployment verification failed for ${state.deployedUrl}`);
            }
            state.deployVerified = true;
        } else {
            logStage('git', 'Skipping git/deploy because DAILY_SKIP_GIT=true');
        }

        if (!skipPublish) {
            const publishPlan = buildPublishPlan({
                appId: scaffoldPlan.metadataEntry.id,
                appName: scaffoldPlan.metadataEntry.name,
                description: scaffoldPlan.metadataEntry.description,
                deployedUrl: state.deployedUrl,
                profileId,
                sourceTaskId: selected.candidate.sourceTaskId || undefined
            });
            logStage('publish', `Starting Kuaishou publish for ${scaffoldPlan.metadataEntry.id}`);
            await runStreamingChecked(publishPlan.command, [], {
                cwd: repoDir,
                shell: true,
                label: `Kuaishou publish (${scaffoldPlan.metadataEntry.id})`,
                passthroughStdout: true,
                passthroughStderr: true
            });
            state.publishSucceeded = true;
            logStage('publish', 'Kuaishou publish command completed');
        } else {
            logStage('publish', 'Skipping publish because DAILY_SKIP_PUBLISH=true');
        }

        state.status = 'success';
    } catch (error) {
        state.errorMessage = error instanceof Error ? error.message : String(error);
        logProgress(state.errorMessage, 'ERROR');
    }

    const summaryLines = formatSummary(state);
    logStage('summary', `Writing email draft to ${emailDraftPath}`);
    writeEmailDraft(emailDraftPath, summaryLines);

    if (!skipEmail) {
        try {
            logStage('email', `Sending report to ${toEmail}`);
            sendEmail({
                emailDraftPath,
                subject: emailSubject,
                toEmail,
                pythonBin
            });
            logStage('email', 'Report sent');
        } catch (emailError) {
            if (!state.errorMessage) {
                state.errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
            }
            state.status = 'failed';
            throw emailError;
        }
    } else {
        logStage('email', 'Skipping email because DAILY_SKIP_EMAIL=true');
    }

    if (state.status !== 'success') {
        process.exitCode = 1;
    }

    return state;
}

if (path.resolve(process.argv[1] || '') === __filename) {
    runDailyOrchestrator()
        .then(state => {
            const summary = formatSummary(state).join('\n');
            if (state.status === 'success') {
                console.log(summary);
                return;
            }

            console.error(summary);
            process.exit(process.exitCode || 1);
        })
        .catch(error => {
            console.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        });
}
