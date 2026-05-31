import crypto from 'crypto';

export const MESSAGE_TYPES = Object.freeze([
    'task.start',
    'task.spawn',
    'decision.request',
    'decision.approved',
    'decision.blocked',
    'review.request',
    'review.result',
    'status.update'
]);

export const DECISION_LEVELS = Object.freeze({
    NONE: 'none',
    MANAGER: 'manager',
    BOSS: 'boss'
});

export const APPROVAL_STATUSES = Object.freeze({
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
});

function createIdentifier(prefix) {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function normalizeScopePaths(scopePaths) {
    if (!Array.isArray(scopePaths)) {
        return [];
    }

    return [...new Set(scopePaths
        .filter(value => typeof value === 'string' && value.trim())
        .map(value => value.trim()))].sort();
}

export function createEnvelope(input = {}) {
    const envelope = {
        id: typeof input.id === 'string' && input.id.trim() ? input.id.trim() : createIdentifier('msg'),
        type: input.type,
        from: typeof input.from === 'string' ? input.from.trim() : '',
        to: typeof input.to === 'string' && input.to.trim() ? input.to.trim() : 'manager',
        taskId: typeof input.taskId === 'string' && input.taskId.trim() ? input.taskId.trim() : null,
        inReplyTo: typeof input.inReplyTo === 'string' && input.inReplyTo.trim() ? input.inReplyTo.trim() : null,
        createdAt: typeof input.createdAt === 'string' ? input.createdAt : new Date().toISOString(),
        requiresDecision: input.requiresDecision || DECISION_LEVELS.NONE,
        scopePaths: normalizeScopePaths(input.scopePaths),
        payload: input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload)
            ? input.payload
            : {},
        metadata: input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
            ? input.metadata
            : {}
    };

    validateEnvelope(envelope);
    return envelope;
}

export function validateEnvelope(envelope) {
    if (!MESSAGE_TYPES.includes(envelope?.type)) {
        throw new Error(`Unsupported message type: ${envelope?.type}`);
    }
    if (typeof envelope?.from !== 'string' || !envelope.from.trim()) {
        throw new Error('Message envelope requires a non-empty "from" field');
    }
    if (typeof envelope?.to !== 'string' || !envelope.to.trim()) {
        throw new Error('Message envelope requires a non-empty "to" field');
    }
    if (!Object.values(DECISION_LEVELS).includes(envelope?.requiresDecision)) {
        throw new Error(`Unsupported decision level: ${envelope?.requiresDecision}`);
    }
    if (typeof envelope?.payload !== 'object' || envelope.payload === null || Array.isArray(envelope.payload)) {
        throw new Error('Message envelope payload must be an object');
    }
    if (!Array.isArray(envelope?.scopePaths)) {
        throw new Error('Message envelope scopePaths must be an array');
    }
    return envelope;
}

export function createApprovalRequest(messageEnvelope, classification) {
    validateEnvelope(messageEnvelope);

    const approvalRequest = {
        id: createIdentifier('approval'),
        sourceMessageId: messageEnvelope.id,
        taskId: messageEnvelope.taskId,
        requestedBy: messageEnvelope.from,
        requestedAt: new Date().toISOString(),
        decisionLevel: classification.decisionLevel,
        reason: classification.reason,
        action: typeof messageEnvelope.payload?.action === 'string' ? messageEnvelope.payload.action : 'unspecified',
        scopePaths: normalizeScopePaths(messageEnvelope.scopePaths),
        status: classification.decisionLevel === DECISION_LEVELS.BOSS
            ? APPROVAL_STATUSES.PENDING
            : APPROVAL_STATUSES.APPROVED,
        payload: messageEnvelope.payload
    };

    validateApprovalRequest(approvalRequest);
    return approvalRequest;
}

export function validateApprovalRequest(approvalRequest) {
    if (!Object.values(DECISION_LEVELS).includes(approvalRequest?.decisionLevel)) {
        throw new Error(`Unsupported approval decision level: ${approvalRequest?.decisionLevel}`);
    }
    if (!Object.values(APPROVAL_STATUSES).includes(approvalRequest?.status)) {
        throw new Error(`Unsupported approval status: ${approvalRequest?.status}`);
    }
    if (typeof approvalRequest?.requestedBy !== 'string' || !approvalRequest.requestedBy.trim()) {
        throw new Error('Approval request requires requestedBy');
    }
    return approvalRequest;
}

export function createAgentRecord(agentConfig, missionConfig) {
    return {
        id: agentConfig.id,
        missionId: missionConfig.id,
        role: missionConfig.role,
        writable: Boolean(agentConfig.writable),
        allowedActions: Array.isArray(agentConfig.allowedActions) ? [...agentConfig.allowedActions] : [],
        registeredAt: new Date().toISOString()
    };
}

