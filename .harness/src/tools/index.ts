/**
 * Tool Registry Setup - Register all available tools
 */
import { ToolRegistry } from './registry.js';
import { copilotTool } from './copilot.js';
import { kimiTool } from './kimi.js';
import { aiGenerateTool } from './ai-generate.js';
import { videoGenerateTool, videoPublishTool, videoWorkflowTool } from './video.js';

export * from './registry.js';
export * from './copilot.js';
export * from './kimi.js';
export * from './ai-generate.js';
export * from './video.js';

/**
 * Create and configure a ToolRegistry with all available tools
 */
export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  // Register AI generation tools
  registry.register(aiGenerateTool);  // Unified interface with fallback
  registry.register(copilotTool);     // Direct Copilot access
  registry.register(kimiTool);        // Direct Kimi access

  // Register video tools
  registry.register(videoGenerateTool);
  registry.register(videoPublishTool);
  registry.register(videoWorkflowTool);

  return registry;
}

// Export singleton instance
export const defaultRegistry = createToolRegistry();
