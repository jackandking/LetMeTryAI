import { describe, expect, it } from '@jest/globals';

import { validateVotingAppFiles } from './scripts/validate-voting-app.js';

describe('Voting app validator', () => {
    it('should accept a fighter-jets-grade bundle', () => {
        const result = validateVotingAppFiles({
            indexHtml: `
                <form id="questionnaire">
                    <label class="option">
                        <input type="radio" name="vote" value="a">
                        <img src="images/a.svg" alt="A" loading="lazy">
                    </label>
                </form>
                <div id="result"></div>
                <button id="showResultBtn"></button>
            `,
            appJs: `
                const questionConfig = { storageKey: 'demo_v1.data' };
                function initializeApp() {}
                function showAd() {}
                function displayResults() {}
                function showResult() {}
                document.addEventListener('DOMContentLoaded', initializeApp);
            `
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should reject incomplete bundles like the broken drone-delivery-vote output', () => {
        const result = validateVotingAppFiles({
            indexHtml: `
                <form id="questionnaire">
                    <label class="option">
                        <input type="radio" name="vote" value="a">
                        <span>Only text option</span>
                    </label>
                </form>
                <div id="result"></div>
            `,
            appJs: `
                const questionConfig = { storageKey: 'demo_v1.data' };
                document.addEventListener('DOMContentLoaded', function() {});
            `
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([
                expect.stringContaining('local image'),
                expect.stringContaining('showResultBtn'),
                expect.stringContaining('showAd()')
            ])
        );
    });
});
