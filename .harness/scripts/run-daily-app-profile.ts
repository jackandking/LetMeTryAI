import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DailyAppAgent } from '../src/agents/daily-app-agent.js';
import { PATHS, ensureDirectories } from '../src/config/index.js';
import type { TaskState, TopicCandidate } from '../src/types/index.js';

type CandidateSummary = {
  appId: string;
  title: string;
  appName: string;
  category: string;
};

function sanitizeProfileId(profileId: string): string {
  return profileId.replace(/[^a-zA-Z0-9-]/g, '-');
}

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function toIso(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

function buildSummary(
  profileId: string,
  startedAt: Date,
  endedAt: Date,
  state: TaskState | null,
  error: Error | null
): Record<string, unknown> {
  const data = state?.data ?? {};
  const topic = (data.topic ?? null) as TopicCandidate | null;
  const topicSelection = (data.topicSelection ?? {}) as {
    reportSummary?: string;
    candidates?: CandidateSummary[];
  };

  return {
    timestamp: endedAt.toISOString(),
    profileId,
    success: !error,
    durationMs: endedAt.getTime() - startedAt.getTime(),
    taskId: state?.task.id ?? null,
    iterationCount: state?.iteration ?? null,
    currentStep: state?.currentStep ?? null,
    reportSummary: topicSelection.reportSummary ?? null,
    topicCandidates: Array.isArray(topicSelection.candidates)
      ? topicSelection.candidates
      : [],
    selectedTopic: topic
      ? {
          appId: topic.appId,
          title: topic.title,
          appName: topic.appName,
          category: topic.category,
          question: topic.question,
        }
      : null,
    publish: {
      distributionTaskCreated:
        typeof data.published === 'boolean' ? data.published : null,
      distributionPlanId:
        typeof data.planId === 'string' ? data.planId : null,
      videoGenerated:
        typeof data.videoGenerated === 'boolean' ? data.videoGenerated : null,
      videoPublished:
        typeof data.videoPublished === 'boolean' ? data.videoPublished : null,
      videoShareUrl:
        typeof data.videoShareUrl === 'string' ? data.videoShareUrl : null,
    },
    steps: Array.isArray(state?.history)
      ? state.history.map(record => ({
          step: record.step,
          success: record.observation.success,
          timestamp: toIso(record.timestamp),
          durationMs: record.observation.metrics?.duration ?? null,
        }))
      : [],
    errorMessage: error?.message ?? null,
  };
}

async function main(): Promise<void> {
  const profileId = process.argv[2];

  if (!profileId) {
    console.error('Usage: tsx scripts/run-daily-app-profile.ts <profile-id>');
    process.exit(1);
  }

  ensureDirectories();

  const safeProfileId = sanitizeProfileId(profileId);
  const runsDir = join(PATHS.state, 'daily-app-runs');
  const summaryFile = join(runsDir, `${safeProfileId}.jsonl`);
  const logFile =
    process.env.HARNESS_CRON_LOG_FILE || join(PATHS.logs, 'daily-app-cron', `${safeProfileId}.log`);

  ensureDir(runsDir);

  const startedAt = new Date();
  console.log(
    `[run-daily-app-profile] profile=${profileId} mode=${process.env.HARNESS_MODE || 'shadow'}`
  );
  console.log(`[run-daily-app-profile] log_file=${logFile}`);
  console.log(`[run-daily-app-profile] summary_file=${summaryFile}`);

  let state: TaskState | null = null;
  let error: Error | null = null;

  try {
    const agent = new DailyAppAgent(profileId);
    state = await agent.run();
  } catch (caughtError) {
    error = caughtError as Error;
  }

  const endedAt = new Date();
  const summary = buildSummary(profileId, startedAt, endedAt, state, error);
  appendFileSync(summaryFile, `${JSON.stringify(summary)}\n`, 'utf-8');

  if (error) {
    console.error(`[run-daily-app-profile] failed: ${error.message}`);
    process.exit(1);
  }

  console.log(
    `[run-daily-app-profile] completed: selected=${(summary.selectedTopic as { appId?: string } | null)?.appId || 'n/a'}`
  );
  process.exit(0);
}

await main();
