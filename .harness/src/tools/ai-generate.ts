/**
 * AI Generate Tool - Unified interface with automatic fallback
 * Primary: Copilot → Fallback: Kimi
 */
import { Tool, ToolResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { copilotTool } from './copilot.js';
import { kimiTool } from './kimi.js';

interface AIGenerateArgs {
  prompt: string;
  model?: string;
  outputFormat?: 'json' | 'text';
  temperature?: number;
  timeout?: number;
  fallbackOnTimeout?: boolean;
}

interface ProviderConfig {
  name: 'copilot' | 'kimi';
  tool: Tool;
  timeout: number;
  priority: number;
}

// Provider configurations
const PROVIDERS: ProviderConfig[] = [
  {
    name: 'copilot',
    tool: copilotTool,
    timeout: Number(process.env.COPILOT_TIMEOUT_MS) || 300000, // 5 minutes (or env override)
    priority: 1,
  },
  {
    name: 'kimi',
    tool: kimiTool,
    timeout: 120000, // 2 minutes
    priority: 2,
  },
];

export const aiGenerateTool: Tool = {
  name: 'ai.generate',
  description: 'Generate content using AI with automatic fallback (Copilot → Kimi)',
  schema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'The prompt to send to AI' },
      model: { type: 'string', description: 'Model to use (provider-specific)' },
      outputFormat: { type: 'string', enum: ['json', 'text'], default: 'text' },
      temperature: { type: 'number', default: 0.7 },
      timeout: { type: 'number', description: 'Override default timeout (ms)' },
      fallbackOnTimeout: { type: 'boolean', default: true, description: 'Enable fallback on timeout' },
    },
    required: ['prompt'],
  },
  retryPolicy: {
    maxRetries: 2,
    backoff: 'exponential',
    initialDelay: 1000,
  },
  timeout: 420000, // 7 minutes total (copilot + kimi)

  async execute(args: unknown): Promise<ToolResult> {
    const startTime = Date.now();
    const { 
      prompt, 
      model, 
      outputFormat = 'text', 
      temperature,
      fallbackOnTimeout = true,
    } = args as AIGenerateArgs;

    logger.info('AI Generate starting', { 
      outputFormat, 
      promptLength: prompt.length,
      fallbackEnabled: fallbackOnTimeout,
    });

    const errors: Array<{ provider: string; error: Error; timedOut?: boolean }> = [];

    // Try each provider in priority order
    for (const provider of PROVIDERS.sort((a, b) => a.priority - b.priority)) {
      const providerStartTime = Date.now();
      
      logger.info(`Trying provider: ${provider.name}`);

      try {
        const result = await executeWithTimeout(
          provider.tool,
          {
            prompt,
            model: model || getDefaultModel(provider.name),
            outputFormat,
            ...(temperature && { temperature }),
          },
          provider.timeout
        );

        if (result.success) {
          const duration = Date.now() - startTime;
          logger.info(`AI Generate succeeded with ${provider.name}`, {
            duration,
            provider: provider.name,
          });

          // Extract actual data from provider result
          // Provider returns { success, data: actualContent, metadata }
          const actualData = (result.data && typeof result.data === 'object') 
            ? result.data 
            : { content: result.data };

          return {
            success: true,
            data: {
              ...actualData,
              _meta: {
                provider: provider.name,
                duration,
                fallbackUsed: provider.priority > 1,
              },
            },
            metadata: {
              duration,
              tokens: result.metadata?.tokens,
              retries: errors.length,
            },
          };
        } else {
          const error = result.error || new Error(`${provider.name} returned failure`);
          logger.warn(`${provider.name} execution failed`, { error: error.message });
          errors.push({ provider: provider.name, error });
        }
      } catch (error) {
        const isTimeout = error instanceof TimeoutError;
        const err = error as Error;
        
        logger.warn(`${provider.name} ${isTimeout ? 'timed out' : 'failed'}`, {
          error: err.message,
          duration: Date.now() - providerStartTime,
        });

        errors.push({ 
          provider: provider.name, 
          error: err,
          timedOut: isTimeout,
        });

        // If not a timeout or fallback disabled, don't try next provider
        if (!isTimeout && !fallbackOnTimeout) {
          logger.info('Not a timeout error, skipping fallback');
          break;
        }

        // Continue to next provider
        if (fallbackOnTimeout) {
          logger.info(`Falling back to next provider...`);
          continue;
        }
      }
    }

    // All providers failed
    const duration = Date.now() - startTime;
    const errorMessages = errors.map(e => `${e.provider}: ${e.error.message}`).join('; ');
    const finalError = new Error(`All AI providers failed: ${errorMessages}`);

    logger.error('AI Generate failed - all providers exhausted', finalError, {
      duration,
      providers: errors.map(e => e.provider),
    });

    return {
      success: false,
      error: finalError,
      metadata: {
        duration,
        retries: errors.length,
      },
    };
  },
};

/**
 * Execute a tool with timeout
 */
async function executeWithTimeout(
  tool: Tool,
  args: unknown,
  timeoutMs: number
): Promise<ToolResult> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`Tool ${tool.name} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    tool.execute(args)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Get default model for provider
 */
function getDefaultModel(provider: 'copilot' | 'kimi'): string {
  switch (provider) {
    case 'copilot':
      return 'gpt-5-mini';
    case 'kimi':
      return 'kimi-k2-0711-preview';
    default:
      return 'gpt-5-mini';
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Quick health check for all providers
 */
export async function checkAIProviders(): Promise<Record<string, boolean>> {
  const { isCopilotAvailable } = await import('./copilot.js');
  const { isKimiAvailable } = await import('./kimi.js');

  const [copilot, kimi] = await Promise.all([
    isCopilotAvailable(),
    isKimiAvailable(),
  ]);

  return {
    copilot,
    kimi,
    any: copilot || kimi,
  };
}
