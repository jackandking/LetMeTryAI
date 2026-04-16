/**
 * Git Tools - Repository operations
 */
import { spawn } from 'child_process';
import { PATHS } from '../config/index.js';
import { logger } from '../utils/logger.js';
function runGit(args, cwd = PATHS.projectRoot) {
    return new Promise((resolve, reject) => {
        const child = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
        child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`git ${args.join(' ')} failed: ${stderr || stdout}`));
            }
            else {
                resolve(stdout.trim());
            }
        });
        child.on('error', reject);
    });
}
export const gitAddTool = {
    name: 'git.add',
    description: 'Stage files for commit',
    schema: {
        type: 'object',
        properties: {
            files: { type: 'array', items: { type: 'string' }, description: 'Files to stage' },
        },
        required: ['files'],
    },
    async execute(args) {
        const { files } = args;
        logger.info('Staging files', { count: files.length });
        await runGit(['add', '--', ...files]);
        return { staged: files.length };
    },
};
export const gitCommitTool = {
    name: 'git.commit',
    description: 'Create a commit',
    schema: {
        type: 'object',
        properties: {
            message: { type: 'string', description: 'Commit message' },
            files: { type: 'array', items: { type: 'string' } },
        },
        required: ['message'],
    },
    async execute(args) {
        const { message, files } = args;
        if (files) {
            await runGit(['add', '--', ...files]);
        }
        logger.info('Creating commit', { message: message.substring(0, 50) });
        await runGit(['commit', '-m', message]);
        return { committed: true };
    },
};
export const gitPushTool = {
    name: 'git.push',
    description: 'Push commits to remote',
    schema: {
        type: 'object',
        properties: {
            remote: { type: 'string', default: 'origin', description: 'Remote name' },
            branch: { type: 'string', description: 'Branch to push (defaults to current)' },
        },
    },
    async execute(args) {
        const { remote = 'origin', branch } = args;
        const pushArgs = ['push', remote];
        if (branch) {
            pushArgs.push(branch);
        }
        logger.info('Pushing to remote', { remote, branch });
        await runGit(pushArgs);
        return { pushed: true };
    },
};
export const gitStatusTool = {
    name: 'git.status',
    description: 'Check repository status',
    schema: {
        type: 'object',
        properties: {},
    },
    async execute() {
        const status = await runGit(['status', '--porcelain']);
        const isClean = status === '';
        return { clean: isClean, output: status };
    },
};
export const gitPullTool = {
    name: 'git.pull',
    description: 'Pull latest changes',
    schema: {
        type: 'object',
        properties: {
            ffOnly: { type: 'boolean', default: true },
        },
    },
    async execute(args) {
        const { ffOnly = true } = args;
        const pullArgs = ['pull'];
        if (ffOnly)
            pullArgs.push('--ff-only');
        logger.info('Pulling latest changes');
        await runGit(pullArgs);
        return { pulled: true };
    },
};
export const gitGetCurrentBranchTool = {
    name: 'git.currentBranch',
    description: 'Get current branch name',
    schema: { type: 'object', properties: {} },
    async execute() {
        const branch = await runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
        return { branch };
    },
};
//# sourceMappingURL=git.js.map