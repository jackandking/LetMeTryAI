/**
 * Tool Registry - Unified tool management with retry, metrics, and schema validation
 */
import type { Tool, ToolResult } from '../types/index.js';
interface MetricsCollector {
    record(metric: {
        tool: string;
        duration: number;
        retries: number;
        success: boolean;
        error?: Error;
    }): void;
}
export declare class ToolRegistry {
    private tools;
    private metrics;
    constructor(metrics?: MetricsCollector);
    register(tool: Tool): void;
    get(name: string): Tool | undefined;
    execute(name: string, args: unknown): Promise<ToolResult>;
    private runWithTimeout;
    private backoff;
    listTools(): string[];
}
export declare function getToolRegistry(): ToolRegistry;
export declare function resetToolRegistry(): void;
export {};
//# sourceMappingURL=registry.d.ts.map