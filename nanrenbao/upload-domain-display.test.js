/**
 * Tests for supported domain display in upload page
 */

describe('Upload Supported Domains Display', () => {
  describe('Error Message Enhancement', () => {
    it('should show supported domains in error message', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('支持的域名：');
      expect(content).toContain('supportedDomains');
    });

    it('should format domains list in error message', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('allowedDomains.map(domain =>');
      expect(content).toContain('domain.startsWith');
    });

    it('should prefix wildcard domains with asterisk', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('*${domain}');
    });

    it('should join domains with Chinese separator', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('.join(\'、\')');
    });
  });

  describe('UI Domain List Display', () => {
    it('should have allowed-domains section in HTML', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('<div class="allowed-domains">');
    });

    it('should display section title with emoji', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('📋 支持的图片来源：');
    });

    it('should list all supported domains', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      const supportedDomains = [
        'eb118-file.cdn.bcebos.com',
        '*.myqcloud.com',
        '*.byteimg.com',
        'letmetry.cloud',
        '*.qpic.cn'
      ];
      
      supportedDomains.forEach(domain => {
        expect(content).toContain(`<li>${domain}</li>`);
      });
    });

    it('should display domains in unordered list', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('<ul>');
      expect(content).toContain('</ul>');
    });
  });

  describe('CSS Styling', () => {
    it('should have allowed-domains CSS class', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('.allowed-domains {');
    });

    it('should style the heading', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('.allowed-domains h3 {');
    });

    it('should style the list', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('.allowed-domains ul {');
    });
  });

  describe('Domain List Position', () => {
    it('should display domain list between input and preview', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      const inputPos = content.indexOf('id="imageUrl"');
      const domainListPos = content.indexOf('class="allowed-domains"');
      const previewPos = content.indexOf('class="preview-area"');
      
      expect(domainListPos).toBeGreaterThan(inputPos);
      expect(previewPos).toBeGreaterThan(domainListPos);
    });
  });

  describe('Domain Consistency', () => {
    it('should match domains between JS array and HTML list', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // Extract JS domains
      const jsDomainsMatch = content.match(/const allowedDomains = \[([\s\S]*?)\];/);
      expect(jsDomainsMatch).toBeTruthy();
      
      const jsDomains = jsDomainsMatch[1]
        .split(',')
        .map(line => line.trim().replace(/['"]/g, ''))
        .filter(d => d.length > 0);
      
      // Check HTML contains all domains
      jsDomains.forEach(domain => {
        const displayDomain = domain.startsWith('.') ? `*${domain}` : domain;
        expect(content).toContain(`<li>${displayDomain}</li>`);
      });
    });
  });

  describe('Error Message Format', () => {
    it('should construct clear error message', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('不支持的图片来源。支持的域名：');
    });

    it('should include supportedDomains variable in error', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('${supportedDomains}');
    });
  });

  describe('Wildcard Domain Formatting', () => {
    it('should detect domains starting with dot', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('domain.startsWith(\'.\'') || 
             content.toContain('domain.startsWith(".")'));
    });

    it('should format wildcard domains correctly', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // Check HTML list has wildcard format
      expect(content).toContain('*.myqcloud.com');
      expect(content).toContain('*.byteimg.com');
      expect(content).toContain('*.qpic.cn');
    });
  });

  describe('User Experience', () => {
    it('should show domains before error occurs', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // Domain list should be visible in the form
      expect(content).toContain('<div class="allowed-domains">');
      expect(content).toContain('<h3>📋 支持的图片来源：</h3>');
    });

    it('should provide both proactive and reactive guidance', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // Proactive: domain list in form
      expect(content).toContain('class="allowed-domains"');
      
      // Reactive: domain list in error message
      expect(content).toContain('支持的域名：${supportedDomains}');
    });
  });

  describe('Backwards Compatibility', () => {
    it('should maintain HTTPS validation', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('仅支持HTTPS链接');
    });

    it('should maintain domain validation logic', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('isValidImageUrl');
      expect(content).toContain('const isAllowed = allowedDomains.some');
    });
  });
});
