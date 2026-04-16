import { ReActLoop } from '../workflows/react-loop.js';
import { ConstraintsEngine, ConstraintViolationError } from '../constraints/engine.js';
import { ToolRegistry } from '../tools/registry.js';
import { loadProfileConfig, PATHS } from '../config/index.js';
import { generateScaffold } from '../services/scaffold.js';
import { buildTopicSelectionPrompt, parseTopicSelectionResponse, chooseBestTopic, } from '../services/topic-selector.js';
import { logger } from '../utils/logger.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { publishToKuaishou } from '../services/kuaishou-publisher.js';
import { aiGenerateTool } from '../tools/ai-generate.js';
const MANUAL_TOPIC_MAP = {
    nanrenbao: 'man',
    womanai: 'woman',
    'parent-tools': 'parent',
    'elder-love': 'elder',
};
function getManualQueueFile(profileId) {
    const key = MANUAL_TOPIC_MAP[profileId] || profileId;
    return join(PATHS.projectRoot, '.automation', '.local', 'state', 'topics', `${key}-manual-topics.txt`);
}
function popManualTopic(profileId) {
    const file = getManualQueueFile(profileId);
    if (!existsSync(file)) {
        return null;
    }
    const topics = readFileSync(file, 'utf-8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    if (topics.length === 0) {
        return null;
    }
    const next = topics[0];
    const remaining = topics.slice(1);
    writeFileSync(file, remaining.join('\n') + (remaining.length > 0 ? '\n' : ''));
    logger.info('Popped manual topic', { profileId, topic: next });
    return next;
}
export class DailyAppAgent {
    profileId;
    loop;
    constraints;
    registry;
    profile;
    constructor(profileId) {
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
    registerActions() {
        // 1. Topic selection - prefer manual queue, fallback to AI
        this.loop.registerAction('topic_selection', async (state) => {
            logger.info('Step: topic_selection');
            const currentDate = new Date().toISOString().slice(0, 10);
            // Check manual topic queue first
            const manualTopic = popManualTopic(this.profileId);
            try {
                let parsed;
                let manualTopicUsed = false;
                if (manualTopic) {
                    logger.info('Using manual topic from queue', { topic: manualTopic });
                    const prompt = buildTopicSelectionPrompt(this.profile, currentDate, undefined, undefined, manualTopic);
                    const aiResult = await aiGenerateTool.execute({
                        prompt,
                        outputFormat: 'json',
                    });
                    if (!aiResult.success) {
                        throw new Error(aiResult.error?.message || 'AI generation failed');
                    }
                    parsed = parseTopicSelectionResponse(aiResult.data);
                    manualTopicUsed = true;
                }
                else {
                    logger.info('No manual topic found, calling AI for topic selection');
                    const prompt = buildTopicSelectionPrompt(this.profile, currentDate);
                    const aiResult = await aiGenerateTool.execute({
                        prompt,
                        outputFormat: 'json',
                    });
                    if (!aiResult.success) {
                        throw new Error(aiResult.error?.message || 'AI generation failed');
                    }
                    parsed = parseTopicSelectionResponse(aiResult.data);
                }
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
                if (manualTopicUsed) {
                    logger.info('Selected manual candidate', { title: best.title });
                }
                else {
                    logger.info('Selected AI candidate', { title: best.title });
                }
                // Validate constraints - try all candidates, sanitize if needed
                let selectedTopic = null;
                for (const candidate of parsed.topicCandidates) {
                    try {
                        await this.constraints.validateTopicAllowed(candidate);
                        selectedTopic = candidate;
                        logger.info('Topic passed constraint validation', { title: candidate.title });
                        break;
                    }
                    catch (err) {
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
                    const sanitized = {
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
                    }
                    catch (err) {
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
            }
            catch (error) {
                logger.error('Topic selection failed', error);
                throw error;
            }
        });
        // 2. Scaffold generation
        this.loop.registerAction('scaffold', async (state) => {
            logger.info('Step: scaffold');
            const topic = state.data.topic;
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
            const { topic, scaffold } = state.data;
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
                }
                catch (error) {
                    logger.warn('Failed to copy image', { source, error: error.message });
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
            const { topic, appDir } = state.data;
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
            const { topic, appDir } = state.data;
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
            const { topic } = state.data;
            const deployedUrl = `https://letmetryai.cn/${topic.appId}/`;
            logger.info('Deployment URL', { url: deployedUrl });
            // In MVP, we just log the URL
            // In production, we would verify with HTTP request
            return { next: 'publish', data: { ...state.data, deployedUrl } };
        });
        // 7. Kuaishou publish - Distribution task (应用推广)
        this.loop.registerAction('publish', async (state) => {
            logger.info('Step: publish');
            const { topic, deployedUrl } = state.data;
            logger.info('Publishing to Kuaishou via API', { appId: topic.appId, url: deployedUrl });
            const result = await publishToKuaishou(this.profileId, topic.appId, topic.appName, `${topic.appName} - 参与投票选出你的答案！`);
            if (!result.success) {
                logger.error('Kuaishou publish failed', new Error(result.error || 'Unknown error'));
                // Send failure alert email immediately
                try {
                    const alertSubject = `[Kuaishou Publish Failed] ${topic.appName} (${topic.appId})`;
                    const alertBody = `Profile: ${this.profileId}\nApp ID: ${topic.appId}\nApp Name: ${topic.appName}\nURL: ${deployedUrl}\nError: ${result.error || 'Unknown error'}\nTime: ${new Date().toISOString()}`;
                    const alertDir = join(PATHS.harnessRuntimeDir, 'daily-reports');
                    if (!existsSync(alertDir)) {
                        await this.ensureDir(alertDir);
                    }
                    const alertBodyFile = join(alertDir, `${topic.appId}-publish-alert.txt`);
                    writeFileSync(alertBodyFile, alertBody, 'utf-8');
                    const alertScript = join(PATHS.projectRoot, '.automation', 'scripts', 'send_email.py');
                    const alertTo = process.env.KUAISHOU_EMAIL_TO || 'jackandking@163.com';
                    await this.runCommand('python3', [alertScript, alertSubject, alertTo, alertBodyFile]);
                    logger.info('Kuaishou publish failure alert sent', { to: alertTo, subject: alertSubject });
                }
                catch (alertErr) {
                    logger.warn('Failed to send Kuaishou publish failure alert', { error: alertErr.message });
                }
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
            const { topic, deployedUrl, planId, published, publishError } = state.data;
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
    async run() {
        const task = {
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
        }
        catch (error) {
            logger.error('DailyAppAgent failed', error, { taskId: task.id });
            throw error;
        }
    }
    // Helper methods
    async writeFile(filePath, content) {
        const { writeFileSync, mkdirSync } = await import('fs');
        const { dirname } = await import('path');
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, content, 'utf-8');
    }
    async ensureDir(path) {
        const { mkdirSync } = await import('fs');
        mkdirSync(path, { recursive: true });
    }
    async runGit(args) {
        return this.runCommand('git', args, PATHS.projectRoot);
    }
    async runCommand(command, args, cwd) {
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
                }
                else {
                    resolve(stdout.trim());
                }
            });
            child.on('error', reject);
        });
    }
    async handleHumanIntervention(state) {
        logger.warn('Human intervention required', {
            step: state.currentStep,
            iteration: state.iteration,
        });
        // Send notification or alert
    }
    logStep(record) {
        logger.debug(`Step ${record.step}: ${record.observation.success ? '✓' : '✗'}`);
    }
}
//# sourceMappingURL=daily-app-agent.js.map