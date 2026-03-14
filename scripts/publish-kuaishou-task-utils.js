export const SUCCESS_MESSAGE_PATTERN = /(成功|已发布|已提交|创建成功|发布成功)/;
export const ERROR_MESSAGE_PATTERN = /(失败|错误|请选择|请填写|不能为空|未通过|异常)/;

export function isSubmissionSuccessSignal({ currentUrl, baseUrl, messageText = '' }) {
    const normalizedMessage = typeof messageText === 'string' ? messageText.trim() : '';
    return (typeof currentUrl === 'string' && currentUrl !== baseUrl) || SUCCESS_MESSAGE_PATTERN.test(normalizedMessage);
}

export function isSubmissionErrorSignal(messageText = '') {
    return ERROR_MESSAGE_PATTERN.test(typeof messageText === 'string' ? messageText.trim() : '');
}

export function resolveAuthFilePath(authFile = process.env.KUAISHOU_AUTH_FILE) {
    return typeof authFile === 'string' && authFile.trim() ? authFile.trim() : 'kuaishou_auth.json';
}
