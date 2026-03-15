import fs from 'fs';
import path from 'path';

describe('run-daily-profile wrapper', () => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'run-daily-profile.sh');
    const docsPath = path.join(process.cwd(), 'DAILY_REPORT_SETUP.md');
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
    const docsContent = fs.readFileSync(docsPath, 'utf-8');

    it('should require a profile id and isolate per-profile runtime paths', () => {
        expect(scriptContent).toContain('Usage: scripts/run-daily-profile.sh <profile-id>');
        expect(scriptContent).toContain('export DAILY_PROFILE_ID="$PROFILE_ID"');
        expect(scriptContent).toContain('export DAILY_LOG_DIR=');
        expect(scriptContent).toContain('export EMAIL_DRAFT_PATH=');
        expect(scriptContent).toContain('export KUAISHOU_AUTH_FILE=');
    });

    it('should pull latest code before invoking the daily pipeline', () => {
        expect(scriptContent).toContain('git pull --ff-only');
        expect(scriptContent).toContain('exec ./daily_run.sh');
    });

    it('should document staggered multi-brand cron examples', () => {
        expect(docsContent).toContain('scripts/run-daily-profile.sh nanrenbao');
        expect(docsContent).toContain('scripts/run-daily-profile.sh elder-love');
        expect(docsContent).toContain('logs/daily-run-nanrenbao.log');
        expect(docsContent).toContain('logs/daily-run-elder-love.log');
    });
});
