import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

describe('send-hot-task-video.py', () => {
    const scriptPath = path.resolve('.harness/scripts/send-hot-task-video.py');
    const pythonBin = process.env.PYTHON_BIN || 'python3';
    let tempDir;
    let bodyFile;
    let attachmentFile;

    beforeEach(() => {
        tempDir = mkdtempSync(path.join(os.tmpdir(), 'send-hot-task-video-test-'));
        bodyFile = path.join(tempDir, 'body.txt');
        attachmentFile = path.join(tempDir, 'parent-chat-teen-kuaishou-hot-task-video.mp4');
        writeFileSync(bodyFile, 'Harness video body', 'utf8');
        writeFileSync(attachmentFile, 'fake video bytes', 'utf8');
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    it('should send an attachment through sendmail', () => {
        const fakeSendmailPath = path.join(tempDir, 'sendmail');
        const capturedMessagePath = path.join(tempDir, 'captured.eml');

        writeFileSync(fakeSendmailPath, `#!/bin/sh\ncat > "${capturedMessagePath}"\n`, 'utf8');
        chmodSync(fakeSendmailPath, 0o755);

        const result = spawnSync(
            pythonBin,
            [scriptPath, 'Hot Task Video', 'test@example.com', bodyFile, attachmentFile],
            {
                encoding: 'utf8',
                env: {
                    ...process.env,
                    SENDMAIL_PATH: fakeSendmailPath
                }
            }
        );

        const capturedMessage = readFileSync(capturedMessagePath, 'utf8');
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('Email sent with attachment.');
        expect(result.stderr).toBe('');
        expect(capturedMessage).toContain('Subject: Hot Task Video');
        expect(capturedMessage).toContain('Content-Disposition: attachment;');
        expect(capturedMessage).toContain('filename="parent-chat-teen-kuaishou-hot-task-video.mp4"');
    });
});
