import path from 'path';

export const SUCCESS_MESSAGE_PATTERN = /(成功|已发布|已提交|创建成功|发布成功)/;
export const ERROR_MESSAGE_PATTERN = /(失败|错误|请选择|请填写|不能为空|未通过|异常)/;

// Kuaishou forbids exaggerated/clickbait words in task names — the AI cover button stays
// disabled when the name contains any of these, causing the entire publish flow to fail.
// Kuaishou also treats some English words as special symbols.
const FORBIDDEN_WORDS = ['最', '第一', '唯一', '极致', '绝对', '顶级', '史上', '全网', 'Pro'];

// Symbols that Kuaishou textCheck rejects as "special symbols"
const FORBIDDEN_SYMBOLS = /[·\-|/\\@#$%^&*()+=[\]{};:'"<>?~`]/;

export function sanitizeTaskName(name) {
    return name.replace(/[·\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function validateTaskName(name) {
    const foundWords = FORBIDDEN_WORDS.filter(w => name.includes(w));
    if (foundWords.length > 0) {
        return { valid: false, forbidden: foundWords, message: `任务名称含极限词 [${foundWords.join(', ')}]，快手会禁止AI封面生成。请修改后重试。` };
    }
    const foundSymbol = FORBIDDEN_SYMBOLS.test(name);
    if (foundSymbol) {
        return { valid: false, forbidden: [], message: `任务名称含特殊符号，快手会拒绝发布。请修改后重试。` };
    }
    return { valid: true, forbidden: [], message: '' };
}

export function isSubmissionSuccessSignal({ currentUrl, baseUrl, messageText = '' }) {
    const normalizedMessage = typeof messageText === 'string' ? messageText.trim() : '';
    return (typeof currentUrl === 'string' && currentUrl !== baseUrl) || SUCCESS_MESSAGE_PATTERN.test(normalizedMessage);
}

export function isSubmissionErrorSignal(messageText = '') {
    return ERROR_MESSAGE_PATTERN.test(typeof messageText === 'string' ? messageText.trim() : '');
}

export function resolveAuthFilePath(authFile = process.env.KUAISHOU_AUTH_FILE) {
    return typeof authFile === 'string' && authFile.trim()
        ? path.resolve(authFile.trim())
        : path.resolve(process.cwd(), '.harness', '.local', 'auth', 'kuaishou_auth.json');
}
