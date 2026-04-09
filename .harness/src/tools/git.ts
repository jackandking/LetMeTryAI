/**
 * Git Tools - Repository operations
 */
import { spawn } from 'child_process';
import { Tool } from '../types/index.js';
import { PATHS } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface GitCommitArgs {
  message: string;
  files?: string[];
}

interface GitPushArgs {
  remote?: string;
  branch?: string;
}

function runGit(args: string[], cwd = PATHS.projectRoot): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`git ${args.join(' ')} failed: ${stderr || stdout}`));
      } else {
        resolve(stdout.trim());
      }
    });

    child.on('error', reject);
  });
}

export const gitAddTool: Tool = {
  name: 'git.add',
  description: 'Stage files for commit',
  schema: {
    type: 'object',
    properties: {
      files: { type: 'array', items: { type: 'string' }, description: 'Files to stage' },
    },
    required: ['files'],
  },
  async execute(args: unknown): Promise<unknown> {
    const { files } = args as { files: string[] };
    logger.info('Staging files', { count: files.length });
    await runGit(['add', '--', ...files]);
    return { staged: files.length };
  },
};

export const gitCommitTool: Tool = {
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
  async execute(args: unknown): Promise<unknown> {
    const { message, files } = args as GitCommitArgs;
    
    if (files) {
      await runGit(['add', '--', ...files]);
    }
    
    logger.info('Creating commit', { message: message.substring(0, 50) });
    await runGit(['commit', '-m', message]);
    return { committed: true };
  },
};

export const gitPushTool: Tool = {
  name: 'git.push',
  description: 'Push commits to remote',
  schema: {
    type: 'object',
    properties: {
      remote: { type: 'string', default: 'origin', description: 'Remote name' },
      branch: { type: 'string', description: 'Branch to push (defaults to current)' },
    },
  },
  async execute(args: unknown): Promise<unknown> {
    const { remote = 'origin', branch } = args as GitPushArgs;
    
    const pushArgs = ['push', remote];
    if (branch) {
      pushArgs.push(branch);
    }
    
    logger.info('Pushing to remote', { remote, branch });
    await runGit(pushArgs);
    return { pushed: true };
  },
};

export const gitStatusTool: Tool = {
  name: 'git.status',
  description: 'Check repository status',
  schema: {
    type: 'object',
    properties: {},
  },
  async execute(): Promise<unknown> {
    const status = await runGit(['status', '--porcelain']);
    const isClean = status === '';
    return { clean: isClean, output: status };
  },
};

export const gitPullTool: Tool = {
  name: 'git.pull',
  description: 'Pull latest changes',
  schema: {
    type: 'object',
    properties: {
      ffOnly: { type: 'boolean', default: true },
    },
  },
  async execute(args: unknown): Promise<unknown> {
    const { ffOnly = true } = args as { ffOnly?: boolean };
    const pullArgs = ['pull'];
    if (ffOnly) pullArgs.push('--ff-only');
    
    logger.info('Pulling latest changes');
    await runGit(pullArgs);
    return { pulled: true };
  },
};

export const gitGetCurrentBranchTool: Tool = {
  name: 'git.currentBranch',
  description: 'Get current branch name',
  schema: { type: 'object', properties: {} },
  async execute(): Promise<unknown> {
    const branch = await runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    return { branch };
  },
};
