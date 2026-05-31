import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { ensureDirectory, resolveProjectRoot } from '../../scripts/runtime-paths.js';
import {
    resolveAgentWorkspaceLeaseDir,
    resolveAgentWorkspaceRootDir
} from './runtime-paths.js';
import { readJsonFile, writeJsonAtomic } from './file-queue.js';

function normalizeScope(scopePath) {
    return scopePath.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+$/, '');
}

export function normalizeScopePaths(scopePaths = []) {
    return [...new Set(scopePaths
        .filter(scopePath => typeof scopePath === 'string' && scopePath.trim())
        .map(scopePath => normalizeScope(scopePath.trim()))
        .filter(Boolean))].sort();
}

export function scopesOverlap(leftScopes = [], rightScopes = []) {
    const normalizedLeft = normalizeScopePaths(leftScopes);
    const normalizedRight = normalizeScopePaths(rightScopes);

    return normalizedLeft.some(leftScope => normalizedRight.some(rightScope =>
        leftScope === rightScope ||
        leftScope.startsWith(`${rightScope}/`) ||
        rightScope.startsWith(`${leftScope}/`)
    ));
}

export function listWorkspaceLeases(fromUrl) {
    const leaseDir = resolveAgentWorkspaceLeaseDir(fromUrl);
    ensureDirectory(leaseDir);
    return fs.readdirSync(leaseDir)
        .filter(fileName => fileName.endsWith('.json'))
        .map(fileName => readJsonFile(path.join(leaseDir, fileName)));
}

function git(projectRoot, args) {
    const result = spawnSync('git', args, {
        cwd: projectRoot,
        encoding: 'utf-8'
    });

    if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout || `git ${args.join(' ')} failed`);
    }
}

export function acquireWorkspaceLease(input = {}) {
    const fromUrl = input.fromUrl;
    const projectRoot = typeof input.projectRoot === 'string' && input.projectRoot.trim()
        ? path.resolve(input.projectRoot)
        : resolveProjectRoot(fromUrl);
    const leaseDir = resolveAgentWorkspaceLeaseDir(fromUrl);
    const workspaceRootDir = resolveAgentWorkspaceRootDir(fromUrl);
    const scopePaths = normalizeScopePaths(input.scopePaths);
    const writable = Boolean(input.writable);
    const activeLeases = listWorkspaceLeases(fromUrl).filter(lease => lease.status === 'active');
    const conflictingLease = activeLeases.find(lease =>
        (lease.writable || writable) && scopesOverlap(lease.scopePaths, scopePaths)
    );

    if (conflictingLease) {
        throw new Error(
            `Workspace conflict with ${conflictingLease.agentId}:${conflictingLease.workspaceId} for ${scopePaths.join(', ')}`
        );
    }

    ensureDirectory(leaseDir);
    ensureDirectory(workspaceRootDir);

    const workspaceId = input.workspaceId || `${input.agentId || 'agent'}-${crypto.randomBytes(4).toString('hex')}`;
    const workspacePath = writable
        ? path.join(workspaceRootDir, workspaceId)
        : projectRoot;
    const leasePath = path.join(leaseDir, `${workspaceId}.json`);
    const lease = {
        workspaceId,
        agentId: input.agentId,
        taskId: input.taskId || null,
        scopePaths,
        writable,
        baseRef: input.baseRef || 'HEAD',
        workspacePath,
        projectRoot,
        status: 'active',
        createdAt: new Date().toISOString()
    };

    if (writable) {
        git(projectRoot, ['worktree', 'add', '--detach', workspacePath, lease.baseRef]);
    }

    writeJsonAtomic(leasePath, lease);
    return lease;
}

export function releaseWorkspaceLease(input = {}) {
    const fromUrl = input.fromUrl;
    const leaseDir = resolveAgentWorkspaceLeaseDir(fromUrl);
    const leasePath = path.join(leaseDir, `${input.workspaceId}.json`);
    const lease = readJsonFile(leasePath);

    if (lease.writable && input.removeWorktree !== false && fs.existsSync(lease.workspacePath)) {
        git(lease.projectRoot, ['worktree', 'remove', '--force', lease.workspacePath]);
    }

    const releasedLease = {
        ...lease,
        status: input.status || 'released',
        releasedAt: new Date().toISOString()
    };
    writeJsonAtomic(leasePath, releasedLease);
    return releasedLease;
}

