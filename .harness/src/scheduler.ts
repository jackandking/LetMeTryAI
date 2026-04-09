/**
 * Harness Scheduler - Entry point for daily automation
 * Replaces Unix cron with a programmable scheduler
 */
import { Cron } from 'croner';
import { DailyAppAgent } from './agents/daily-app-agent.js';
import { getHarnessMode, loadHarnessConfig, ensureDirectories, PATHS } from './config/index.js';
import { existsSync } from 'fs';
import { join } from 'path';

interface ScheduleConfig {
  profileId: string;
  cron: string;
  timezone?: string;
}

const DEFAULT_SCHEDULES: ScheduleConfig[] = [
  { profileId: 'nanrenbao', cron: '0 7 * * *', timezone: 'Asia/Shanghai' },
  { profileId: 'elder-love', cron: '0 8 * * *', timezone: 'Asia/Shanghai' },
  { profileId: 'parent-tools', cron: '0 9 * * *', timezone: 'Asia/Shanghai' },
  { profileId: 'womanai', cron: '0 10 * * *', timezone: 'Asia/Shanghai' },
];

export class HarnessScheduler {
  private jobs: Map<string, Cron> = new Map();
  private mode: string;

  constructor() {
    this.mode = getHarnessMode();
    ensureDirectories();
  }

  /**
   * Start all scheduled jobs
   */
  start(): void {
    console.log(`[Scheduler] Starting in ${this.mode} mode`);

    if (this.mode === 'legacy') {
      console.log('[Scheduler] Legacy mode - not starting harness scheduler');
      return;
    }

    for (const schedule of DEFAULT_SCHEDULES) {
      this.scheduleProfile(schedule);
    }

    console.log(`[Scheduler] ${this.jobs.size} jobs scheduled`);
  }

  /**
   * Schedule a single profile
   */
  private scheduleProfile(config: ScheduleConfig): void {
    const config2 = loadHarnessConfig();
    
    // In canary mode, only run canary profiles
    if (this.mode === 'canary' && !config2.canaryProfiles.includes(config.profileId)) {
      console.log(`[Scheduler] Skipping ${config.profileId} (not in canary list)`);
      return;
    }

    console.log(`[Scheduler] Scheduling ${config.profileId} at "${config.cron}"`);

    const job = Cron(config.cron, { timezone: config.timezone }, async () => {
      console.log(`\n[Scheduler] Running ${config.profileId} at ${new Date().toISOString()}`);
      
      try {
        const agent = new DailyAppAgent(config.profileId);
        const state = await agent.run();
        
        console.log(`[Scheduler] ${config.profileId} completed in ${state.iteration} iterations`);
      } catch (error) {
        console.error(`[Scheduler] ${config.profileId} failed:`, (error as Error).message);
        // In production, this would send alert
      }
    });

    this.jobs.set(config.profileId, job);
  }

  /**
   * Run a profile immediately (for testing)
   */
  async runNow(profileId: string): Promise<void> {
    console.log(`[Scheduler] Running ${profileId} immediately`);
    
    const agent = new DailyAppAgent(profileId);
    await agent.run();
  }

  /**
   * Stop all jobs
   */
  stop(): void {
    for (const [profileId, job] of this.jobs) {
      job.stop();
      console.log(`[Scheduler] Stopped ${profileId}`);
    }
    this.jobs.clear();
  }

  /**
   * Get status of all jobs
   */
  getStatus(): Record<string, unknown> {
    const status: Record<string, unknown> = {
      mode: this.mode,
      totalJobs: this.jobs.size,
      jobs: {},
    };

    for (const [profileId, job] of this.jobs) {
      status.jobs[profileId] = {
        nextRun: job.nextRun(),
        previousRun: job.previousRun(),
      };
    }

    return status;
  }
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];

  const scheduler = new HarnessScheduler();

  switch (command) {
    case 'start':
      scheduler.start();
      // Keep process alive
      setInterval(() => {}, 1000 * 60 * 60);
      break;

    case 'run':
      const profileId = args[1];
      if (!profileId) {
        console.error('Usage: bun run scheduler.ts run <profile-id>');
        process.exit(1);
      }
      await scheduler.runNow(profileId);
      process.exit(0);
      break;

    case 'status':
      console.log(JSON.stringify(scheduler.getStatus(), null, 2));
      process.exit(0);
      break;

    default:
      console.log('Usage: bun run scheduler.ts [start|run <profile>|status]');
      console.log('');
      console.log('Commands:');
      console.log('  start          Start the scheduler (runs indefinitely)');
      console.log('  run <profile>  Run a profile immediately');
      console.log('  status         Show scheduler status');
      console.log('');
      console.log('Environment:');
      console.log('  HARNESS_MODE=shadow|canary|production|legacy');
      process.exit(0);
  }
}
