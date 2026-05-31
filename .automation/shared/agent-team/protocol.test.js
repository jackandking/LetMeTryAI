import { createApprovalRequest, createEnvelope, DECISION_LEVELS } from './protocol.js';

describe('agent-team protocol', () => {
    it('creates a normalized envelope', () => {
        const envelope = createEnvelope({
            type: 'task.start',
            from: 'manager',
            to: 'scout',
            scopePaths: ['parent-tools/child-travel-map', 'parent-tools/child-travel-map'],
            payload: { title: 'build task' }
        });

        expect(envelope.id).toMatch(/^msg-/);
        expect(envelope.scopePaths).toEqual(['parent-tools/child-travel-map']);
    });

    it('creates a boss approval artifact for boss-gated actions', () => {
        const approval = createApprovalRequest(
            createEnvelope({
                type: 'decision.request',
                from: 'builder',
                to: 'manager',
                requiresDecision: DECISION_LEVELS.BOSS,
                payload: { action: 'publish' }
            }),
            {
                decisionLevel: DECISION_LEVELS.BOSS,
                reason: 'Publish requires boss approval'
            }
        );

        expect(approval.decisionLevel).toBe('boss');
        expect(approval.status).toBe('pending');
    });
});

