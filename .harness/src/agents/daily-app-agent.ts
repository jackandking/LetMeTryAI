/**
 * Daily App Agent - Full implementation
 */
import type { Task, TaskState, TopicCandidate } from '../types/index.js';
import { ReActLoop } from '../workflows/react-loop.js';
import { ConstraintsEngine, ConstraintViolationError } from '../constraints/engine.js';
import { ToolRegistry } from '../tools/registry.js';
import { loadProfileConfig, PATHS } from '../config/index.js';
import { generateScaffold } from '../services/scaffold.js';
import { 
  buildTopicSelectionPrompt, 
  parseTopicSelectionResponse,
  chooseBestTopic,
} from '../services/topic-selector.js';
import { logger } from '../utils/logger.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { publishToKuaishou } from '../services/kuaishou-publisher.js';
import { aiGenerateTool } from '../tools/ai-generate.js';

interface DailyAppTask extends Task {
  type: 'daily_app_creation';
  profileId: string;
}

export class DailyAppAgent {
  private profileId: string;
  private loop: ReActLoop;
  private constraints: ConstraintsEngine;
  private registry: ToolRegistry;
  private profile: ReturnType<typeof loadProfileConfig>;

  constructor(profileId: string) {
    this.profileId = profileId;
    this.profile = loadProfileConfig(profileId);
    this.registry = new ToolRegistry();
    this.constraints = new ConstraintsEngine(profileId);
    
    this.loop = new ReActLoop({
      maxIterations: 20,
      onHumanIntervention: this.handleHumanIntervention.bind(this),
      onStepComplete: this.logStep.bind(this),
    }, this.registry);

    this.registerActions();
  }

  private registerActions(): void {
    // 1. Topic selection - Call Copilot
    this.loop.registerAction('topic_selection', async (state) => {
      logger.info('Step: topic_selection');
      
      const currentDate = new Date().toISOString().slice(0, 10);
      const prompt = buildTopicSelectionPrompt(this.profile, currentDate);
      
      logger.info('Calling Copilot for topic selection');
      
      try {
        const aiResult = await aiGenerateTool.execute({
          prompt,
          outputFormat: 'json',
        });
        if (!aiResult.success) {
          throw new Error(aiResult.error?.message || 'AI generation failed');
        }
        const parsed = parseTopicSelectionResponse(aiResult.data);
        const topicSelection = {
          reportSummary: parsed.reportSummary,
          candidates: parsed.topicCandidates.map(candidate => ({
            appId: candidate.appId,
            title: candidate.title,
            appName: candidate.appName,
            category: candidate.category,
          })),
        };
        
        // Choose best candidate
        const best = await chooseBestTopic(parsed.topicCandidates, this.profile);
        
        // Validate constraints - try all candidates, sanitize if needed
        let selectedTopic: TopicCandidate | null = null;
        for (const candidate of parsed.topicCandidates) {
          try {
            await this.constraints.validateTopicAllowed(candidate);
            selectedTopic = candidate;
            logger.info('Topic passed constraint validation', { title: candidate.title });
            break;
          } catch (err) {
            if (err instanceof ConstraintViolationError) {
              logger.warn('Candidate failed constraints', { 
                title: candidate.title,
                violations: err.violations.map(v => v.message),
              });
            }
          }
        }

        // If none passed, try sanitizing the best candidate
        if (!selectedTopic) {
          const sanitized: TopicCandidate = {
            ...best,
            title: this.constraints.sanitizeText(best.title),
            appName: this.constraints.sanitizeText(best.appName),
            description: this.constraints.sanitizeText(best.description),
            question: this.constraints.sanitizeText(best.question),
          };
          try {
            await this.constraints.validateTopicAllowed(sanitized);
            selectedTopic = sanitized;
            logger.info('Topic passed constraint validation after sanitization', { title: sanitized.title });
          } catch (err) {
            logger.warn('Sanitized candidate still failed constraints', { 
              title: sanitized.title,
            });
          }
        }

        if (!selectedTopic) {
          throw new Error('All topic candidates failed constraint validation');
        }
        
        return {
          next: 'scaffold',
          data: {
            ...state.data,
            topicSelection,
            topic: selectedTopic,
          },
        };
      } catch (error) {
        logger.error('Topic selection failed', error as Error);
        throw error;
      }
    });

    // 2. Scaffold generation
    this.loop.registerAction('scaffold', async (state) => {
      logger.info('Step: scaffold');
      
      const topic = state.data.topic as TopicCandidate;
      
      // Read template
      const templatePath = join(PATHS.projectRoot, 'fighter-jets', 'styles.css');
      if (!existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
      }
      const stylesTemplate = readFileSync(templatePath, 'utf-8');
      
      // Generate scaffold
      const scaffold = generateScaffold(topic, this.profile, stylesTemplate);
      
      logger.info('Scaffold generated', { 
        appId: topic.appId, 
        files: Object.keys(scaffold.files),
      });
      
      return { next: 'materialize', data: { ...state.data, scaffold } };
    });

    // 3. Materialize files
    this.loop.registerAction('materialize', async (state) => {
      logger.info('Step: materialize');
      
      const { topic, scaffold } = state.data as { 
        topic: TopicCandidate; 
        scaffold: ReturnType<typeof generateScaffold>;
      };
      
      const appDir = join(PATHS.projectRoot, scaffold.outputDir);
      
      // Write files
      for (const [filename, content] of Object.entries(scaffold.files)) {
        const filePath = join(appDir, filename);
        await this.writeFile(filePath, content);
      }
      
      // Create images directory
      const imagesDir = join(appDir, 'images');
      await this.ensureDir(imagesDir);
      
      // Write generated placeholder assets
      let generatedAssetsCount = 0;
      for (const [relativePath, content] of Object.entries(scaffold.generatedAssets)) {
        const assetPath = join(appDir, relativePath);
        await this.writeFile(assetPath, content);
        generatedAssetsCount++;
        logger.debug('Generated asset written', { path: assetPath });
      }
      
      // Copy any fallback template images
      let copiedImages = 0;
      for (const { source, dest } of scaffold.imagesToCopy) {
        try {
          const destPath = join(appDir, dest);
          const { copyFileSync } = await import('fs');
          copyFileSync(source, destPath);
          copiedImages++;
          logger.debug('Image copied', { source, dest: destPath });
        } catch (error) {
          logger.warn('Failed to copy image', { source, error: (error as Error).message });
        }
      }
      
      logger.info('Files materialized', { 
        appDir, 
        fileCount: Object.keys(scaffold.files).length,
        generatedAssetsCount,
        imageCount: copiedImages 
      });
      
      return { next: 'validation', data: { ...state.data, appDir } };
    });

    // 4. Validation
    this.loop.registerAction('validation', async (state) => {
      logger.info('Step: validation');
      
      const { topic, appDir } = state.data as { topic: TopicCandidate; appDir: string };
      
      // Check files exist
      const requiredFiles = ['index.html', 'app.js', 'styles.css', 'metadata.json'];
      for (const file of requiredFiles) {
        const filePath = join(appDir, file);
        if (!existsSync(filePath)) {
          throw new Error(`Validation failed: missing ${file}`);
        }
      }
      
      logger.info('Validation passed', { appId: topic.appId });
      
      return { next: 'git_push', data: state.data };
    });

    // 5. Git operations
    this.loop.registerAction('git_push', async (state) => {
      logger.info('Step: git_push');
      
      const { topic, appDir } = state.data as { topic: TopicCandidate; appDir: string };
      const relativeDir = topic.appId;
      
      // Check git status
      const status = await this.runGit(['status', '--porcelain']);
      if (!status) {
        logger.warn('No changes to commit');
        return { next: 'deploy', data: state.data };
      }
      
      // Stage files
      await this.runGit(['add', '--', relativeDir]);
      
      // Commit
      const commitMessage = `Add daily app: ${topic.appName}\n\nCo-authored-by: Harness <harness@letmetry.ai>`;
      await this.runGit(['commit', '-m', commitMessage]);
      
      // Push
      await this.runGit(['push']);
      
      logger.info('Git push complete', { appId: topic.appId });
      
      return { next: 'deploy', data: { ...state.data, gitPushed: true } };
    });

    // 6. Deploy verification
    this.loop.registerAction('deploy', async (state) => {
      logger.info('Step: deploy');
      
      const { topic } = state.data as { topic: TopicCandidate };
      const deployedUrl = `https://letmetryai.cn/${topic.appId}/`;
      
      logger.info('Deployment URL', { url: deployedUrl });
      
      // In MVP, we just log the URL
      // In production, we would verify with HTTP request
      
      return { next: 'publish', data: { ...state.data, deployedUrl } };
    });

    // 7. Kuaishou publish - Distribution task (应用推广)
    this.loop.registerAction('publish', async (state) => {
      logger.info('Step: publish');
      
      const { topic, deployedUrl } = state.data as { topic: TopicCandidate; deployedUrl: string };
      
      logger.info('Publishing to Kuaishou via API', { appId: topic.appId, url: deployedUrl });
      
      const result = await publishToKuaishou(
        this.profileId,
        topic.appId,
        topic.appName,
        `${topic.appName} - 参与投票选出你的答案！`
      );
      
      if (!result.success) {
        logger.error('Kuaishou publish failed', new Error(result.error || 'Unknown error'));
        return { 
          next: 'send_report', 
          data: { ...state.data, published: false, publishError: result.error } 
        };
      }
      
      logger.info('Kuaishou publish complete', { appId: topic.appId, planId: result.planId });
      
      return { 
        next: 'send_report', 
        data: { ...state.data, published: true, planId: result.planId } 
      };
    });

    // 8. Send report email
    this.loop.registerAction('send_report', async (state) => {
      logger.info('Step: send_report');
      
      const { topic, deployedUrl, planId, published, publishError } = state.data as {
        topic: TopicCandidate;
        deployedUrl: string;
        planId?: string;
        published?: boolean;
        publishError?: string;
      };
      
      const toEmail = process.env.DAILY_REPORT_TO || 'jackandking@163.com';
      const subject = `[LetMeTryAI] Daily app published: ${topic.appName}`;
      const body = [
        `Profile: ${this.profileId}`,
        `App ID: ${topic.appId}`,
        `App Name: ${topic.appName}`,
        `Category: ${topic.category}`,
        `URL: ${deployedUrl}`,
        `Kuaishou Plan ID: ${planId || 'N/A'}`,
        `Kuaishou Publish Status: ${published ? 'Success' : 'Failed'}`,
        publishError ? `Publish Error: ${publishError}` : '',
      ].join('\n');
      
      const reportDir = join(PATHS.harnessRuntimeDir, 'daily-reports');
      if (!existsSync(reportDir)) {
        await this.ensureDir(reportDir);
      }
      const bodyFile = join(reportDir, `${topic.appId}-report.txt`);
      writeFileSync(bodyFile, body, 'utf-8');
      
      const scriptPath = join(PATHS.projectRoot, '.harness', 'scripts', 'send-daily-report.py');
      await this.runCommand('python3', [scriptPath, subject, toEmail, bodyFile]);
      
      logger.info('Report email sent', { toEmail, subject });
      
      return { next: 'done', data: { ...state.data, reportSent: true } };
    });
  }

  async run(): Promise<TaskState> {
    const task: DailyAppTask = {
      id: `daily-${this.profileId}-${Date.now()}`,
      type: 'daily_app_creation',
      profileId: this.profileId,
      status: 'idle',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { profile: this.profile.name },
    };

    logger.info('Starting DailyAppAgent', { 
      taskId: task.id, 
      profile: this.profileId,
      profileName: this.profile.name,
    });

    try {
      const state = await this.loop.run(task, {
        states: ['topic_selection', 'scaffold', 'materialize', 'validation', 'git_push', 'deploy', 'publish', 'send_report', 'done'],
        initialState: 'topic_selection',
        completionCheck: (s) => s.currentStep === 'done',
      });

      logger.info('DailyAppAgent completed', { 
        taskId: task.id,
        iterations: state.iteration,
        success: true,
      });

      return state;
    } catch (error) {
      logger.error('DailyAppAgent failed', error as Error, { taskId: task.id });
      throw error;
    }
  }

  // Helper methods
  private async writeFile(filePath: string, content: string): Promise<void> {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { dirname } = await import('path');
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, 'utf-8');
  }

  private async ensureDir(path: string): Promise<void> {
    const { mkdirSync } = await import('fs');
    mkdirSync(path, { recursive: true });
  }

  private async runGit(args: string[]): Promise<string> {
    return this.runCommand('git', args, PATHS.projectRoot);
  }

  private async runCommand(command: string, args: string[], cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: cwd || process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
      child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`${command} ${args.join(' ')} failed: ${stderr || stdout}`));
        } else {
          resolve(stdout.trim());
        }
      });

      child.on('error', reject);
    });
  }

  private async handleHumanIntervention(state: TaskState): Promise<void> {
    logger.warn('Human intervention required', { 
      step: state.currentStep,
      iteration: state.iteration,
    });
    // Send notification or alert
  }

  private logStep(record: { step: string; observation: { success: boolean } }): void {
    logger.debug(`Step ${record.step}: ${record.observation.success ? '✓' : '✗'}`);
  }
}
