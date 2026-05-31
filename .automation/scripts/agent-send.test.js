import fs from 'fs';
import os from 'os';
import path from 'path';
import { queueAgentMessage } from './agent-send.js';

describe('agent-send', () => {
    let tempDir;
    let repoDir;
    let runtimeDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-send-test-'));
        repoDir = path.join(tempDir, 'repo');
        runtimeDir = path.join(tempDir, 'runtime');
        fs.mkdirSync(path.join(repoDir, '.automation', 'config', 'agent-missions'), { recursive: true });
        fs.cpSync(path.resolve('.automation/config'), path.join(repoDir, '.automation', 'config'), { recursive: true });
        process.env.PROJECT_DIR = repoDir;
        process.env.LETMETRY_RUNTIME_DIR = runtimeDir;
    });

    afterEach(() => {
        delete process.env.PROJECT_DIR;
        delete process.env.LETMETRY_RUNTIME_DIR;
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('queues a message into an agent inbox', () => {
        const filePath = queueAgentMessage({
            to: 'parent-revenue',
            from: 'boss',
            message: 'Focus on payment conversion',
            focusArea: 'payment-conversion',
            proposedAction: 'publish'
        });

        const payload = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(payload.to).toBe('parent-revenue');
        expect(payload.payload.focusArea).toBe('payment-conversion');
        expect(payload.payload.proposedAction).toBe('publish');
    });
});

