/**
 * ReAct Loop - Reason, Act, Observe cycle for autonomous task execution
 */
import type { 
  Task, 
  TaskState, 
  Plan, 
  Observation, 
  StepRecord,
  Tool 
} from '../types/index.js';
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

export class ReActLoop {
  private config: ReActConfig;
  private registry: ToolRegistry;
  private actions: Map<string, ActionHandler> = new Map();

  constructor(config: ReActConfig, registry?: ToolRegistry) {
    this.config = { maxIterations: 10, ...config };
    this.registry = registry || new ToolRegistry();
  }

  registerAction(step: string, handler: ActionHandler): void {
    this.actions.set(step, handler);
  }

  async run(
    task: Task,
    options: {
      states: string[];
      initialState: string;
      completionCheck: (state: TaskState) => boolean;
    }
  ): Promise<TaskState> {
    const state: TaskState = {
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
      const record: StepRecord = {
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
        const actionResult = result as { next?: string; data?: unknown };
        if (actionResult.next) {
          state.currentStep = actionResult.next;
        }
        if (actionResult.data) {
          state.data = { ...state.data, ...actionResult.data };
        }
      } else {
        // Handle failure - retry or adjust
        console.log(`[ReAct] Step failed: ${observation.error?.message}`);
        // Stay in current state for retry
      }
    }

    throw new MaxIterationsExceededError(state);
  }

  private async reason(state: TaskState): Promise<Plan> {
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

  private async act(plan: Plan, state: TaskState): Promise<unknown> {
    const handler = this.actions.get(plan.action);
    if (!handler) {
      throw new Error(`No handler for action: ${plan.action}`);
    }

    return handler(state);
  }

  private async observe(result: unknown, plan: Plan): Promise<Observation> {
    // Check if result indicates success or failure
    if (result && typeof result === 'object') {
      const obj = result as { success?: boolean; error?: Error; data?: unknown };
      
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

  private buildContext(state: TaskState): Record<string, unknown> {
    return {
      iteration: state.iteration,
      currentStep: state.currentStep,
      data: state.data,
      recentHistory: state.history.slice(-3), // Last 3 steps
    };
  }

  private needsHumanIntervention(observation: Observation): boolean {
    // Require human intervention if:
    // 1. Critical error
    // 2. Multiple consecutive failures
    // 3. Unclear next steps
    if (!observation.success) {
      const errorMsg = observation.error?.message || '';
      return (
        errorMsg.includes('ConstraintViolationError') ||
        errorMsg.includes('Human intervention')
      );
    }
    return false;
  }
}

export class MaxIterationsExceededError extends Error {
  constructor(public state: TaskState) {
    super(`Max iterations (${state.iteration}) exceeded for task ${state.task.id}`);
    this.name = 'MaxIterationsExceededError';
  }
}
