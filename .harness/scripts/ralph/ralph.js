#!/usr/bin/env node

/**
 * Ralph - Autonomous AI Coding Loop (Node.js Version)
 * Usage: node ralph.js [max_iterations]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRD_FILE = join(__dirname, 'prd.json');
const PROGRESS_FILE = join(__dirname, 'progress.txt');

// Colors
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const NC = '\x1b[0m';

const log = (msg) => console.log(`${GREEN}[RALPH]${NC} ${msg}`);
const warn = (msg) => console.log(`${YELLOW}[WARN]${NC} ${msg}`);
const error = (msg) => console.log(`${RED}[ERROR]${NC} ${msg}`);

// Load PRD
function loadPRD() {
  if (!existsSync(PRD_FILE)) {
    error(`prd.json not found at ${PRD_FILE}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(PRD_FILE, 'utf-8'));
}

// Save PRD
function savePRD(prd) {
  writeFileSync(PRD_FILE, JSON.stringify(prd, null, 2));
}

// Get next uncompleted story
function getNextStory(prd) {
  return prd.stories
    .filter(s => !s.passes)
    .filter(s => {
      // Check dependencies
      if (!s.dependsOn) return true;
      return s.dependsOn.every(depId => {
        const dep = prd.stories.find(st => st.id === depId);
        return dep && dep.passes;
      });
    })
    .sort((a, b) => a.priority - b.priority)[0];
}

// Count remaining
function countRemaining(prd) {
  return prd.stories.filter(s => !s.passes).length;
}

// Mark story complete
function markStoryComplete(prd, storyId) {
  const story = prd.stories.find(s => s.id === storyId);
  if (story) {
    story.passes = true;
    savePRD(prd);
    log(`Marked story ${storyId} as complete`);
  }
}

// Log progress
function logProgress(message) {
  const timestamp = new Date().toISOString();
  const entry = `${timestamp} - ${message}\n`;
  writeFileSync(PROGRESS_FILE, entry, { flag: 'a' });
}

// Show status
function showStatus(prd) {
  const total = prd.stories.length;
  const remaining = countRemaining(prd);
  const completed = total - remaining;
  
  console.log('\n=== Ralph Status ===');
  console.log(`Feature: ${prd.title}`);
  console.log(`Branch: ${prd.branchName}`);
  console.log(`Progress: ${completed}/${total} stories complete`);
  console.log(`Remaining: ${remaining}`);
  console.log('');
  
  // Show next story
  const next = getNextStory(prd);
  if (next) {
    console.log('Next story:');
    console.log(`  ID: ${next.id}`);
    console.log(`  Title: ${next.title}`);
    console.log(`  Priority: ${next.priority}`);
    if (next.dependsOn) {
      console.log(`  Depends on: ${next.dependsOn.join(', ')}`);
    }
  } else if (remaining === 0) {
    console.log('✅ All stories complete!');
  } else {
    console.log('⚠️ Some stories are blocked by dependencies');
  }
  console.log('');
  
  // Show all stories
  console.log('All stories:');
  prd.stories.forEach(s => {
    const status = s.passes ? '✅' : '⬜';
    console.log(`  ${status} [P${s.priority}] ${s.id}: ${s.title}`);
  });
}

// Generate prompt for current story
function generatePrompt(prd, story) {
  return `# Ralph Task: ${story.title}

## Current Story
ID: ${story.id}
Title: ${story.title}
Description: ${story.description}

## Acceptance Criteria
${story.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}

## Context
- Feature: ${prd.title}
- Branch: ${prd.branchName}
- Read progress.txt for codebase patterns
- Run typecheck: cd /Users/weiping/LetMeTryAI/.harness && npx tsc --noEmit
- Run tests: npm test (if available)

## Existing Code References
${prd.metadata?.existingCode?.map(f => `- ${f}`).join('\n') || 'None'}

## Instructions
1. Implement this single story completely
2. Create/modify files as needed
3. Run quality checks (typecheck, tests)
4. If checks pass, commit changes: git commit -m "feat: ${story.title}"
5. Update progress.txt with learnings
6. Run: node ralph.js complete ${story.id}

## Quality Gates (MUST PASS)
- TypeScript compiles without errors
- All tests pass
- Code follows existing patterns
`;
}

// Main
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  const prd = loadPRD();
  
  if (command === 'status') {
    showStatus(prd);
    return;
  }
  
  if (command === 'complete') {
    const storyId = args[1];
    if (!storyId) {
      error('Usage: node ralph.js complete <story-id>');
      process.exit(1);
    }
    markStoryComplete(prd, storyId);
    logProgress(`Completed story: ${storyId}`);
    showStatus(loadPRD()); // Reload to show updated status
    return;
  }
  
  if (command === 'next') {
    const story = getNextStory(prd);
    if (!story) {
      if (countRemaining(prd) === 0) {
        log('✅ All stories complete!');
      } else {
        warn('No ready stories - check dependencies');
      }
      return;
    }
    
    const prompt = generatePrompt(prd, story);
    const promptFile = join(__dirname, '.current_prompt.md');
    writeFileSync(promptFile, prompt);
    
    console.log('\n=== Next Story ===');
    console.log(`ID: ${story.id}`);
    console.log(`Title: ${story.title}`);
    console.log(`Priority: ${story.priority}`);
    console.log(`Estimated: ${story.estimatedHours}h`);
    console.log('');
    console.log(`Prompt saved to: ${promptFile}`);
    console.log('');
    console.log('Copy the prompt above and give it to your AI coding assistant.');
    console.log('After completion, run: node ralph.js complete ' + story.id);
    return;
  }
  
  if (command === 'run') {
    const maxIterations = parseInt(args[1], 10) || 10;
    log(`Starting Ralph loop (max ${maxIterations} iterations)`);
    
    for (let i = 1; i <= maxIterations; i++) {
      const story = getNextStory(loadPRD());
      if (!story) {
        log('✅ All stories complete!');
        break;
      }
      
      log(`\n=== Iteration ${i} ===`);
      log(`Story: ${story.title} (${story.id})`);
      log('Run: node ralph.js next');
      break; // Manual mode - stop after showing next story
    }
    return;
  }
  
  // Default: show help
  console.log(`
Ralph - Autonomous AI Coding Loop

Usage:
  node ralph.js status           Show current status
  node ralph.js next             Show next story and generate prompt
  node ralph.js complete <id>    Mark story as complete
  node ralph.js run [max]        Start Ralph loop

Examples:
  node ralph.js next                    # Get next task
  node ralph.js complete auth-cli       # Mark auth-cli done
  node ralph.js run 10                  # Run up to 10 iterations
`);
}

main();
