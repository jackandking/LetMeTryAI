/**
 * Tests for temporary upload shutdown during compliance remediation.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('Upload maintenance mode', () => {
  it('should disable the public upload form in upload.html', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');

    expect(content).toContain('const UPLOAD_DISABLED = true');
    expect(content).toContain('UPLOAD_DISABLED_MESSAGE');
    expect(content).toContain('uploadFormCard.classList.add(\'is-disabled\')');
    expect(content).toContain('showMessage(UPLOAD_DISABLED_MESSAGE, \'error\')');
  });

  it('should show a maintenance notice on the upload page', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');

    expect(content).toContain('整改公告');
    expect(content).toContain('上传功能暂时关闭');
    expect(content).toContain('审核流程补齐后恢复开放');
  });

  it('should replace the homepage upload card with a maintenance card', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./nanrenbao/index.html', 'utf8');

    expect(content).toContain('upload-maintenance-card');
    expect(content).toContain('上传美女（维护中）');
    expect(content).toContain('上传入口暂时关闭');
    expect(content).not.toContain('<a href="upload.html">');
  });

  it('should stop advertising upload points on the appreciate page', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');

    expect(content).not.toContain('上传图片+10分/张');
    expect(content).toContain('看广告+3~10分');
    expect(content).toContain('看广告获取额外积分');
  });
});
