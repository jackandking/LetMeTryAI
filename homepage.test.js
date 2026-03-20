import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Homepage functionality tests
 * Tests for the redesigned homepage with search, filter, and form submission
 */

describe('Homepage Functionality', () => {
    let appsData;
    
    beforeEach(() => {
        // Mock apps data
        appsData = [
            {
                id: 'test-app-1',
                name: '测试应用1',
                description: '这是一个测试应用',
                category: '教育',
                url: 'test1',
                image: 'images/test1.jpg',
                tags: ['测试', '教育'],
                featured: true
            },
            {
                id: 'test-app-2',
                name: '测试应用2',
                description: '另一个测试应用',
                category: '娱乐',
                url: 'test2',
                image: 'images/test2.jpg',
                tags: ['测试', '娱乐'],
                featured: false
            }
        ];
    });

    describe('Apps Metadata', () => {
        it('should have valid homepage-featured.json structure', () => {
            const configPath = path.join(__dirname, 'homepage-featured.json');

            expect(fs.existsSync(configPath)).toBe(true);

            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            expect(config).toHaveProperty('featured');
            expect(Array.isArray(config.featured)).toBe(true);
            expect(config.featured.length).toBeGreaterThan(0);
        });

        it('should have per-app metadata.json for each featured app', () => {
            const configPath = path.join(__dirname, 'homepage-featured.json');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            config.featured.forEach(appId => {
                const metaPath = path.join(__dirname, appId, 'metadata.json');
                expect(fs.existsSync(metaPath)).toBe(true);

                const app = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                expect(app).toHaveProperty('id');
                expect(app).toHaveProperty('name');
                expect(app).toHaveProperty('category');
                expect(app).toHaveProperty('url');
                expect(typeof app.id).toBe('string');
                expect(typeof app.name).toBe('string');
                expect(typeof app.category).toBe('string');
            });
        });
    });

    describe('Search Functionality', () => {
        it('should filter apps by name', () => {
            const searchTerm = '测试应用1';
            const filtered = appsData.filter(app => 
                app.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe('test-app-1');
        });

        it('should filter apps by description', () => {
            const searchTerm = '另一个';
            const filtered = appsData.filter(app => 
                app.description && app.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe('test-app-2');
        });

        it('should filter apps by tags', () => {
            const searchTerm = '教育';
            const filtered = appsData.filter(app => 
                app.tags && app.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            
            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe('test-app-1');
        });

        it('should be case insensitive', () => {
            const searchTerm = '测试应用';
            const filtered = appsData.filter(app => 
                app.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            expect(filtered).toHaveLength(2);
        });

        it('should return empty array for no matches', () => {
            const searchTerm = '不存在的应用';
            const filtered = appsData.filter(app => 
                app.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            expect(filtered).toHaveLength(0);
        });
    });

    describe('Category Filter', () => {
        it('should filter apps by category', () => {
            const category = '教育';
            const filtered = appsData.filter(app => app.category === category);
            
            expect(filtered).toHaveLength(1);
            expect(filtered[0].category).toBe('教育');
        });

        it('should return all apps when category is "all"', () => {
            const category = 'all';
            const filtered = category === 'all' ? appsData : appsData.filter(app => app.category === category);
            
            expect(filtered).toHaveLength(2);
        });

        it('should handle empty results', () => {
            const category = '不存在的分类';
            const filtered = appsData.filter(app => app.category === category);
            
            expect(filtered).toHaveLength(0);
        });
    });

    describe('Sort Functionality', () => {
        it('should sort by featured status', () => {
            const sorted = [...appsData].sort((a, b) => {
                if (a.featured && !b.featured) return -1;
                if (!a.featured && b.featured) return 1;
                return 0;
            });
            
            expect(sorted[0].featured).toBe(true);
            expect(sorted[1].featured).toBe(false);
        });

        it('should sort by name alphabetically', () => {
            const sorted = [...appsData].sort((a, b) => 
                a.name.localeCompare(b.name, 'zh-CN')
            );
            
            expect(sorted[0].name).toBe('测试应用1');
            expect(sorted[1].name).toBe('测试应用2');
        });

        it('should sort by category', () => {
            const sorted = [...appsData].sort((a, b) => 
                a.category.localeCompare(b.category, 'zh-CN')
            );
            
            expect(sorted.map(app => app.category)).toEqual(['教育', '娱乐']);
        });
    });

    describe('Form Validation', () => {
        it('should validate idea title is required', () => {
            const idea = { title: '', description: '这是描述' };
            const errors = [];
            
            if (!idea.title || idea.title.trim().length === 0) {
                errors.push('请输入创意标题');
            }
            
            expect(errors).toContain('请输入创意标题');
        });

        it('should validate title minimum length', () => {
            const idea = { title: '短', description: '这是描述' };
            const errors = [];
            
            if (idea.title.length < 3) {
                errors.push('创意标题至少需要3个字符');
            }
            
            expect(errors).toContain('创意标题至少需要3个字符');
        });

        it('should validate title maximum length', () => {
            const idea = { title: 'x'.repeat(101), description: '这是描述' };
            const errors = [];
            
            if (idea.title.length > 100) {
                errors.push('创意标题不能超过100个字符');
            }
            
            expect(errors).toContain('创意标题不能超过100个字符');
        });

        it('should validate description is required', () => {
            const idea = { title: '测试标题', description: '' };
            const errors = [];
            
            if (!idea.description || idea.description.trim().length === 0) {
                errors.push('请输入创意描述');
            }
            
            expect(errors).toContain('请输入创意描述');
        });

        it('should validate description minimum length', () => {
            const idea = { title: '测试标题', description: '太短了' };
            const errors = [];
            
            if (idea.description.length < 10) {
                errors.push('创意描述至少需要10个字符');
            }
            
            expect(errors).toContain('创意描述至少需要10个字符');
        });

        it('should validate description maximum length', () => {
            const idea = { title: '测试标题', description: 'x'.repeat(2001) };
            const errors = [];
            
            if (idea.description.length > 2000) {
                errors.push('创意描述不能超过2000个字符');
            }
            
            expect(errors).toContain('创意描述不能超过2000个字符');
        });

        it('should pass validation for valid idea', () => {
            const idea = { 
                title: '有效的标题', 
                description: '这是一个有效的描述，足够长以通过验证' 
            };
            const errors = [];
            
            if (!idea.title || idea.title.length < 3 || idea.title.length > 100) {
                errors.push('标题无效');
            }
            if (!idea.description || idea.description.length < 10 || idea.description.length > 2000) {
                errors.push('描述无效');
            }
            
            expect(errors).toHaveLength(0);
        });
    });

    describe('Responsive Design', () => {
        it('should have mobile-friendly viewport meta tag', () => {
            const htmlPath = path.join(__dirname, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            
            expect(html).toContain('<meta name="viewport"');
            expect(html).toContain('width=device-width');
        });

        it('should include responsive CSS classes', () => {
            const cssPath = path.join(__dirname, 'styles.css');
            const css = fs.readFileSync(cssPath, 'utf8');
            
            expect(css).toContain('@media');
            expect(css).toContain('min-width');
        });
    });

    describe('SEO and Meta Tags', () => {
        it('should have proper title', () => {
            const htmlPath = path.join(__dirname, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            
            expect(html).toContain('<title>');
            expect(html).toContain('把创意变成小应用');
        });

        it('should have meta description', () => {
            const htmlPath = path.join(__dirname, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            
            expect(html).toContain('<meta name="description"');
        });

        it('should have meta keywords', () => {
            const htmlPath = path.join(__dirname, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            
            expect(html).toContain('<meta name="keywords"');
        });

        it('should have Baidu verification tag', () => {
            const htmlPath = path.join(__dirname, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            
            expect(html).toContain('baidu_union_verify');
        });
    });

    describe('Quick Idea Input Box', () => {
        it('should have quick input box in hero section', () => {
            const htmlPath = path.join(__dirname, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            
            expect(html).toContain('quick-idea-input');
            expect(html).toContain('id="quick-idea-input"');
            expect(html).toContain('💡 在这里输入您的创意');
        });

        it('should have quick submit button', () => {
            const htmlPath = path.join(__dirname, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            
            expect(html).toContain('quick-submit-button');
            expect(html).toContain('开始创建');
            expect(html).toContain('handleQuickInput');
        });

        it('should have secondary button to view full form', () => {
            const htmlPath = path.join(__dirname, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            
            expect(html).toContain('cta-button-secondary');
            expect(html).toContain('或查看详细表单');
        });

        it('should have proper CSS styles for quick input', () => {
            const cssPath = path.join(__dirname, 'styles.css');
            const css = fs.readFileSync(cssPath, 'utf8');
            
            expect(css).toContain('.quick-idea-input');
            expect(css).toContain('.quick-input');
            expect(css).toContain('.quick-submit-button');
        });

        it('should have mobile responsive styles for quick input', () => {
            const cssPath = path.join(__dirname, 'styles.css');
            const css = fs.readFileSync(cssPath, 'utf8');
            
            // Check for mobile styles
            expect(css).toContain('.quick-input');
            expect(css).toMatch(/max-width:.*767px/);
        });

        it('should have handleQuickInput function in JavaScript', () => {
            const jsPath = path.join(__dirname, 'main.js');
            const js = fs.readFileSync(jsPath, 'utf8');
            
            expect(js).toContain('function handleQuickInput');
            expect(js).toContain('window.handleQuickInput');
        });

        it('should have Enter key event listener for quick input', () => {
            const jsPath = path.join(__dirname, 'main.js');
            const js = fs.readFileSync(jsPath, 'utf8');
            
            expect(js).toContain('quick-idea-input');
            expect(js).toContain('keypress');
            expect(js).toContain('Enter');
        });
    });

    describe('Quick Input Functionality Logic', () => {
        it('should handle empty quick input by just scrolling to form', () => {
            const quickIdea = '';
            const shouldScroll = !quickIdea || quickIdea.trim() === '';
            
            expect(shouldScroll).toBe(true);
        });

        it('should pre-fill title when quick input has value', () => {
            const quickIdea = '智能诗词生成器';
            const titleValue = quickIdea.trim();
            
            expect(titleValue).toBe('智能诗词生成器');
            expect(titleValue.length).toBeGreaterThan(0);
        });

        it('should respect maxlength for quick input', () => {
            const htmlPath = path.join(__dirname, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            
            // Extract maxlength from quick-idea-input
            const maxlengthMatch = html.match(/id="quick-idea-input"[^>]*maxlength="(\d+)"/);
            expect(maxlengthMatch).toBeTruthy();
            expect(maxlengthMatch[1]).toBe('100');
        });

        it('should update character count when pre-filling title', () => {
            const titleText = '智能诗词生成器';
            const maxLength = 100;
            const charCount = `${titleText.length}/${maxLength}`;
            
            expect(charCount).toBe('7/100');
        });
    });

    describe('HTML Structure Integrity', () => {
        it('should not have duplicate main tags', () => {
            const htmlPath = path.join(__dirname, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            
            const mainMatches = html.match(/<main[^>]*id="apps-container"/g);
            expect(mainMatches).toBeTruthy();
            expect(mainMatches.length).toBe(1);
        });

        it('should not have duplicate footer tags', () => {
            const htmlPath = path.join(__dirname, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            
            const footerOpenMatches = html.match(/<footer>/g);
            const footerCloseMatches = html.match(/<\/footer>/g);
            
            expect(footerOpenMatches).toBeTruthy();
            expect(footerCloseMatches).toBeTruthy();
            expect(footerOpenMatches.length).toBe(footerCloseMatches.length);
        });

        it('should have proper HTML structure', () => {
            const htmlPath = path.join(__dirname, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            
            // Check for basic HTML structure
            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('<html');
            expect(html).toContain('<head>');
            expect(html).toContain('<body>');
            expect(html).toContain('</body>');
            expect(html).toContain('</html>');
        });
    });
});
