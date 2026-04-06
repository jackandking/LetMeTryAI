import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from '@jest/globals';
import {
    ensureRuntimeDirectories,
    isExecutedDirectly,
    resolveAutomationRoot,
    resolveConfigPath,
    resolveRuntimeDir,
    resolveWomanaiRoot
} from './runtime-paths.js';

const originalProjectDir = process.env.WOMANAI_PROJECT_DIR;
const originalRuntimeDir = process.env.WOMANAI_AUTOMATION_RUNTIME_DIR;
const originalConfigFile = process.env.WOMANAI_AUTOMATION_CONFIG_FILE;

afterEach(() => {
    if (originalProjectDir === undefined) {
        delete process.env.WOMANAI_PROJECT_DIR;
    } else {
        process.env.WOMANAI_PROJECT_DIR = originalProjectDir;
    }

    if (originalRuntimeDir === undefined) {
        delete process.env.WOMANAI_AUTOMATION_RUNTIME_DIR;
    } else {
        process.env.WOMANAI_AUTOMATION_RUNTIME_DIR = originalRuntimeDir;
    }

    if (originalConfigFile === undefined) {
        delete process.env.WOMANAI_AUTOMATION_CONFIG_FILE;
    } else {
        process.env.WOMANAI_AUTOMATION_CONFIG_FILE = originalConfigFile;
    }
});

describe('womanai automation runtime paths', () => {
    it('should resolve womanai root from environment override', () => {
        process.env.WOMANAI_PROJECT_DIR = '/tmp/womanai-root';
        expect(resolveWomanaiRoot(import.meta.url)).toBe('/tmp/womanai-root');
        expect(resolveAutomationRoot(import.meta.url)).toBe('/tmp/womanai-root/.automation');
    });

    it('should resolve config and runtime paths from overrides', () => {
        process.env.WOMANAI_PROJECT_DIR = '/tmp/womanai-root';
        process.env.WOMANAI_AUTOMATION_RUNTIME_DIR = '/tmp/womanai-runtime';
        process.env.WOMANAI_AUTOMATION_CONFIG_FILE = '/tmp/womanai-config.json';

        expect(resolveRuntimeDir(import.meta.url)).toBe('/tmp/womanai-runtime');
        expect(resolveConfigPath(import.meta.url)).toBe('/tmp/womanai-config.json');
    });

    it('should create runtime directories when asked', () => {
        const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'womanai-automation-'));
        process.env.WOMANAI_PROJECT_DIR = temporaryRoot;

        const result = ensureRuntimeDirectories(import.meta.url);
        expect(result.runtimeDir).toBe(path.join(temporaryRoot, '.automation', '.local'));

        ['logs', 'exports', 'tmp', 'generated'].forEach(directory => {
            expect(fs.existsSync(path.join(result.runtimeDir, directory))).toBe(true);
        });

        fs.rmSync(temporaryRoot, { recursive: true, force: true });
    });

    it('should not treat imports as direct execution', () => {
        expect(isExecutedDirectly(import.meta.url)).toBe(false);
    });
});
