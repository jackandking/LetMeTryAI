/**
 * Scaffold Generator - Creates voting app files from templates
 *
 * CRITICAL: This module uses TEMPLATE COPY strategy, not generation.
 * It reads a reference template app and replaces content while preserving ALL functionality.
 */
import { join } from 'path';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { PATHS } from '../config/index.js';
import { logger } from '../utils/logger.js';
// Feature signatures that MUST be present in generated code
const REQUIRED_FEATURES = [
    { pattern: /getConfig\s*\(/, name: '数据读取 (getConfig)', critical: true },
    { pattern: /updateConfig\s*\(/, name: '数据写入 (updateConfig)', critical: true },
    { pattern: /ks\.navigateTo|showAd/, name: '广告集成', critical: true },
    { pattern: /createBarChart|displayResults/, name: '结果展示', critical: true },
    { pattern: /finishedAd|checkUrlParameters/, name: 'URL参数处理', critical: true },
    { pattern: /jumpToIndex/, name: '返回主页', critical: false },
];
/**
 * Validates that generated code contains all required features
 */
export function validateFunctionalCompleteness(code, appId) {
    const missing = [];
    for (const feature of REQUIRED_FEATURES) {
        if (!feature.pattern.test(code)) {
            if (feature.critical) {
                missing.push(`${feature.name} (关键功能)`);
                logger.error(`功能缺失: ${feature.name}`, { appId });
            }
            else {
                logger.warn(`可选功能缺失: ${feature.name}`, { appId });
            }
        }
    }
    return {
        valid: missing.length === 0,
        missing,
    };
}
/**
 * Generates scaffold by COPYING template and replacing content
 * This ensures 100% functional parity with the reference template
 */
export function generateScaffold(topic, profile, stylesTemplate, templateAppId = 'fighter-jets') {
    const appId = topic.appId;
    const outputDir = appId;
    logger.info('Generating scaffold from template', { appId, template: templateAppId, title: topic.title });
    // Read template files
    const templateDir = join(PATHS.projectRoot, templateAppId);
    if (!existsSync(templateDir)) {
        throw new Error(`Template not found: ${templateDir}`);
    }
    // Read and transform template files
    const templateHtml = readFileSync(join(templateDir, 'index.html'), 'utf-8');
    const templateJs = readFileSync(join(templateDir, 'app.js'), 'utf-8');
    const files = {
        'index.html': transformHtml(templateHtml, topic, templateAppId),
        'app.js': transformJs(templateJs, topic, templateAppId),
        'styles.css': stylesTemplate,
        'metadata.json': generateMetadata(topic, profile),
    };
    // Validate functional completeness
    const validation = validateFunctionalCompleteness(files['app.js'], appId);
    if (!validation.valid) {
        throw new Error(`Scaffold validation failed for ${appId}. Missing features: ${validation.missing.join(', ')}`);
    }
    logger.info('Scaffold validation passed', { appId, features: REQUIRED_FEATURES.length });
    const images = topic.options.map(opt => `images/${opt.image}`);
    // 生成占位图资源（替代复制模板图片）
    const generatedAssets = generatePlaceholderAssets(topic.options);
    // 保留复制封面图的能力（如果有模板封面图）
    const imagesToCopy = getCoverImageToCopy(templateDir, topic);
    return {
        outputDir,
        files,
        images,
        imagesToCopy,
        generatedAssets,
    };
}
/**
 * 生成占位 SVG 图片资源
 */
function generatePlaceholderAssets(options) {
    const palettes = [
        ['#1f4e79', '#4f8fba'],
        ['#7f5539', '#ddb892'],
        ['#2f4858', '#86bbd8'],
        ['#4a5759', '#b0c4b1'],
        ['#7b2cbf', '#c77dff']
    ];
    const assets = {};
    options.forEach((option, index) => {
        if (!option.image.endsWith('.svg')) {
            return;
        }
        const palette = palettes[index % palettes.length];
        const content = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">',
            '  <defs>',
            `    <linearGradient id="grad-${index}" x1="0%" y1="0%" x2="100%" y2="100%">`,
            `      <stop offset="0%" stop-color="${palette[0]}"/>`,
            `      <stop offset="100%" stop-color="${palette[1]}"/>`,
            '    </linearGradient>',
            '  </defs>',
            `  <rect width="720" height="480" rx="32" fill="url(#grad-${index})"/>`,
            '  <circle cx="600" cy="90" r="60" fill="rgba(255,255,255,0.12)"/>',
            '  <circle cx="110" cy="390" r="80" fill="rgba(255,255,255,0.08)"/>',
            `  <text x="50%" y="44%" text-anchor="middle" font-size="44" font-family="Arial,Helvetica,sans-serif" fill="#ffffff" font-weight="700">${escapeHtml(option.label)}</text>`,
            '  <text x="50%" y="58%" text-anchor="middle" font-size="24" font-family="Arial,Helvetica,sans-serif" fill="rgba(255,255,255,0.92)">LetMeTryAI Voting Option</text>',
            '</svg>'
        ].join('\n');
        assets[`images/${option.image}`] = content;
    });
    return assets;
}
/**
 * 尝试复制模板封面图（仅用于 fallback）
 */
function getCoverImageToCopy(templateDir, topic) {
    const imagesDir = join(templateDir, 'images');
    const copies = [];
    if (!existsSync(imagesDir)) {
        return copies;
    }
    const templateImages = readdirSync(imagesDir).filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.svg'));
    // 只复制第一张作为封面 fallback（如果生成的占位图不够）
    if (templateImages.length > 0 && !topic.options[0]?.image.endsWith('.svg')) {
        copies.push({
            source: join(imagesDir, templateImages[0]),
            dest: `images/${topic.options[0].image}`
        });
    }
    return copies;
}
/**
 * Transforms template HTML by replacing content while preserving structure
 */
function transformHtml(template, topic, templateId) {
    const appId = topic.appId;
    let html = template;
    // Replace title and meta
    html = html.replace(/<title>.*?<\/title>/, `<title>${topic.pageTitle}</title>`);
    html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${topic.description}">`);
    // Replace page header
    html = html.replace(/<h1 id="pageTitle">.*?<\/h1>/, `<h1 id="pageTitle">${topic.title}</h1>`);
    // Replace question text
    html = html.replace(/<p id="questionText" class="question-text">.*?<\/p>/, `<p id="questionText" class="question-text">${topic.question}</p>`);
    // Replace options grid (preserve radio button structure)
    const optionsHtml = topic.options.map((opt, index) => {
        const templateValue = getTemplateOptionValue(templateId, index);
        return `
                        <label class="option-card">
                            <input type="radio" name="equipment" value="${opt.value}">
                            <div class="card-image">
                                <img src="images/${opt.image}" alt="${opt.alt}" loading="lazy">
                            </div>
                            <div class="card-content">
                                <h3 class="option-title">${opt.label}</h3>
                                <p class="option-caption">${opt.caption || ''}</p>
                            </div>
                            <div class="check-indicator">✓</div>
                        </label>`;
    }).join('\n');
    // Replace the entire options grid content
    html = html.replace(/<div class="options-grid" id="optionsContainer">[\s\S]*?<\/div>\s*<\/div>\s*<\/form>/, `<div class="options-grid" id="optionsContainer">${optionsHtml}\n                    </div>\n                </div>\n            </form>`);
    // Update script src path
    html = html.replace(new RegExp(`src="${templateId}/app.js"`, 'g'), `src="app.js"`);
    return html;
}
/**
 * Transforms template JS by replacing config while preserving ALL functionality
 */
function transformJs(template, topic, templateId) {
    const appId = topic.appId;
    let js = template;
    // Replace questionConfig object (preserve structure, change values)
    const oldConfigMatch = js.match(/const questionConfig = \{[\s\S]*?\};/);
    if (!oldConfigMatch) {
        throw new Error('Could not find questionConfig in template');
    }
    const newConfig = `const questionConfig = {
    title: '${topic.title}',
    question: '${topic.question}',
    options: [
${topic.options.map(o => `        { value: '${o.value}', label: '${o.label}' }`).join(',\n')}
    ],
    storageKey: '${appId.replace(/-/g, '_')}.data'
};`;
    js = js.replace(oldConfigMatch[0], newConfig);
    // Update result title
    js = js.replace(/resultDiv\.innerHTML = '<h2>.*?<\/h2>';/, `resultDiv.innerHTML = '<h2>${topic.title}结果</h2>';`);
    // Update ad navigation URL
    js = js.replace(new RegExp(`result_page_id=${templateId}`, 'g'), `result_page_id=${appId}`);
    // Update radio button name if needed
    js = js.replace(/document\.querySelectorAll\('input\[name=".*?"\]'\)/g, `document.querySelectorAll('input[name="equipment"]')`);
    return js;
}
/**
 * Gets template option value by index for mapping
 */
function getTemplateOptionValue(templateId, index) {
    // Map known templates
    const templateMaps = {
        'fighter-jets': ['f22', 'j20', 'su57', 'f35', 'rafale'],
    };
    const values = templateMaps[templateId];
    return values?.[index] || `option${index}`;
}
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function generateMetadata(topic, profile) {
    const metadata = {
        id: topic.appId,
        name: topic.appName,
        description: topic.description,
        category: topic.category,
        keywords: [...topic.keywords, '投票', profile.name],
        coverImage: `${topic.appId}/images/${topic.options[0]?.image || 'cover.svg'}`,
        generatedFrom: 'fighter-jets',
        generatedAt: new Date().toISOString(),
    };
    return JSON.stringify(metadata, null, 2);
}
//# sourceMappingURL=scaffold.js.map