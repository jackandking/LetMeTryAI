import { classifyDecision } from './decision-policy.js';

describe('agent-team decision policy', () => {
    it('routes external publish actions to boss approval', () => {
        const result = classifyDecision({
            action: 'publish',
            tags: ['external']
        });

        expect(result.decisionLevel).toBe('boss');
    });

    it('routes writable repo edits to manager approval', () => {
        const result = classifyDecision({
            action: 'edit-repo',
            writable: true
        });

        expect(result.decisionLevel).toBe('manager');
    });

    it('allows reversible read-only actions to proceed', () => {
        const result = classifyDecision({
            action: 'analyze-context',
            writable: false,
            sideEffect: false
        });

        expect(result.decisionLevel).toBe('none');
    });

    it('allows parent-revenue to route publish through manager approval', () => {
        const result = classifyDecision(
            { action: 'publish' },
            undefined,
            { demoteBossApprovalActions: ['publish'] }
        );

        expect(result.decisionLevel).toBe('manager');
    });
});
