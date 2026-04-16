import { ToolRegistry } from '../tools/registry.js';
export class ReActLoop {
    config;
    registry;
    actions = new Map();
    constructor(config, registry) {
        this.config = { maxIterations: 10, ...config };
        this.registry = registry || new ToolRegistry();
    }
    registerAction(step, handler) {
        this.actions.set(step, handler);
    }
    async run(task, options) {
        const state = {
            task,
            iteration: 0,
            history: [],
            currentStep: options.initialState,
            data: {},
        };
        console.log(`[ReAct] Starting task ${task.id} with max ${this.config.maxIterations} iterations`);
        while (state.iteration < this.config.maxIterations) {
            state.iteration++;
            console.log(`[ReAct] Iteration ${state.iteration}, current step: ${state.currentStep}`);
            // Check completion BEFORE reasoning
            if (options.completionCheck(state)) {
                console.log(`[ReAct] Task ${task.id} completed successfully`);
                return state;
            }
            // REASON: Determine next action based on current state
            const plan = await this.reason(state);
            // ACT: Execute the action
            const result = await this.act(plan, state);
            // OBSERVE: Evaluate the result
            const observation = await this.observe(result, plan);
            // Record the step
            const record = {
                step: state.currentStep || 'unknown',
                plan,
                result,
                observation,
                timestamp: new Date(),
            };
            state.history.push(record);
            if (this.config.onStepComplete) {
                this.config.onStepComplete(record);
            }
            // Check completion
            if (options.completionCheck(state)) {
                console.log(`[ReAct] Task ${task.id} completed successfully`);
                return state;
            }
            // Check for human intervention
            if (this.needsHumanIntervention(observation)) {
                console.log(`[ReAct] Task ${task.id} requires human intervention`);
                if (this.config.onHumanIntervention) {
                    await this.config.onHumanIntervention(state);
                }
                throw new Error('Human intervention required');
            }
            // Update state for next iteration
            if (observation.success) {
                // Move to next state or stay based on action result
                const actionResult = result;
                if (actionResult.next) {
                    state.currentStep = actionResult.next;
                }
                if (actionResult.data) {
                    state.data = { ...state.data, ...actionResult.data };
                }
            }
            else {
                // Handle failure - retry or adjust
                console.log(`[ReAct] Step failed: ${observation.error?.message}`);
                // Stay in current state for retry
            }
        }
        throw new MaxIterationsExceededError(state);
    }
    async reason(state) {
        const handler = this.actions.get(state.currentStep || '');
        if (!handler) {
            throw new Error(`No handler registered for step: ${state.currentStep}`);
        }
        // Build context from history
        const context = this.buildContext(state);
        return {
            action: state.currentStep || 'unknown',
            params: { context, data: state.data },
            expectedOutcome: `Execute ${state.currentStep} step`,
        };
    }
    async act(plan, state) {
        const handler = this.actions.get(plan.action);
        if (!handler) {
            throw new Error(`No handler for action: ${plan.action}`);
        }
        return handler(state);
    }
    async observe(result, plan) {
        // Check if result indicates success or failure
        if (result && typeof result === 'object') {
            const obj = result;
            if (obj.success === false) {
                return {
                    success: false,
                    error: obj.error || new Error('Action failed'),
                    data: obj.data,
                };
            }
            return {
                success: true,
                data: obj.data || result,
            };
        }
        // Default: assume success
        return {
            success: true,
            data: result,
        };
    }
    buildContext(state) {
        return {
            iteration: state.iteration,
            currentStep: state.currentStep,
            data: state.data,
            recentHistory: state.history.slice(-3), // Last 3 steps
        };
    }
    needsHumanIntervention(observation) {
        // Require human intervention if:
        // 1. Critical error
        // 2. Multiple consecutive failures
        // 3. Unclear next steps
        if (!observation.success) {
            const errorMsg = observation.error?.message || '';
            return (errorMsg.includes('ConstraintViolationError') ||
                errorMsg.includes('Human intervention'));
        }
        return false;
    }
}
export class MaxIterationsExceededError extends Error {
    state;
    constructor(state) {
        super(`Max iterations (${state.iteration}) exceeded for task ${state.task.id}`);
        this.state = state;
        this.name = 'MaxIterationsExceededError';
    }
}
//# sourceMappingURL=react-loop.js.map