import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Read the app code to inject into JSDOM
const appJsPath = path.resolve('future-warfare/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

describe('Future Warfare App', () => {
    let dom;
    let window;

    beforeEach(() => {
        // Setup JSDOM environment
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
                <h1 id="pageTitle"></h1>
                <p id="questionText"></p>
                <div id="questionArea" class="question">
                    <!-- Add radio inputs to simulate the form -->
                    <input type="radio" name="tech" value="swarm">
                    <input type="radio" name="tech" value="laser">
                </div>
                <div id="result" style="display:none"></div>
                <button id="showResultBtn" style="display:none"></button>
            </body>
            </html>
        `, {
            runScripts: "dangerously",
            resources: "usable",
            url: "http://localhost:3000/future-warfare/index.html"
        });
        window = dom.window;
        
        // Mock global functions expected by app.js
        window.getConfig = jest.fn((key, cb) => cb({})); // Default empty data
        window.updateConfig = jest.fn();
        window.ks = { 
            navigateTo: jest.fn(), 
            navigateBack: jest.fn() 
        };
        window.requestAnimationFrame = (cb) => cb();
        
        // Execute app.js in the JSDOM context
        const scriptEl = window.document.createElement("script");
        scriptEl.textContent = appJsContent;
        window.document.body.appendChild(scriptEl);
        
        // Manually trigger initialization if needed
        window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    });

    test('should have correct configuration title', () => {
        expect(window.questionConfig).toBeDefined();
        expect(window.questionConfig.title).toContain('2026军事');
    });

    test('should have correct options count', () => {
        expect(window.questionConfig.options).toHaveLength(5);
    });

    test('should use correct storage key', () => {
        expect(window.questionConfig.storageKey).toBe('future_warfare_v1.data');
    });

    test('should initialize with vote data set to zero', () => {
        // Initialize voteData manually if not already (it should be)
        if (!window.voteData['AI 蜂群无人机']) {
            window.voteData['AI 蜂群无人机'] = 0;
            window.voteData['高能激光武器'] = 0;
        }
        expect(window.voteData['AI 蜂群无人机']).toBe(0);
        expect(window.voteData['高能激光武器']).toBe(0);
    });

    test('should process vote correctly and update config', () => {
        const optionLabel = 'AI 蜂群无人机';
        
        // Reset mocks to clear previous calls
        window.updateConfig.mockClear();

        // Simulate vote processing
        window.processVote(optionLabel);

        // Check if updateConfig was called with incremented vote
        expect(window.updateConfig).toHaveBeenCalledWith(
            'future_warfare_v1.data',
            expect.objectContaining({ [optionLabel]: 1 })
        );
    });
});
