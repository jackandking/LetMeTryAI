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
        : `${value}.jpg`;

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
        .map(option => `        { value: "${option.value}", label: "${option.label}" }`)
        .join(',\n');

    return [
        'const questionConfig = {',
        `    title: "${config.title}",`,
        `    question: "${config.question}",`,
        '    options: [',
        optionsLines,
        '    ],',
        `    storageKey: "${config.storageKey}"`,
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
            `                    <input type="radio" name="${safeInputName}" value="${option.value}">`,
            `                    <img src="images/${option.image}" alt="${option.alt}" loading="lazy">`,
            `                    <span>${option.caption}</span>`,
            '                </label>'
        ].join('\n'))
        .join('\n\n');
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
    const metadataEntry = createMetadataEntry({
        ...source,
        description: source.description || question,
        question,
        tags: normalizeStringArray(source.tags).concat(normalizeStringArray(topicBrief.keywords || []))
    });

    const snippetSpec = {
        appId: metadataEntry.id,
        title,
        question,
        options: source.options
    };

    return {
        templateDir: 'fighter-jets',
        outputDir: metadataEntry.directory,
        profileId: typeof brandProfile.id === 'string' ? brandProfile.id : null,
        metadataEntry,
        files: {
            appJsQuestionConfig: renderQuestionConfigSnippet(snippetSpec),
            indexOptionsMarkup: renderOptionMarkup(source.options, source.inputName),
            metadataJsonEntry: JSON.stringify(metadataEntry, null, 2)
        },
        checklist: [
            `复制 fighter-jets 到 ${metadataEntry.directory}/`,
            '替换 app.js 中的 questionConfig',
            '替换 index.html 中的选项区块并本地化图片',
            '在 apps-metadata.json 中注册新应用',
            '部署后验证线上链接和图片加载'
        ]
    };
}
