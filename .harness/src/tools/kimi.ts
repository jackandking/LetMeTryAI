/**
 * Kimi CLI Tool - Fallback when Copilot times out
 * Uses Kimi Code CLI instead of API (no API key needed)
 */
import { spawn } from 'child_process';
import { Tool, ToolResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface KimiArgs {
  prompt: string;
  model?: string;
  outputFormat?: 'json' | 'text';
  temperature?: number;
}

export const kimiTool: Tool = {
  name: 'kimi.generate',
  description: 'Generate content using Kimi Code CLI',
  schema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'The prompt to send to Kimi' },
      model: { type: 'string', default: 'kimi-for-coding', description: 'Model to use' },
      outputFormat: { type: 'string', enum: ['json', 'text'], default: 'text' },
      temperature: { type: 'number', default: 0.7, description: 'Temperature (0-1)' },
    },
    required: ['prompt'],
  },
  retryPolicy: {
    maxRetries: 1,
    backoff: 'exponential',
    initialDelay: 1000,
  },
  timeout: 180000, // 3 minutes

  async execute(args: unknown): Promise<ToolResult> {
    const startTime = Date.now();
    const { prompt, outputFormat = 'text' } = args as KimiArgs;

    logger.info('Calling Kimi CLI', { outputFormat, promptLength: prompt.length });

    // Add JSON instruction if needed
    let finalPrompt = prompt;
    if (outputFormat === 'json') {
      finalPrompt = `${prompt}\n\n重要：只返回纯 JSON 格式，不要 markdown 代码块，不要其他文字。`;
    }

    const kimiBin = process.env.KIMI_BIN || 'kimi';
    const kimiArgs = [
      '-p', finalPrompt,
      '--print',
      '--final-message-only',
      '--yolo',
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(kimiBin, kimiArgs, {
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
          logger.error('Kimi CLI failed', new Error(stderr || 'Unknown error'), { code });
          reject(new Error(`Kimi exited with code ${code}: ${stderr}`));
          return;
        }

        const content = stdout.trim();
        logger.info('Kimi CLI response received', { 
          contentLength: content.length,
          duration: Date.now() - startTime,
        });

        // Parse JSON if requested
        let result: unknown = content;
        if (outputFormat === 'json') {
          try {
            // Try to extract JSON from markdown code blocks first
            const codeBlockMatch = content.match(/```json\s*([\s\S]*?)```/) || 
                                   content.match(/```\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
              result = JSON.parse(codeBlockMatch[1].trim());
            } else {
              // Try to extract JSON object/array from mixed content
              const jsonMatch = content.match(/\{[\s\S]*\}/) || 
                               content.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                result = JSON.parse(jsonMatch[0].trim());
              } else {
                // Try direct JSON parse
                result = JSON.parse(content);
              }
            }
          } catch (parseError) {
            logger.warn('Failed to parse Kimi JSON response, returning raw', { 
              content: content.slice(0, 200),
            });
          }
        }

        resolve({
          success: true,
          data: result,
          metadata: {
            duration: Date.now() - startTime,
            retries: 0,
          },
        });
      });

      child.on('error', (error) => {
        logger.error('Failed to spawn Kimi', error);
        reject(error);
      });
    });
  },
};

/**
 * Check if Kimi CLI is available
 */
export async function isKimiAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('kimi', ['--version'], { stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}
