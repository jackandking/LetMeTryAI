import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildParentRevenueCopilotArgs, writeAgentCopilotContext } from './copilot-engine.js';

describe('copilot-engine', () => {
    let tempDir;
    let repoDir;
    let runtimeDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-engine-test-'));
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

    it('writes durable brief and handoff files', () => {
        const context = writeAgentCopilotContext(import.meta.url, 'parent-revenue');

        expect(fs.existsSync(context.briefPath)).toBe(true);
        expect(fs.existsSync(context.handoffPath)).toBe(true);
        expect(fs.readFileSync(context.briefPath, 'utf-8')).toContain('Target metric');
        expect(fs.readFileSync(context.handoffPath, 'utf-8')).toContain('Parent agent state snapshot');
    });

    it('builds a stable copilot launch command', () => {
        const result = buildParentRevenueCopilotArgs({ fromUrl: import.meta.url });
        const sessionIdIndex = result.args.indexOf('--session-id');
        const nameIndex = result.args.indexOf('--name');

        expect(result.args).toContain('--autopilot');
        expect(result.args).toContain('--allow-all-tools');
        expect(result.args[nameIndex + 1]).toBe('parent-revenue');
        expect(result.args[sessionIdIndex + 1]).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
    });
});

