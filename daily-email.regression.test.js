import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

describe('Regression Tests - Daily Email Delivery', () => {
    const scriptPath = path.resolve('.automation/scripts/send_email.py');
    const pythonBin = process.env.PYTHON_BIN || 'python3';

    it('should fail the pipeline when AgentMail and system mail both fail', () => {
        const tempDir = mkdtempSync(path.join(os.tmpdir(), 'send-email-regression-'));
        const bodyFile = path.join(tempDir, 'body.txt');
        writeFileSync(bodyFile, 'Daily report body', 'utf8');

        const result = spawnSync(pythonBin, [scriptPath, 'Regression Subject', 'test@example.com', bodyFile], {
            encoding: 'utf8',
            env: {
                ...process.env,
                SEND_EMAIL_FORCE_AGENTMAIL_ERROR: 'ssl handshake failed',
                SEND_EMAIL_FORCE_SENDMAIL_ERROR: 'sendmail unavailable'
            }
        });

        rmSync(tempDir, { recursive: true, force: true });

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('System mail also failed: sendmail unavailable');
    });
});
