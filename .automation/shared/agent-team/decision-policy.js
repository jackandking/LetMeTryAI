import { DECISION_LEVELS } from './protocol.js';

export const DEFAULT_DECISION_POLICY = Object.freeze({
    bossApprovalActions: ['publish', 'deploy', 'send-email', 'outbound-send', 'stop-live-task', 'destructive-cleanup'],
    managerApprovalActions: ['edit-repo', 'run-command', 'create-worktree', 'merge-worktree', 'git-push'],
    bossApprovalTags: ['external', 'irreversible', 'destructive'],
    managerApprovalTags: ['side-effect', 'writes-repo']
});

function normalizeArray(value) {
    return Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()) : [];
}

export function mergeDecisionPolicy(policy = {}) {
    return {
        bossApprovalActions: normalizeArray(policy.bossApprovalActions).length
            ? normalizeArray(policy.bossApprovalActions)
            : [...DEFAULT_DECISION_POLICY.bossApprovalActions],
        managerApprovalActions: normalizeArray(policy.managerApprovalActions).length
            ? normalizeArray(policy.managerApprovalActions)
            : [...DEFAULT_DECISION_POLICY.managerApprovalActions],
        bossApprovalTags: normalizeArray(policy.bossApprovalTags).length
            ? normalizeArray(policy.bossApprovalTags)
            : [...DEFAULT_DECISION_POLICY.bossApprovalTags],
        managerApprovalTags: normalizeArray(policy.managerApprovalTags).length
            ? normalizeArray(policy.managerApprovalTags)
            : [...DEFAULT_DECISION_POLICY.managerApprovalTags]
    };
}

function applyDecisionOverride(policy, override = {}) {
    const demotedActions = normalizeArray(override.demoteBossApprovalActions);
    const demotedTags = normalizeArray(override.demoteBossApprovalTags);

    return {
        bossApprovalActions: policy.bossApprovalActions
            .filter(action => !demotedActions.includes(action))
            .concat(normalizeArray(override.bossApprovalActions).filter(action => !policy.bossApprovalActions.includes(action))),
        managerApprovalActions: policy.managerApprovalActions
            .concat(demotedActions)
            .concat(normalizeArray(override.managerApprovalActions))
            .filter((action, index, values) => values.indexOf(action) === index),
        bossApprovalTags: policy.bossApprovalTags
            .filter(tag => !demotedTags.includes(tag))
            .concat(normalizeArray(override.bossApprovalTags).filter(tag => !policy.bossApprovalTags.includes(tag))),
        managerApprovalTags: policy.managerApprovalTags
            .concat(demotedTags)
            .concat(normalizeArray(override.managerApprovalTags))
            .filter((tag, index, values) => values.indexOf(tag) === index)
    };
}

export function classifyDecision(request = {}, policy = DEFAULT_DECISION_POLICY, override = {}) {
    const mergedPolicy = applyDecisionOverride(mergeDecisionPolicy(policy), override);
    const action = typeof request.action === 'string' ? request.action.trim() : '';
    const tags = normalizeArray(request.tags);

    if (request.requiresDecision === DECISION_LEVELS.BOSS || request.external === true) {
        return { decisionLevel: DECISION_LEVELS.BOSS, reason: 'Explicit boss approval required' };
    }

    if (request.requiresDecision === DECISION_LEVELS.MANAGER) {
        return { decisionLevel: DECISION_LEVELS.MANAGER, reason: 'Explicit manager approval required' };
    }

    if (mergedPolicy.bossApprovalActions.includes(action) || tags.some(tag => mergedPolicy.bossApprovalTags.includes(tag))) {
        return { decisionLevel: DECISION_LEVELS.BOSS, reason: `Action "${action}" is boss-gated` };
    }

    if (
        mergedPolicy.managerApprovalActions.includes(action) ||
        request.sideEffect === true ||
        request.writable === true ||
        tags.some(tag => mergedPolicy.managerApprovalTags.includes(tag))
    ) {
        return { decisionLevel: DECISION_LEVELS.MANAGER, reason: `Action "${action}" requires manager approval` };
    }

    return { decisionLevel: DECISION_LEVELS.NONE, reason: 'Routine reversible action' };
}
