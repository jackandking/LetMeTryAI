/**
 * Core types for Harness Engineering
 */
export interface Task {
    id: string;
    type: 'daily_app_creation' | 'kuaishou_report';
    profileId: string;
    status: TaskStatus;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
}
export type TaskStatus = 'idle' | 'planning' | 'executing' | 'verifying' | 'done' | 'failed' | 'awaiting_human';
export interface TaskState {
    task: Task;
    iteration: number;
    history: StepRecord[];
    currentStep: string | null;
    data: Record<string, unknown>;
}
export interface StepRecord {
    step: string;
    plan: Plan;
    result: unknown;
    observation: Observation;
    timestamp: Date;
}
export interface Plan {
    action: string;
    params: Record<string, unknown>;
    expectedOutcome: string;
}
export interface Observation {
    success: boolean;
    data?: unknown;
    error?: Error;
    metrics?: {
        duration: number;
        tokens?: number;
    };
}
export interface Tool {
    name: string;
    description: string;
    schema: ToolSchema;
    execute: (args: unknown) => Promise<ToolResult>;
    retryPolicy?: RetryPolicy;
    timeout?: number;
}
export interface ToolSchema {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
}
export interface ToolResult {
    success: boolean;
    data?: unknown;
    error?: Error;
    metadata: {
        duration: number;
        tokens?: number;
        retries: number;
    };
}
export interface RetryPolicy {
    maxRetries: number;
    backoff: 'fixed' | 'exponential' | 'linear';
    initialDelay?: number;
    maxDelay?: number;
}
export interface Constraint {
    name: string;
    check: (topic: TopicCandidate) => Promise<ConstraintResult>;
}
export interface ConstraintResult {
    passed: boolean;
    message?: string;
    severity: 'error' | 'warning';
}
export interface TopicCandidate {
    appId: string;
    title: string;
    pageTitle: string;
    appName: string;
    summary: string;
    description: string;
    question: string;
    category: string;
    keywords: string[];
    options: TopicOption[];
}
export interface TopicOption {
    label: string;
    value: string;
    caption: string;
    alt: string;
    image: string;
}
export interface ProfileConfig {
    id: string;
    name: string;
    preferredCategories: string[];
    topicGuidelines: {
        doMore: string[];
        avoid: string[];
    };
    constraints: ProfileConstraints;
}
export interface ProfileConstraints {
    categoryRotation?: Record<string, CategoryConstraint>;
    forbiddenKeywords?: string[];
    budget?: BudgetConstraint;
}
export interface CategoryConstraint {
    maxPerWeek: number;
    cooldownDays: number;
}
export interface BudgetConstraint {
    maxCopilotCalls: number;
    maxTokensPerRun: number;
}
export type HarnessMode = 'shadow' | 'canary' | 'production' | 'legacy';
export interface HarnessConfig {
    mode: HarnessMode;
    shadowMode: {
        compareWithLegacy: boolean;
        logDifferences: boolean;
        alertThreshold: number;
    };
    canaryProfiles: string[];
}
//# sourceMappingURL=index.d.ts.map