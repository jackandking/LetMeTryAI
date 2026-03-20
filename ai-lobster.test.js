import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AI Lobster Page', () => {
    let appJsContent;
    let htmlContent;

    beforeAll(() => {
        appJsContent = fs.readFileSync(path.join(__dirname, 'ai-lobster/app.js'), 'utf8');
        htmlContent = fs.readFileSync(path.join(__dirname, 'ai-lobster/index.html'), 'utf8');
    });

    test('Configuration should have correct title and options', () => {
        const configMatch = appJsContent.match(/const questionConfig = ({[\s\S]*?});/);
        expect(configMatch).not.toBeNull();

        const configStr = configMatch[1];
        expect(configStr).toContain('AI养龙虾，你买不买单？');
        expect(configStr).toContain('ai_lobster_v1.data');
        expect(configStr).toContain('智能提产派');
        expect(configStr).toContain('口感优先派');
        expect(configStr).toContain('只看价格派');
        expect(configStr).toContain('科技尝鲜派');
        expect(configStr).toContain('智商税警觉派');
    });

    test('HTML should contain correct elements', () => {
        expect(htmlContent).toContain('<title>AI养龙虾，你买不买单？</title>');
        expect(htmlContent).toContain('id="pageTitle">AI养龙虾，你买不买单？</h1>');

        const optionMatches = htmlContent.match(/class="option"/g);
        expect(optionMatches).toHaveLength(5);

        expect(htmlContent).toContain('value="yield"');
        expect(htmlContent).toContain('value="taste"');
        expect(htmlContent).toContain('value="price"');
        expect(htmlContent).toContain('value="future"');
        expect(htmlContent).toContain('value="skeptic"');
    });

    test('App should use lobster-specific wiring', () => {
        expect(appJsContent).toContain('input[name="lobster"]');
        expect(appJsContent).toContain('result_page_id=ai-lobster');
        expect(appJsContent).toContain('AI龙虾态度投票结果');
    });

    test('Styles and images should exist', () => {
        expect(fs.existsSync(path.join(__dirname, 'ai-lobster/styles.css'))).toBe(true);
        ['yield.svg', 'taste.svg', 'price.svg', 'future.svg', 'skeptic.svg'].forEach(file => {
            expect(fs.existsSync(path.join(__dirname, 'ai-lobster/images', file))).toBe(true);
        });
    });

    test('App metadata should include ai-lobster', () => {
        const metadataPath = path.join(__dirname, 'ai-lobster', 'metadata.json');
        const app = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

        expect(app).toBeDefined();
        expect(app.name).toBe('AI养龙虾');
        expect(app.category).toBe('科技');
        expect(app.url).toBe('ai-lobster');
    });
});
