import path from 'path';
import { pathToFileURL } from 'url';
import { resolveProjectRoot } from './runtime-paths.js';

describe('runtime-paths', () => {
    it('finds the repository root from nested skill files', () => {
        const nestedSkillPath = path.resolve(
            '.automation/skills/agent-team-status/scripts/status.js'
        );
        const projectRoot = resolveProjectRoot(pathToFileURL(nestedSkillPath).href);

        expect(projectRoot).toBe(path.resolve('.'));
    });
});
