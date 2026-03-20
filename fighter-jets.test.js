import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Fighter Jets Page', () => {
    let appJsContent;
    let htmlContent;

    beforeAll(() => {
        appJsContent = fs.readFileSync(path.join(__dirname, 'fighter-jets/app.js'), 'utf8');
        htmlContent = fs.readFileSync(path.join(__dirname, 'fighter-jets/index.html'), 'utf8');
    });

    test('Configuration should have correct title and options', () => {
        const configMatch = appJsContent.match(/const questionConfig = ({[\s\S]*?});/);
        expect(configMatch).not.toBeNull();
        
        const configStr = configMatch[1];
        expect(configStr).toContain('全球战力：谁是现代空战之王？');
        expect(configStr).toContain('fighter_jets_v1.data');
        
        expect(configStr).toContain('F-22 猛禽');
        expect(configStr).toContain('J-20 威龙');
        expect(configStr).toContain('Su-57 恶棍');
        expect(configStr).toContain('F-35 闪电II');
        expect(configStr).toContain('阵风');
    });

    test('HTML should contain correct elements', () => {
        expect(htmlContent).toContain('<title>全球战力：谁是现代空战之王？</title>');
        expect(htmlContent).toContain('id="pageTitle">全球战力：谁是现代空战之王？</h1>');
        
        const optionMatches = htmlContent.match(/class="option"/g);
        expect(optionMatches.length).toBe(5);
        
        expect(htmlContent).toContain('value="f22"');
        expect(htmlContent).toContain('value="j20"');
        expect(htmlContent).toContain('value="su57"');
        expect(htmlContent).toContain('value="f35"');
        expect(htmlContent).toContain('value="rafale"');
    });

    test('Styles file should exist', () => {
        const stylesPath = path.join(__dirname, 'fighter-jets/styles.css');
        expect(fs.existsSync(stylesPath)).toBe(true);
    });
    
    test('App metadata should include fighter-jets', () => {
        const metadataPath = path.join(__dirname, 'fighter-jets', 'metadata.json');
        const app = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

        expect(app).toBeDefined();
        expect(app.name).toBe('空战之王');
        expect(app.category).toBe('军事');
    });
});
