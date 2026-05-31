import fs from 'fs';
import os from 'os';
import path from 'path';
import { enqueueJson, archiveClaimedJson, claimNextJson, readJsonFile } from './file-queue.js';

describe('agent-team file queue', () => {
    let tempDir;
    let queueDir;
    let claimsDir;
    let archiveDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-queue-test-'));
        queueDir = path.join(tempDir, 'queue');
        claimsDir = path.join(tempDir, 'claims');
        archiveDir = path.join(tempDir, 'archive');
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('enqueues, claims, and archives messages atomically', () => {
        enqueueJson(queueDir, { message: 'hello' });
        const claimPath = claimNextJson(queueDir, claimsDir, 'worker-1');

        expect(claimPath).toContain('worker-1');
        expect(readJsonFile(claimPath)).toEqual({ message: 'hello' });

        const archivePath = archiveClaimedJson(claimPath, archiveDir, { status: 'done' });
        const archived = readJsonFile(archivePath);

        expect(archived.message).toBe('hello');
        expect(archived.archive.status).toBe('done');
    });
});

