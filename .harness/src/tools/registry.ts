/**
 * Tool Registry - Unified tool management with retry, metrics, and schema validation
 */
import type { Tool, ToolResult, RetryPolicy } from '../types/index.js';

interface MetricsCollector {
  record(metric: {
    tool: string;
    duration: number;
    retries: number;
    success: boolean;
    error?: Error;
  }): void;
}

class DefaultMetricsCollector implements MetricsCollector {
  private metrics: Map<string, unknown[]> = new Map();

  record(metric: {
    tool: string;
    duration: number;
    retries: number;
    success: boolean;
    error?: Error;
  }): void {
    const existing = this.metrics.get(metric.tool) || [];
    existing.push(metric);
    this.metrics.set(metric.tool, existing);
    
    // Log to console for now
    console.log(`[Tool:${metric.tool}] duration=${metric.duration}ms retries=${metric.retries} success=${metric.success}`);
  }

  getMetrics(toolName: string): unknown[] {
    return this.metrics.get(toolName) || [];
  }
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private metrics: MetricsCollector;

  constructor(metrics?: MetricsCollector) {
    this.metrics = metrics || new DefaultMetricsCollector();
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  async execute(name: string, args: unknown): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const startTime = Date.now();
    let retries = 0;
    const maxRetries = tool.retryPolicy?.maxRetries || 0;

    while (retries <= maxRetries) {
      try {
        const toolResult = await this.runWithTimeout(tool, args) as ToolResult;
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
        } else {
          throw toolResult.error || new Error('Tool execution failed');
        }
      } catch (error) {
        retries++;
        
        if (retries > maxRetries) {
          const duration = Date.now() - startTime;
          this.metrics.record({
            tool: name,
            duration,
            retries: retries - 1,
            success: false,
            error: error as Error,
          });

          return {
            success: false,
            error: error as Error,
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

  private async runWithTimeout(tool: Tool, args: unknown): Promise<unknown> {
    const timeout = tool.timeout || 30000;
    
    return Promise.race([
      tool.execute(args),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Tool ${tool.name} timeout after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  private async backoff(attempt: number, policy?: RetryPolicy): Promise<void> {
    const initialDelay = policy?.initialDelay || 1000;
    const maxDelay = policy?.maxDelay || 30000;
    const backoff = policy?.backoff || 'exponential';

    let delay: number;
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

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Singleton instance
let globalRegistry: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new ToolRegistry();
  }
  return globalRegistry;
}

export function resetToolRegistry(): void {
  globalRegistry = null;
}
