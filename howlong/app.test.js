import fs from 'node:fs';
import { describe, expect, it } from '@jest/globals';

describe('HowLong Application', () => {
    const appSource = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
    const htmlSource = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

    describe('Compliant copy update', () => {
        it('should use video dwell time title and question', () => {
            expect(appSource).toContain('title: "你会停留多久？"');
            expect(appSource).toContain('question: "刷到感兴趣的视频，你通常会停留多久？"');
            expect(htmlSource).toContain('<title>你会停留多久？</title>');
        });

        it('should remove explicit adult wording from app copy', () => {
            expect(appSource).not.toContain('啪啪');
            expect(appSource).not.toContain('美女');
            expect(htmlSource).not.toContain('美女');
        });
    });

    describe('Vote compatibility', () => {
        it('should preserve the five original duration buckets', () => {
            const optionLabels = [
                '10秒以下',
                '1分钟以上',
                '5分钟以上',
                '10分钟以上',
                '30分钟以上'
            ];

            optionLabels.forEach(label => {
                expect(appSource).toContain(`label: "${label}"`);
            });
        });

        it('should keep the published result page id stable', () => {
            expect(appSource).toContain('result_page_id=howlong');
        });

        it('should start a fresh vote dataset for the compliant topic', () => {
            expect(appSource).toContain('storageKey: "howlong2.data"');
            expect(appSource).not.toContain('storageKey: "howlong1.data"');
        });
    });

    describe('Result and CTA copy', () => {
        it('should present neutral result and navigation messaging', () => {
            expect(appSource).toContain('本页用户投票统计');
            expect(appSource).toContain('本页参与用户的累计投票统计');
            expect(htmlSource).toContain('快手男人宝小程序主页看更多精彩内容');
        });
    });
});
