import { describe, expect, it } from '@jest/globals';

import {
    resolveAuthFilePath,
    isSubmissionErrorSignal,
    isSubmissionSuccessSignal
} from './scripts/publish-kuaishou-task-utils.js';

describe('publish-kuaishou-task success detection', () => {
    it('treats url changes as successful submission', () => {
        expect(
            isSubmissionSuccessSignal({
                currentUrl: 'https://daren.kuaishou.com/distribution-plan/list',
                baseUrl: 'https://daren.kuaishou.com/distribution-plan-create/recreate/165805',
                messageText: ''
            })
        ).toBe(true);
    });

    it('treats success toast messages as successful submission', () => {
        expect(
            isSubmissionSuccessSignal({
                currentUrl: 'https://daren.kuaishou.com/distribution-plan-create/recreate/165805',
                baseUrl: 'https://daren.kuaishou.com/distribution-plan-create/recreate/165805',
                messageText: '发布成功'
            })
        ).toBe(true);
    });

    it('does not report success for unchanged url without success text', () => {
        expect(
            isSubmissionSuccessSignal({
                currentUrl: 'https://daren.kuaishou.com/distribution-plan-create/recreate/165805',
                baseUrl: 'https://daren.kuaishou.com/distribution-plan-create/recreate/165805',
                messageText: ''
            })
        ).toBe(false);
    });

    it('detects validation and submission error messages', () => {
        expect(isSubmissionErrorSignal('请选择任务时间')).toBe(true);
        expect(isSubmissionErrorSignal('发布失败，请稍后重试')).toBe(true);
        expect(isSubmissionErrorSignal('发布成功')).toBe(false);
    });

    it('allows auth state to be stored outside the temporary worktree', () => {
        expect(resolveAuthFilePath('/tmp/shared-kuaishou-auth.json')).toBe('/tmp/shared-kuaishou-auth.json');
        expect(resolveAuthFilePath('')).toBe('kuaishou_auth.json');
    });
});
