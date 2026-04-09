/**
 * Copilot CLI Tool - Integration with GitHub Copilot
 */
import { spawn } from 'child_process';
import { Tool } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface CopilotArgs {
  prompt: string;
  model?: string;
  outputFormat?: 'json' | 'text';
}

export const copilotTool: Tool = {
  name: 'copilot.generate',
  description: 'Generate content using GitHub Copilot CLI',
  schema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'The prompt to send to Copilot' },
      model: { type: 'string', default: 'gpt-5-mini', description: 'Model to use' },
      outputFormat: { type: 'string', enum: ['json', 'text'], default: 'text' },
    },
    required: ['prompt'],
  },
  retryPolicy: {
    maxRetries: 2,
    backoff: 'exponential',
    initialDelay: 2000,
  },
  timeout: 300000, // 5 minutes

  async execute(args: unknown): Promise<unknown> {
    const { prompt, model = 'gpt-5-mini', outputFormat = 'text' } = args as CopilotArgs;
    
    logger.info('Calling Copilot CLI', { model, outputFormat, promptLength: prompt.length });

    const copilotBin = process.env.COPILOT_BIN || 'copilot';
    const copilotArgs = [
      '--model', model,
      '--allow-all-tools',
      '--output-format', outputFormat === 'json' ? 'json' : 'text',
      '--yolo',
      '-p', prompt,
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(copilotBin, copilotArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          logger.error('Copilot CLI failed', new Error(stderr || 'Unknown error'), { code });
          reject(new Error(`Copilot exited with code ${code}: ${stderr}`));
          return;
        }

        // Try to parse JSON if requested
        if (outputFormat === 'json') {
          try {
            // Copilot outputs JSON event stream, extract the last assistant message
            const result = parseCopilotOutput(stdout);
            logger.info('Copilot response parsed', { resultType: typeof result });
            resolve(result);
          } catch (error) {
            logger.error('Failed to parse Copilot output', error as Error);
            reject(error);
          }
        } else {
          resolve(stdout.trim());
        }
      });

      child.on('error', (error) => {
        logger.error('Failed to spawn Copilot', error);
        reject(error);
      });
    });
  },
};

/**
 * Parse Copilot JSON event stream output
 */
function parseCopilotOutput(output: string): unknown {
  const lines = output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const events = lines
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // Find the last assistant message
  const assistantMessage = [...events]
    .reverse()
    .find(event => event.type === 'assistant.message' && typeof event.data?.content === 'string');

  if (assistantMessage?.data?.content) {
    const content = assistantMessage.data.content;
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || 
                      content.match(/```\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try to parse the content directly as JSON
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }

  // Fallback: return the raw output
  return output;
}

/**
 * Check if Copilot CLI is available
 */
export async function isCopilotAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('copilot', ['--version'], { stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}
