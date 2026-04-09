/**
 * LetMeTryAI Harness - Main exports
 */

// Types
export * from './types/index.js';

// Config
export { 
  getHarnessMode, 
  loadHarnessConfig, 
  loadProfileConfig,
  ensureDirectories,
  PATHS 
} from './config/index.js';

// Tools
export { ToolRegistry, getToolRegistry } from './tools/registry.js';
export { copilotTool, isCopilotAvailable } from './tools/copilot.js';
export { 
  gitAddTool, 
  gitCommitTool, 
  gitPushTool, 
  gitStatusTool,
  gitPullTool,
  gitGetCurrentBranchTool,
} from './tools/git.js';
export { 
  writeFileTool, 
  copyFileTool, 
  ensureDirTool,
  readTemplateTool,
} from './tools/files.js';

// Constraints
export { ConstraintsEngine, ConstraintViolationError } from './constraints/engine.js';

// Workflows
export { ReActLoop, MaxIterationsExceededError } from './workflows/react-loop.js';

// Agents
export { DailyAppAgent } from './agents/daily-app-agent.js';

// Scheduler
export { HarnessScheduler } from './scheduler.js';

// Services
export { generateScaffold } from './services/scaffold.js';
export { 
  buildTopicSelectionPrompt,
  parseTopicSelectionResponse,
  chooseBestTopic,
} from './services/topic-selector.js';

// Utils
export { Logger, logger } from './utils/logger.js';
