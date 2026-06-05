/**
 * Tests for temporary shutdown of back-view-killer uploads.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('Back View Killer upload maintenance mode', () => {
  it('should disable the public upload form in back-view-killer-upload.html', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');

    expect(content).toContain('const UPLOAD_DISABLED = true');
    expect(content).toContain('UPLOAD_DISABLED_MESSAGE');
    expect(content).toContain('uploadForm.classList.add(\'is-disabled\')');
    expect(content).toContain('showPointsNotification(`⚠️ ${UPLOAD_DISABLED_MESSAGE}`)');
  });

  it('should replace the header upload link with maintenance text', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./nanrenbao/back-view-killer.html', 'utf8');

    expect(content).toContain('backviewUploadMaintenance');
    expect(content).toContain('上传维护中');
    expect(content).not.toContain('href="back-view-killer-upload.html"');
  });
});
