/**
 * ReAct Loop - Reason, Act, Observe cycle for autonomous task execution
 */
import type { Task, TaskState, StepRecord } from '../types/index.js';
import { ToolRegistry } from '../tools/registry.js';
interface ReActConfig {
    maxIterations: number;
    onHumanIntervention?: (state: TaskState) => Promise<void>;
    onStepComplete?: (record: StepRecord) => void;
}
interface ActionHandler {
    (state: TaskState): Promise<{
        next: string;
        data?: unknown;
        adjustment?: string;
        reason?: Error;
    }>;
}
export declare class ReActLoop {
    private config;
    private registry;
    private actions;
    constructor(config: ReActConfig, registry?: ToolRegistry);
    registerAction(step: string, handler: ActionHandler): void;
    run(task: Task, options: {
        states: string[];
        initialState: string;
        completionCheck: (state: TaskState) => boolean;
    }): Promise<TaskState>;
    private reason;
    private act;
    private observe;
    private buildContext;
    private needsHumanIntervention;
}
export declare class MaxIterationsExceededError extends Error {
    state: TaskState;
    constructor(state: TaskState);
}
export {};
//# sourceMappingURL=react-loop.d.ts.map