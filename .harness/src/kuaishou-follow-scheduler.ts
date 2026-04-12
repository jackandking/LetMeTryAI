import { Cron } from 'croner';
import { join } from 'path';

import { runDailyIngestion, runHourlyFollowWorker, sendDailyFollowReport } from '../scripts/kuaishou-follow-daily.js';

const repoRoot = join(process.cwd(), '..');
const timeZone = 'Asia/Shanghai';
const ingestionCron = '0 14 * * *';
const workerCron = '0 * * * *';

export class KuaishouFollowScheduler {
  private jobs: Map<string, Cron> = new Map();

  start(): void {
    this.jobs.set('daily-ingestion', new Cron(ingestionCron, { timezone: timeZone }, async () => {
      await runDailyIngestion({ repoRoot });
    }));

    this.jobs.set('hourly-worker', new Cron(workerCron, { timezone: timeZone }, async () => {
      await runHourlyFollowWorker({ repoRoot });
    }));

    console.log('[KuaishouFollowScheduler] jobs scheduled');
  }

  stop(): void {
    for (const [, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
  }

  getStatus(): Record<string, unknown> {
    const jobs: Record<string, unknown> = {};
    for (const [name, job] of this.jobs) {
      jobs[name] = {
        nextRun: job.nextRun(),
        previousRun: job.previousRun()
      };
    }
    return {
      timezone: timeZone,
      jobs
    };
  }
}

if (import.meta.main) {
  const [command = 'status'] = process.argv.slice(2);
  const scheduler = new KuaishouFollowScheduler();

  switch (command) {
    case 'start':
      scheduler.start();
      setInterval(() => {}, 1000 * 60 * 60);
      break;
    case 'run-ingest':
      await runDailyIngestion({ repoRoot });
      break;
    case 'run-worker':
      await runHourlyFollowWorker({ repoRoot });
      break;
    case 'send-report':
      await sendDailyFollowReport({ repoRoot });
      break;
    case 'status':
      scheduler.start();
      console.log(JSON.stringify(scheduler.getStatus(), null, 2));
      scheduler.stop();
      break;
    default:
      console.log('Usage: tsx src/kuaishou-follow-scheduler.ts [start|run-ingest|run-worker|send-report|status]');
  }
}
