/**
 * Video Generator using Real Screenshots
 *
 * 使用真实应用截图生成视频:
 * 1. 截取手机版投票页面 (375x812 retina)
 * 2. 从 HTML 提取标题、问题、选项
 * 3. 合成带配音的视频
 */
import { join } from 'path';
import { promises as fs, existsSync } from 'fs';
import { spawn } from 'child_process';
import { chromium } from 'playwright';
import { logger } from '../utils/logger.js';
/**
 * 从应用页面提取内容
 */
async function extractAppContent(page) {
    logger.info('Extracting app content from page...');
    // 使用浏览器执行 JavaScript 提取内容
    const content = await page.evaluate(() => {
        // 尝试多种选择器来获取标题
        const titleSelectors = [
            'h1', '.app-title', '.vote-title', '[data-title]',
            '.header h1', '.title', 'header h1'
        ];
        let title = '';
        for (const sel of titleSelectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent) {
                title = el.textContent.trim();
                if (title.length > 3)
                    break;
            }
        }
        // 获取问题
        const questionSelectors = [
            '.question', '.vote-question', '[data-question]',
            '.subtitle', 'h2', '.description'
        ];
        let question = '';
        for (const sel of questionSelectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent) {
                question = el.textContent.trim();
                if (question.length > 5)
                    break;
            }
        }
        // 获取选项
        const optionSelectors = [
            '.vote-option', '.option-card', '.option',
            '[data-option]', '.choice', '.item'
        ];
        const options = [];
        for (const sel of optionSelectors) {
            const elements = document.querySelectorAll(sel);
            if (elements.length > 0) {
                elements.forEach(el => {
                    const text = el.textContent?.trim();
                    if (text && text.length > 2 && text.length < 100) {
                        options.push(text);
                    }
                });
                if (options.length > 0)
                    break;
            }
        }
        // 如果没有找到选项，尝试其他方式
        if (options.length === 0) {
            // 查找包含特定关键词的元素
            const allElements = document.querySelectorAll('div, span, p');
            for (const el of allElements) {
                const text = el.textContent?.trim() || '';
                if (text.includes('优先') || text.includes('选择') || text.includes('选项')) {
                    if (text.length > 5 && text.length < 80 && !options.includes(text)) {
                        options.push(text);
                        if (options.length >= 5)
                            break;
                    }
                }
            }
        }
        return { title, question, options };
    });
    logger.info('Content extracted', {
        title: content.title.substring(0, 30),
        question: content.question.substring(0, 30),
        optionsCount: content.options.length
    });
    return content;
}
/**
 * 截取应用页面截图
 */
async function captureScreenshot(appUrl, outputPath, viewport = { width: 375, height: 812 }) {
    logger.info('Capturing screenshot', { url: appUrl, viewport });
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({
            viewport,
            deviceScaleFactor: 3, // Retina
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        });
        const page = await context.newPage();
        // 拦截图片请求，记录加载失败的图片
        const failedImages = [];
        page.on('response', response => {
            if (response.request().resourceType() === 'image' && response.status() !== 200) {
                failedImages.push(response.url());
            }
        });
        // 加载页面（增加超时时间）
        await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 60000 });
        // 等待所有图片加载（包括懒加载）
        await page.evaluate(async () => {
            // 滚动页面触发懒加载
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(r => setTimeout(r, 500));
            window.scrollTo(0, 0);
            // 等待所有图片加载
            const images = Array.from(document.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete)
                    return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve; // 即使失败也继续
                    setTimeout(resolve, 2000); // 2秒超时
                });
            }));
        });
        await page.waitForTimeout(1000);
        if (failedImages.length > 0) {
            logger.warn('Some images failed to load', { count: failedImages.length });
        }
        // 提取内容
        const content = await extractAppContent(page);
        // 截取全页面
        await page.screenshot({
            path: outputPath,
            type: 'jpeg',
            quality: 90,
            fullPage: false, // 只截取视口
        });
        logger.info('Screenshot captured', { path: outputPath });
        await browser.close();
        return { success: true, content };
    }
    catch (error) {
        await browser.close();
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
/**
 * 生成配音脚本
 */
function generateScript(content, appName) {
    const { title, question, options } = content;
    // 清理选项文本
    const cleanOptions = options
        .slice(0, 3)
        .map(opt => opt.replace(/\s+/g, ' ').trim())
        .filter(opt => opt.length > 0);
    const optionsText = cleanOptions.length > 0
        ? `选项有：${cleanOptions.join('；')}。`
        : '';
    const mainTitle = title || appName;
    const mainQuestion = question || '你会怎么选择呢？';
    return `欢迎参与${mainTitle}投票！${mainQuestion}${optionsText}快来投出你宝贵的一票，看看大家的选择！`;
}
/**
 * 生成音频
 */
async function generateAudio(text, outputPath) {
    logger.info('Generating audio with say');
    return new Promise((resolve, reject) => {
        const aiffPath = outputPath.replace('.m4a', '.aiff');
        const child = spawn('say', [
            '-v', 'Ting-Ting',
            '-r', '180',
            '-o', aiffPath,
            text,
        ]);
        child.on('close', async (code) => {
            if (code !== 0) {
                reject(new Error('say command failed'));
                return;
            }
            // 转换为 m4a
            await new Promise(r => {
                spawn('afconvert', [aiffPath, outputPath, '-f', 'm4af', '-d', 'aac'])
                    .on('close', r);
            });
            // 清理临时文件
            try {
                await fs.unlink(aiffPath);
            }
            catch { }
            // 获取时长
            const info = spawn('afinfo', [outputPath]);
            let stdout = '';
            info.stdout.on('data', d => stdout += d);
            info.on('close', () => {
                const match = stdout.match(/estimated duration:\s*([\d.]+)\s*sec/);
                resolve(parseFloat(match?.[1] || '10'));
            });
        });
    });
}
/**
 * 合成视频
 */
async function composeVideo(imagePath, audioPath, outputPath, duration) {
    logger.info('Composing video with ffmpeg');
    const ffmpegPath = join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
    const ffmpegCmd = existsSync(ffmpegPath) ? ffmpegPath : 'ffmpeg';
    return new Promise((resolve, reject) => {
        const args = [
            '-y',
            '-loop', '1',
            '-i', imagePath,
            '-i', audioPath,
            '-t', String(duration + 0.5),
            '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-shortest',
            outputPath,
        ];
        const child = spawn(ffmpegCmd, args);
        let stderr = '';
        child.stderr.on('data', d => stderr += d.toString());
        child.on('close', (code) => {
            if (code === 0 || (existsSync(outputPath) && statSync(outputPath).size > 10000)) {
                resolve();
            }
            else {
                reject(new Error(`ffmpeg failed: ${stderr.slice(-200)}`));
            }
        });
    });
}
/**
 * 主函数：生成带截图的视频
 */
export async function generateScreenshotVideo(config) {
    const startTime = Date.now();
    try {
        await fs.mkdir(config.outputDir, { recursive: true });
        const baseName = join(config.outputDir, config.appId);
        const screenshotPath = `${baseName}-screenshot.jpg`;
        const audioPath = `${baseName}-audio.m4a`;
        const videoPath = `${baseName}-video.mp4`;
        const scriptPath = `${baseName}-script.txt`;
        const contentPath = `${baseName}-content.json`;
        // 1. 截图并提取内容
        const captureResult = await captureScreenshot(config.appUrl, screenshotPath, config.viewport);
        if (!captureResult.success) {
            throw new Error(`Screenshot failed: ${captureResult.error}`);
        }
        const content = captureResult.content;
        // 保存提取的内容
        await fs.writeFile(contentPath, JSON.stringify(content, null, 2));
        // 2. 生成配音脚本
        const script = generateScript(content, config.appName);
        await fs.writeFile(scriptPath, script, 'utf-8');
        logger.info('Script generated', { script: script.substring(0, 80) });
        // 3. 生成音频
        const duration = await generateAudio(script, audioPath);
        // 4. 合成视频
        await composeVideo(screenshotPath, audioPath, videoPath, duration);
        const stats = await fs.stat(videoPath);
        logger.info('Video generation complete', {
            duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
            videoSize: `${(stats.size / 1024 / 1024).toFixed(2)}MB`
        });
        return {
            success: true,
            videoPath,
            screenshotPath,
            audioPath,
            content,
            duration,
        };
    }
    catch (error) {
        logger.error('Video generation failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * 便捷函数
 */
export async function generateVideoFromScreenshot(appId, appName, appUrl, outputDir) {
    return generateScreenshotVideo({
        appId,
        appName,
        appUrl,
        outputDir,
        viewport: { width: 375, height: 812 }, // iPhone X 尺寸
    });
}
//# sourceMappingURL=video-screenshot.js.map