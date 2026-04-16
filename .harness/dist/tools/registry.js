class DefaultMetricsCollector {
    metrics = new Map();
    record(metric) {
        const existing = this.metrics.get(metric.tool) || [];
        existing.push(metric);
        this.metrics.set(metric.tool, existing);
        // Log to console for now
        console.log(`[Tool:${metric.tool}] duration=${metric.duration}ms retries=${metric.retries} success=${metric.success}`);
    }
    getMetrics(toolName) {
        return this.metrics.get(toolName) || [];
    }
}
export class ToolRegistry {
    tools = new Map();
    metrics;
    constructor(metrics) {
        this.metrics = metrics || new DefaultMetricsCollector();
    }
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    get(name) {
        return this.tools.get(name);
    }
    async execute(name, args) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Unknown tool: ${name}`);
        }
        const startTime = Date.now();
        let retries = 0;
        const maxRetries = tool.retryPolicy?.maxRetries || 0;
        while (retries <= maxRetries) {
            try {
                const toolResult = await this.runWithTimeout(tool, args);
                const duration = Date.now() - startTime;
                this.metrics.record({
                    tool: name,
                    duration,
                    retries,
                    success: toolResult.success,
                });
                // Extract actual data from tool result
                if (toolResult.success) {
                    return {
                        success: true,
                        data: toolResult.data,
                        metadata: {
                            duration,
                            retries,
                            ...(toolResult.metadata || {}),
                        },
                    };
                }
                else {
                    throw toolResult.error || new Error('Tool execution failed');
                }
            }
            catch (error) {
                retries++;
                if (retries > maxRetries) {
                    const duration = Date.now() - startTime;
                    this.metrics.record({
                        tool: name,
                        duration,
                        retries: retries - 1,
                        success: false,
                        error: error,
                    });
                    return {
                        success: false,
                        error: error,
                        metadata: { duration, retries: retries - 1 },
                    };
                }
                // Wait before retry
                await this.backoff(retries, tool.retryPolicy);
            }
        }
        // This should never be reached
        throw new Error('Unexpected end of retry loop');
    }
    async runWithTimeout(tool, args) {
        const timeout = tool.timeout || 30000;
        return Promise.race([
            tool.execute(args),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Tool ${tool.name} timeout after ${timeout}ms`)), timeout)),
        ]);
    }
    async backoff(attempt, policy) {
        const initialDelay = policy?.initialDelay || 1000;
        const maxDelay = policy?.maxDelay || 30000;
        const backoff = policy?.backoff || 'exponential';
        let delay;
        switch (backoff) {
            case 'fixed':
                delay = initialDelay;
                break;
            case 'linear':
                delay = initialDelay * attempt;
                break;
            case 'exponential':
            default:
                delay = initialDelay * Math.pow(2, attempt - 1);
                break;
        }
        delay = Math.min(delay, maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    listTools() {
        return Array.from(this.tools.keys());
    }
}
// Singleton instance
let globalRegistry = null;
export function getToolRegistry() {
    if (!globalRegistry) {
        globalRegistry = new ToolRegistry();
    }
    return globalRegistry;
}
export function resetToolRegistry() {
    globalRegistry = null;
}
//# sourceMappingURL=registry.js.map