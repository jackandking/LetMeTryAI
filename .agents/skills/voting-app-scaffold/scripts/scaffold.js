/**
 * Convert arbitrary text into a storage-safe id fragment.
 *
 * @param {string} value Text to normalize.
 * @returns {string} Storage-safe identifier fragment.
 */
function normalizeId(value) {
    if (typeof value !== 'string') {
        return 'option';
    }

    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || 'option';
}

/**
 * Escape text for HTML content/attributes.
 *
 * @param {string} value Raw text.
 * @returns {string} Escaped HTML-safe text.
 */
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Quote a value for JS source output.
 *
 * @param {string} value Raw string.
 * @returns {string} JSON-quoted string.
 */
function jsString(value) {
    return JSON.stringify(String(value));
}

/**
 * Normalize one option record.
 *
 * @param {object} option Raw option.
 * @param {number} index Option index.
 * @returns {{ value: string, label: string, image: string, alt: string, caption: string }}
 */
function normalizeOption(option, index) {
    const source = option && typeof option === 'object' ? option : {};
    const fallbackLabel = `选项${index + 1}`;
    const label = typeof source.label === 'string' && source.label.trim() ? source.label.trim() : fallbackLabel;
    const value = typeof source.value === 'string' && source.value.trim()
        ? normalizeId(source.value)
        : normalizeId(label || `option-${index + 1}`);
    const image = typeof source.image === 'string' && source.image.trim()
        ? source.image.trim()
        : `${value}.svg`;

    return {
        value,
        label,
        image,
        alt: typeof source.alt === 'string' && source.alt.trim() ? source.alt.trim() : label,
        caption: typeof source.caption === 'string' && source.caption.trim() ? source.caption.trim() : label
    };
}

/**
 * Normalize a string array and drop empty values.
 *
 * @param {unknown} value Raw list.
 * @returns {string[]} Clean string array.
 */
function normalizeStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(item => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean);
}

/**
 * Create generic UI copy for a new app.
 *
 * @param {object} spec Scaffold input.
 * @returns {object} Derived UI copy strings.
 */
function buildUiCopy(spec) {
    const source = spec && typeof spec === 'object' ? spec : {};
    const title = typeof source.title === 'string' && source.title.trim() ? source.title.trim() : '新的投票话题';
    const appName = typeof source.appName === 'string' && source.appName.trim() ? source.appName.trim() : title;

    return {
        loadingText: typeof source.loadingText === 'string' && source.loadingText.trim()
            ? source.loadingText.trim()
            : '正在汇总实时投票结果...',
        resultHeading: typeof source.resultHeading === 'string' && source.resultHeading.trim()
            ? source.resultHeading.trim()
            : `${appName}投票结果`,
        resultSubtitle: typeof source.resultSubtitle === 'string' && source.resultSubtitle.trim()
            ? source.resultSubtitle.trim()
            : `看看大家对“${title}”的最新态度`,
        resultButtonText: typeof source.resultButtonText === 'string' && source.resultButtonText.trim()
            ? source.resultButtonText.trim()
            : '查看实时票选结果',
        adMessage: typeof source.adMessage === 'string' && source.adMessage.trim()
            ? source.adMessage.trim()
            : `正在分析“${title}”的投票趋势...`
    };
}

/**
 * Build the question config object expected by the fighter-jets app pattern.
 *
 * @param {object} spec Scaffold input.
 * @returns {object} Normalized question config.
 */
export function createQuestionConfig(spec) {
    const source = spec && typeof spec === 'object' ? spec : {};
    const appId = typeof source.appId === 'string' && source.appId.trim() ? source.appId.trim() : 'new-app';
    const options = Array.isArray(source.options) ? source.options.map(normalizeOption) : [];

    return {
        title: typeof source.title === 'string' && source.title.trim() ? source.title.trim() : '新的投票话题',
        question: typeof source.question === 'string' && source.question.trim()
            ? source.question.trim()
            : '你会把这一票投给谁？',
        options: options.map(option => ({
            value: option.value,
            label: option.label
        })),
        storageKey: `${appId.replace(/-/g, '_')}_v1.data`
    };
}

/**
 * Render a questionConfig JS snippet for app.js replacement.
 *
 * @param {object} spec Scaffold input.
 * @returns {string} JS snippet.
 */
export function renderQuestionConfigSnippet(spec) {
    const config = createQuestionConfig(spec);
    const optionsLines = config.options
        .map(option => `        { value: ${jsString(option.value)}, label: ${jsString(option.label)} }`)
        .join(',\n');

    return [
        'const questionConfig = {',
        `    title: ${jsString(config.title)},`,
        `    question: ${jsString(config.question)},`,
        '    options: [',
        optionsLines,
        '    ],',
        `    storageKey: ${jsString(config.storageKey)}`,
        '};'
    ].join('\n');
}

/**
 * Render repeated option blocks for the fighter-jets-style HTML.
 *
 * @param {object[]} options Voting options.
 * @param {string} [inputName] Radio input name.
 * @returns {string} HTML option markup.
 */
export function renderOptionMarkup(options, inputName = 'fighter') {
    const normalized = Array.isArray(options) ? options.map(normalizeOption) : [];
    const safeInputName = typeof inputName === 'string' && inputName.trim() ? inputName.trim() : 'fighter';

    return normalized
        .map(option => [
            '                <label class="option">',
            `                    <input type="radio" name="${escapeHtml(safeInputName)}" value="${escapeHtml(option.value)}">`,
            `                    <img src="images/${escapeHtml(option.image)}" alt="${escapeHtml(option.alt)}" loading="lazy">`,
            `                    <span>${escapeHtml(option.caption)}</span>`,
            '                </label>'
        ].join('\n'))
        .join('\n\n');
}

/**
 * Build placeholder SVG assets when no real local images are available yet.
 *
 * @param {object[]} options Normalized options.
 * @returns {Record<string, string>} Asset path to SVG content.
 */
export function buildPlaceholderAssets(options) {
    const normalized = Array.isArray(options) ? options.map(normalizeOption) : [];
    const palettes = [
        ['#1f4e79', '#4f8fba'],
        ['#7f5539', '#ddb892'],
        ['#2f4858', '#86bbd8'],
        ['#4a5759', '#b0c4b1'],
        ['#7b2cbf', '#c77dff']
    ];

    return Object.fromEntries(
        normalized
            .filter(option => option.image.endsWith('.svg'))
            .map((option, index) => {
                const palette = palettes[index % palettes.length];
                const content = [
                    '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">',
                    '  <defs>',
                    `    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">`,
                    `      <stop offset="0%" stop-color="${palette[0]}"/>`,
                    `      <stop offset="100%" stop-color="${palette[1]}"/>`,
                    '    </linearGradient>',
                    '  </defs>',
                    '  <rect width="720" height="480" rx="32" fill="url(#grad)"/>',
                    '  <circle cx="600" cy="90" r="60" fill="rgba(255,255,255,0.12)"/>',
                    '  <circle cx="110" cy="390" r="80" fill="rgba(255,255,255,0.08)"/>',
                    `  <text x="50%" y="44%" text-anchor="middle" font-size="44" font-family="Arial,Helvetica,sans-serif" fill="#ffffff" font-weight="700">${escapeHtml(option.label)}</text>`,
                    `  <text x="50%" y="58%" text-anchor="middle" font-size="24" font-family="Arial,Helvetica,sans-serif" fill="rgba(255,255,255,0.92)">LetMeTryAI Voting Option</text>`,
                    '</svg>'
                ].join('\n');

                return [`images/${option.image}`, content];
            })
    );
}

/**
 * Render a full fighter-jets-style index.html.
 *
 * @param {object} spec Scaffold input.
 * @returns {string} Full HTML document.
 */
export function renderFullIndexHtml(spec) {
    const source = spec && typeof spec === 'object' ? spec : {};
    const uiCopy = buildUiCopy(source);
    const title = typeof source.title === 'string' && source.title.trim() ? source.title.trim() : '新的投票话题';
    const question = typeof source.question === 'string' && source.question.trim()
        ? source.question.trim()
        : '你会把这一票投给谁？';

    return [
        '<!DOCTYPE html>',
        '<html lang="zh-CN">',
        '<head>',
        '    <meta charset="UTF-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '    <meta name="baidu_union_verify" content="a474889f17de23d877149d511beb790d">',
        '    <link rel="icon" href="/icons/favicon.ico" type="image/x-icon" />',
        '    <script>',
        '        var _hmt = _hmt || [];',
        '        (function() {',
        "            var hm = document.createElement('script');",
        "            hm.src = 'https://hm.baidu.com/hm.js?4ec6d2ddfd5746ce248a74a75c1d4fba';",
        "            var s = document.getElementsByTagName('script')[0];",
        '            s.parentNode.insertBefore(hm, s);',
        '        })();',
        '    </script>',
        `    <title>${escapeHtml(title)}</title>`,
        '    <script src="../util.js"></script>',
        '    <script src="app.js"></script>',
        '    <link rel="stylesheet" href="styles.css">',
        '</head>',
        '<body>',
        `    <h1 id="pageTitle">${escapeHtml(title)}</h1>`,
        '',
        '    <form id="questionnaire">',
        '        <div class="question" id="questionArea">',
        `            <p id="questionText">${escapeHtml(question)}</p>`,
        '            <div class="button-group" id="optionsContainer">',
        renderOptionMarkup(source.options, source.inputName),
        '            </div>',
        '        </div>',
        '    </form>',
        '',
        '    <div class="result" id="result">',
        `        <p>${escapeHtml(uiCopy.loadingText)}</p>`,
        '    </div>',
        '',
        `    <button class="show-result-btn" style="display:none;" id="showResultBtn" onclick="showAd()">${escapeHtml(uiCopy.resultButtonText)}</button>`,
        '',
        '    <div class="more" id="more"><a target="_blank" onclick="jumpToIndex()">返回主页查看更多</a></div>',
        '',
        '    <script>',
        '        (function() {',
        "            const urlParams = new URLSearchParams(window.location.search);",
        "            if (urlParams.get('debug') === 'true') {",
        "                const script = document.createElement('script');",
        "                script.src = 'https://unpkg.com/vconsole@3.15.1/dist/vconsole.min.js';",
        '                script.onload = function() {',
        '                    if (window.VConsole) new window.VConsole();',
        '                };',
        '                document.head.appendChild(script);',
        '            }',
        '        })();',
        '    </script>',
        '</body>',
        '</html>'
    ].join('\n');
}

/**
 * Render a complete app.js based on the fighter-jets/ai-lobster interaction model.
 *
 * @param {object} spec Scaffold input.
 * @returns {string} Full app.js source.
 */
export function renderFullAppJs(spec) {
    const source = spec && typeof spec === 'object' ? spec : {};
    const config = createQuestionConfig(source);
    const uiCopy = buildUiCopy(source);
    const inputName = typeof source.inputName === 'string' && source.inputName.trim()
        ? source.inputName.trim()
        : 'fighter';
    const resultPageId = typeof source.appId === 'string' && source.appId.trim() ? source.appId.trim() : 'new-app';

    return `/**
 * ${source.appName || 'Voting'} Survey Application
 * Logic for the ${jsString(config.title)} survey
 */

const questionConfig = ${JSON.stringify(config, null, 4)};

let currentQuestion = 1;
let voteData = {};

function initializeApp() {
    try {
        checkUrlParameters();
        initializeVoteData();
        setupPageContent();
        handleResultDisplay();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('finishedAd') === 'false') {
        if (typeof ks !== 'undefined' && ks.navigateBack) {
            ks.navigateBack();
        }
    }
}

function initializeVoteData() {
    questionConfig.options.forEach(option => {
        voteData[option.label] = 0;
    });
}

function setupPageContent() {
    const titleElement = document.getElementById('pageTitle');
    if (titleElement) {
        titleElement.textContent = questionConfig.title;
    }

    const questionElement = document.getElementById('questionText');
    if (questionElement) {
        questionElement.textContent = questionConfig.question;
    }

    attachRadioHandlers();
}

function attachRadioHandlers() {
    const radios = document.querySelectorAll('input[name=${jsString(inputName)}]');
    if (!radios || radios.length === 0) {
        return;
    }

    radios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            const selectedValue = event.target.value;
            const matched = questionConfig.options.find(option => option.value === selectedValue);

            if (matched) {
                processVote(matched.label);
                showAd();
            }
        });
    });
}

function processVote(selectedLabel) {
    getConfig(questionConfig.storageKey, (data) => {
        try {
            if (data !== null && typeof data === 'object') {
                voteData = { ...data };
            }

            voteData[selectedLabel] = (voteData[selectedLabel] || 0) + 1;
            updateConfig(questionConfig.storageKey, voteData);

            const questionArea = document.getElementById('questionArea');
            if (questionArea) {
                questionArea.style.display = 'none';
            }

            const showResultBtn = document.getElementById('showResultBtn');
            if (showResultBtn) {
                showResultBtn.style.display = 'block';
            }
        } catch (error) {
            console.error('Error processing vote:', error);
        }
    });
}

function showAd() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: '/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=${resultPageId}'
        });
        return;
    }

    displayAdFallback().catch(error => console.error('Ad fallback error:', error));
}

function displayAdFallback() {
    return new Promise((resolve) => {
        let overlay = document.getElementById('adOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'adOverlay';
            overlay.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;color:#fff;flex-direction:column;';
            overlay.innerHTML = '<div style="background:#2f4858;padding:30px;border-radius:12px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.5);"><h3>${uiCopy.adMessage.replace(/'/g, "\\'")}</h3><div style="margin-top:15px;width:40px;height:40px;border:4px solid #ff7f50;border-top:4px solid transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div><style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style></div>';
            document.body.appendChild(overlay);
        } else {
            overlay.style.display = 'flex';
        }

        setTimeout(() => {
            overlay.style.display = 'none';
            displayResults();
            resolve();
        }, 1500);
    });
}

function displayResults() {
    const questionnaire = document.getElementById('questionnaire');
    const result = document.getElementById('result');
    const showResultBtn = document.getElementById('showResultBtn');

    if (questionnaire) {
        questionnaire.style.display = 'none';
    }
    if (showResultBtn) {
        showResultBtn.style.display = 'none';
    }
    if (result) {
        result.style.display = 'block';
    }

    getConfig(questionConfig.storageKey, (data) => {
        if (data) {
            showResult(data);
        } else {
            showResult(voteData);
        }
    });
}

function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    const finishedAd = urlParams.get('finishedAd');
    if (finishedAd === 'true' || finishedAd === true || finishedAd === '1') {
        const questionnaire = document.getElementById('questionnaire');
        const result = document.getElementById('result');
        if (questionnaire) {
            questionnaire.style.display = 'none';
        }
        if (result) {
            result.style.display = 'block';
        }

        displayResults();
    }
}

function showResult(latestVoteData) {
    if (!latestVoteData || typeof latestVoteData !== 'object') {
        return;
    }

    const resultDiv = document.getElementById('result');
    if (!resultDiv) {
        return;
    }

    resultDiv.innerHTML = "<h2 style='text-align:center;color:#2f4858;'>${uiCopy.resultHeading.replace(/'/g, "\\'")}</h2>";
    resultDiv.innerHTML += "<p style='text-align:center;color:#7f8c8d;margin-bottom:20px;font-size:14px;'>${uiCopy.resultSubtitle.replace(/'/g, "\\'")}</p>";

    const barChart = createBarChart(latestVoteData);
    resultDiv.appendChild(barChart);

    addSummaryStatistics(resultDiv, latestVoteData);
}

function createBarChart(latestVoteData) {
    const barChart = document.createElement('div');
    barChart.className = 'bar-chart';

    const maxCount = Math.max(...Object.values(latestVoteData));
    const scale = maxCount > 0 ? 200 / maxCount : 1;
    const sortedEntries = Object.entries(latestVoteData).sort((a, b) => b[1] - a[1]);

    for (const [option, count] of sortedEntries) {
        const barContainer = document.createElement('div');
        barContainer.className = 'bar-container';

        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = '2px';

        requestAnimationFrame(() => {
            bar.style.height = \`\${Math.max(count * scale, 2)}px\`;
        });

        if (count === maxCount && count > 0) {
            bar.style.background = 'linear-gradient(to top, #ff6b35, #ffb199)';
        }

        const barLabel = document.createElement('div');
        barLabel.className = 'bar-label';
        barLabel.innerText = \`\${count}\`;

        const optionLabel = document.createElement('div');
        optionLabel.className = 'jet-label';
        optionLabel.innerText = option.split(' ')[0];

        barContainer.appendChild(bar);
        barContainer.appendChild(barLabel);
        barContainer.appendChild(optionLabel);
        barChart.appendChild(barContainer);
    }

    return barChart;
}

function addSummaryStatistics(container, latestVoteData) {
    const total = Object.values(latestVoteData).reduce((sum, count) => sum + count, 0);

    const statsDiv = document.createElement('div');
    statsDiv.style.cssText = 'text-align:center; margin-top:20px; padding-top:15px; border-top:1px dashed #bdc3c7;';

    const totalVotes = document.createElement('p');
    totalVotes.style.fontWeight = 'bold';
    totalVotes.innerText = \`总参与人数: \${total}\`;

    const timestamp = document.createElement('p');
    timestamp.style.cssText = 'font-size: 12px; color: #95a5a6; margin-top: 5px;';
    timestamp.innerText = \`最后更新: \${new Date().toLocaleString()}\`;

    statsDiv.appendChild(totalVotes);
    statsDiv.appendChild(timestamp);
    container.appendChild(statsDiv);
}

function jumpToIndex() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({ url: '/pages/index/index' });
    } else {
        window.location.href = '/';
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
`;
}

/**
 * Create an apps-metadata.json entry from scaffold input.
 *
 * @param {object} spec Scaffold input.
 * @returns {object} Metadata entry.
 */
export function createMetadataEntry(spec) {
    const source = spec && typeof spec === 'object' ? spec : {};
    const appId = typeof source.appId === 'string' && source.appId.trim() ? source.appId.trim() : 'new-app';
    const appName = typeof source.appName === 'string' && source.appName.trim() ? source.appName.trim() : '新投票应用';
    const description = typeof source.description === 'string' && source.description.trim()
        ? source.description.trim()
        : typeof source.question === 'string' && source.question.trim()
            ? source.question.trim()
            : '新的投票互动应用';

    const tags = normalizeStringArray(source.tags);
    if (!tags.includes('投票')) {
        tags.unshift('投票');
    }

    return {
        id: appId,
        name: appName,
        description,
        category: typeof source.category === 'string' && source.category.trim() ? source.category.trim() : '娱乐',
        directory: appId,
        url: appId,
        image: typeof source.coverImage === 'string' && source.coverImage.trim()
            ? source.coverImage.trim()
            : `${appId}/images/cover.jpg`,
        tags,
        status: 'active'
    };
}

/**
 * Validate that a scaffold plan looks complete enough for automation.
 *
 * @param {object} plan Scaffold plan.
 * @returns {{ valid: boolean, errors: string[] }} Validation result.
 */
export function validateScaffoldPlan(plan) {
    const files = plan && typeof plan === 'object' && plan.files ? plan.files : {};
    const indexHtml = typeof files.indexHtml === 'string' ? files.indexHtml : '';
    const appJs = typeof files.appJs === 'string' ? files.appJs : '';
    const assets = files.generatedAssets && typeof files.generatedAssets === 'object' ? files.generatedAssets : {};
    const optionCount = Array.isArray(plan?.questionConfig?.options) ? plan.questionConfig.options.length : 0;
    const imageRefs = Array.from(indexHtml.matchAll(/<img\s+src="images\/([^"]+)"/g)).map(match => match[1]);
    const errors = [];

    const imageCount = (indexHtml.match(/<img\s+src="images\//g) || []).length;
    if (optionCount > 0 && imageCount < optionCount) {
        errors.push('Not every option has a local image block in index.html');
    }
    if (!indexHtml.includes('id="showResultBtn"')) {
        errors.push('Missing result button in index.html');
    }
    if (!appJs.includes('function displayResults()')) {
        errors.push('Missing displayResults() in app.js');
    }
    if (!appJs.includes('function showResult(')) {
        errors.push('Missing showResult() in app.js');
    }
    if (!appJs.includes("document.addEventListener('DOMContentLoaded', initializeApp)")) {
        errors.push('Missing initializeApp bootstrap in app.js');
    }
    if (imageRefs.some(image => image.endsWith('.svg')) && Object.keys(assets).length === 0) {
        errors.push('No generated placeholder assets provided for SVG image refs');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Build a concrete scaffold plan using upstream brand/topic inputs.
 *
 * @param {object} spec Scaffold input.
 * @returns {object} Concrete scaffold outputs and checklist.
 */
export function buildScaffoldPlan(spec) {
    const source = spec && typeof spec === 'object' ? spec : {};
    const topicBrief = source.topicBrief && typeof source.topicBrief === 'object' ? source.topicBrief : {};
    const brandProfile = source.brandProfile && typeof source.brandProfile === 'object' ? source.brandProfile : {};
    const title = typeof source.title === 'string' && source.title.trim()
        ? source.title.trim()
        : typeof topicBrief.title === 'string' && topicBrief.title.trim()
            ? topicBrief.title.trim()
            : '新的投票话题';
    const question = typeof source.question === 'string' && source.question.trim()
        ? source.question.trim()
        : typeof topicBrief.question === 'string' && topicBrief.question.trim()
            ? topicBrief.question.trim()
            : '你会把这一票投给谁？';
    const normalizedOptions = Array.isArray(source.options) ? source.options.map(normalizeOption) : [];
    const metadataEntry = createMetadataEntry({
        ...source,
        description: source.description || question,
        question,
        tags: normalizeStringArray(source.tags).concat(normalizeStringArray(topicBrief.keywords || []))
    });

    const snippetSpec = {
        ...source,
        appId: metadataEntry.id,
        title,
        question,
        options: normalizedOptions
    };

    const plan = {
        templateDir: 'fighter-jets',
        outputDir: metadataEntry.directory,
        profileId: typeof brandProfile.id === 'string' ? brandProfile.id : null,
        questionConfig: createQuestionConfig(snippetSpec),
        metadataEntry,
        files: {
            appJsQuestionConfig: renderQuestionConfigSnippet(snippetSpec),
            indexOptionsMarkup: renderOptionMarkup(normalizedOptions, source.inputName),
            metadataJsonEntry: JSON.stringify(metadataEntry, null, 2),
            indexHtml: renderFullIndexHtml({
                ...source,
                title,
                question,
                options: normalizedOptions
            }),
            appJs: renderFullAppJs({
                ...source,
                appId: metadataEntry.id,
                appName: metadataEntry.name,
                title,
                question,
                options: normalizedOptions
            }),
            generatedAssets: buildPlaceholderAssets(normalizedOptions)
        },
        checklist: [
            `复制 fighter-jets 到 ${metadataEntry.directory}/`,
            '直接使用 scaffold 生成的完整 index.html / app.js，避免只改半套模板',
            '保留或复制 fighter-jets/styles.css 作为默认样式',
            '写入 generatedAssets 中的本地占位图，直到替换成正式图片素材',
            '运行 node scripts/validate-voting-app.js <app-directory> 做完整性校验',
            '在 apps-metadata.json 中注册新应用',
            '部署后验证线上链接、图片加载和投票结果显示'
        ]
    };

    return {
        ...plan,
        validation: validateScaffoldPlan(plan)
    };
}
