export const DEFAULT_HOT_TASK_APP = {
    appId: 'parent-chat-teen',
    pageTitle: '青春期聊天技巧',
    appTitle: '家长话题：如何跟青春期孩子聊天更有效',
    appUrl: 'https://letmetryai.cn/parent-chat-teen/',
    recipientEmail: 'jackandking@163.com'
};

function parseHotTaskAppOverrides(rawValue = process.env.HOT_TASK_APP_JSON) {
    if (!rawValue) {
        return {};
    }

    let parsedValue;
    try {
        parsedValue = JSON.parse(rawValue);
    } catch (error) {
        throw new Error(`Invalid HOT_TASK_APP_JSON: ${(error && error.message) || String(error)}`);
    }

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
        throw new Error('HOT_TASK_APP_JSON must be a JSON object');
    }

    return parsedValue;
}

export function buildHotTaskApp(overrides = {}) {
    return {
        ...DEFAULT_HOT_TASK_APP,
        ...parseHotTaskAppOverrides(),
        ...overrides
    };
}

export const HOT_TASK_APP = buildHotTaskApp();

export const VIDEO_CAPTURE = {
    viewportWidth: 360,
    viewportHeight: 640,
    recordWidth: 360,
    recordHeight: 640,
    outputWidth: 1080,
    outputHeight: 1920,
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; KUAISHOU) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36'
};

export function buildArtifactBaseName(app = HOT_TASK_APP) {
    return `${app.appId}-kuaishou-hot-task-video`;
}

export function buildEmailSubject(app = HOT_TASK_APP) {
    return `热门任务视频 - ${app.pageTitle}`;
}

export function buildNarrationLines(app = HOT_TASK_APP) {
    return [
        `${app.pageTitle}，是快手最近涨得很快的热门任务演示。`,
        '这个主题聚焦家长和青春期孩子的沟通方式，页面里有四种常见选项。',
        '开放式问题、给空间不逼问、固定聊天时间、还有用兴趣切入，都很适合拍成讨论类视频。',
        '如果你也想试试这个任务，可以先按本视频的主题去找对应的星火计划任务。',
        '不妨点一下左下角链接，先试试广告效果；如果视频内容合适，就可以挂载这个星火计划任务，广告收入90%分成给视频作者。'
    ];
}

export function buildOverlayLines(app = HOT_TASK_APP) {
    return [
        '试试左下角链接的广告效果',
        '可按本视频主题找到对应星火任务',
        '挂载此星火计划任务，广告收入90%分成给作者'
    ];
}

export function buildEmailBody(app = HOT_TASK_APP) {
    return [
        `热门任务视频已生成：${app.pageTitle}`,
        '',
        `页面标题：${app.appTitle}`,
        `实际体验入口：${app.appUrl}`,
        '',
        '说明：',
        '1. 这是最近涨得很快的热门任务演示视频。',
        '2. 这版使用真实线上页面录制，不再使用 localhost 截图。',
        '3. 这版按移动端 WebView 视图录制，尽量贴近快手小程序里的真实效果。',
        '4. 视频文案已改为引导用户点击左下角链接体验广告效果。',
        `5. 如有合适视频作品，可挂载此星火计划任务，广告收入90%分成给视频作者。`
    ].join('\n');
}
