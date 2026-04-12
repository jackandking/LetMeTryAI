import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = resolve('scripts/send-kuaishou-follow-report.py');
const pythonBin = process.env.PYTHON_BIN || 'python3';

test('send-kuaishou-follow-report.py sends a plain text email', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'kuaishou-follow-email-'));

    try {
        const bodyFile = join(tempDir, 'body.txt');
        const fakeSendmailPath = join(tempDir, 'sendmail');
        const capturedMessagePath = join(tempDir, 'captured.eml');
        writeFileSync(bodyFile, 'Daily follow report body', 'utf-8');
        writeFileSync(fakeSendmailPath, `#!/bin/sh\ncat > "${capturedMessagePath}"\n`, 'utf-8');
        chmodSync(fakeSendmailPath, 0o755);

        const result = spawnSync(
            pythonBin,
            [scriptPath, 'Follow Report', 'test@example.com', bodyFile],
            {
                encoding: 'utf8',
                env: {
                    ...process.env,
                    SENDMAIL_PATH: fakeSendmailPath
                }
            }
        );

        assert.equal(result.status, 0, result.stderr || result.stdout);
        const capturedMessage = readFileSync(capturedMessagePath, 'utf-8');
        assert.match(result.stdout, /Email sent\./);
        assert.match(capturedMessage, /Subject: Follow Report/);
        assert.match(capturedMessage, /Daily follow report body/);
    } finally {
        rmSync(tempDir, { recursive: true, force: true });
    }
});
