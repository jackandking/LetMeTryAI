/**
 * AI Generate Tool - Unified interface with automatic fallback
 * Primary: Copilot → Fallback: Kimi
 */
import { Tool } from '../types/index.js';
export declare const aiGenerateTool: Tool;
/**
 * Quick health check for all providers
 */
export declare function checkAIProviders(): Promise<Record<string, boolean>>;
//# sourceMappingURL=ai-generate.d.ts.map