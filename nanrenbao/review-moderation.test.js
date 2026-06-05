/**
 * Regression tests for nanrenbao review workflow.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('Nanrenbao review moderation workflow', () => {
  it('should add review columns to the schema', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./nanrenbao/database-schema.sql', 'utf8');

    expect(content).toContain('review_status');
    expect(content).toContain('review_reason');
    expect(content).toContain('reviewed_at');
    expect(content).toContain('reviewed_by');
    expect(content).toContain('source_type');
    expect(content).toContain('submitted_at');
    expect(content).toContain('idx_review_deleted');
  });

  it('should provide a dedicated migration file for review fields', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./nanrenbao/migrate-add-review-status.sql', 'utf8');

    expect(content).toContain('ALTER TABLE beauty_images');
    expect(content).toContain('ADD COLUMN review_status');
    expect(content).toContain('UPDATE beauty_images');
    expect(content).toContain('submitted_at = created_at');
  });

  it('should restrict public appreciate queries to approved images', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');

    expect(content).toContain("review_status = ?");
    expect(content).toContain("params: ['approved']");
    expect(content).toContain('内容安全审核中');
  });

  it('should restrict top10 queries to approved images', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./nanrenbao/top10.html', 'utf8');

    expect(content).toContain("review_status = ?");
    expect(content).toContain("params: ['approved']");
    expect(content).toContain('榜单暂未开放展示');
  });

  it('should add moderation filters and actions to admin panel', () => {
    const fs = require('fs');
    const html = fs.readFileSync('./nanrenbao/admin.html', 'utf8');
    const js = fs.readFileSync('./nanrenbao/admin.js', 'utf8');

    expect(html).toContain('仅显示待审核');
    expect(html).toContain('仅显示已通过');
    expect(html).toContain('仅显示已驳回');
    expect(html).toContain('bulkApproveBtn');
    expect(html).toContain('bulkRejectBtn');
    expect(js).toContain('updateReviewStatus');
    expect(js).toContain("data-action=\"approve\"");
    expect(js).toContain("data-action=\"reject\"");
    expect(js).toContain("review_status = 'approved'");
  });

  it('should prepare future upload submissions as pending review without immediate points', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');

    expect(content).toContain('REVIEW_PENDING_STATUS');
    expect(content).toContain('sourceType');
    expect(content).toContain('review_status, submitted_at, source_type');
    expect(content).toContain('图片已进入审核队列');
    expect(content).not.toContain('PointsSystem.awardUploadPoints()');
  });
});
