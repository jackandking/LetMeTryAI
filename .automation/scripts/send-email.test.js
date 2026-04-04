import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

describe('send_email.py', () => {
    const scriptPath = path.resolve('.automation/scripts/send_email.py');
    const pythonBin = process.env.PYTHON_BIN || 'python3';
    let tempDir;
    let bodyFile;

    beforeEach(() => {
        tempDir = mkdtempSync(path.join(os.tmpdir(), 'send-email-test-'));
        bodyFile = path.join(tempDir, 'body.txt');
        writeFileSync(bodyFile, 'Daily report body', 'utf8');
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    function runSendEmail(env = {}) {
        return spawnSync(pythonBin, [scriptPath, 'Test Subject', 'test@example.com', bodyFile], {
            encoding: 'utf8',
            env: {
                ...process.env,
                ...env
            }
        });
    }

    it('should exit successfully when AgentMail succeeds', () => {
        const result = runSendEmail({
            SEND_EMAIL_FORCE_AGENTMAIL_SUCCESS: 'true'
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('Trying AgentMail...');
        expect(result.stdout).toContain('Email sent successfully.');
        expect(result.stderr).toBe('');
    });

    it('should fall back to system mail when AgentMail fails', () => {
        const result = runSendEmail({
            SEND_EMAIL_FORCE_AGENTMAIL_ERROR: 'ssl handshake failed',
            SEND_EMAIL_FORCE_SENDMAIL_SUCCESS: 'true'
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('Trying AgentMail...');
        expect(result.stdout).toContain('Trying system mail command...');
        expect(result.stdout).toContain('Email sent via system mail.');
        expect(result.stderr).toContain('AgentMail failed: ssl handshake failed');
    });

    it('should exit non-zero when both email providers fail', () => {
        const result = runSendEmail({
            SEND_EMAIL_FORCE_AGENTMAIL_ERROR: 'ssl handshake failed',
            SEND_EMAIL_FORCE_SENDMAIL_ERROR: 'sendmail unavailable'
        });

        expect(result.status).toBe(1);
        expect(result.stdout).toContain('Trying system mail command...');
        expect(result.stderr).toContain('AgentMail failed: ssl handshake failed');
        expect(result.stderr).toContain('System mail also failed: sendmail unavailable');
    });
});
