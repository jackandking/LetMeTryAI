/**
 * Tests for nanrenbao appreciate page with blur effect and modal
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('Nanrenbao Appreciate Page - Blur and Modal Feature', () => {
  describe('Image Blur Effect', () => {
    it('should have blur overlay on images', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      
      // Check that blur-overlay class is present in the code
      expect(html).toContain('blur-overlay');
      expect(html).toContain('backdrop-filter: blur(20px)');
    });

    it('should have "点击查看" text in overlay', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('点击查看');
    });

    it('should apply blur to bottom 50% of image', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      
      // Check that overlay covers 50% height from bottom
      expect(html).toContain('height: 50%');
      expect(html).toContain('bottom: 0');
    });
  });

  describe('Image Wrapper Structure', () => {
    it('should wrap images in image-wrapper div', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('image-wrapper');
      expect(html).toContain('imageWrapper.className = \'image-wrapper\'');
    });

    it('should add blur overlay to image wrapper', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('imageWrapper.appendChild(img)');
      expect(html).toContain('imageWrapper.appendChild(blurOverlay)');
    });
  });

  describe('Modal Functionality', () => {
    it('should have modal HTML structure', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      
      expect(html).toContain('<div id="imageModal" class="modal" style="display:none;">');
      expect(html).toContain('fullImageModal');
      expect(html).toContain('modal-close');
      expect(html).toContain('fullImageModalImg');
    });

    it('should have showModal function', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('function showFullImage(url)');
      expect(html).toContain('fullModal.style.display = \'flex\'');
      expect(html).toContain('fullImg.src = url');
    });

    it('should have closeModal function', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('function hideFullImage()');
      expect(html).toContain('fullModal.style.display = \'none\'');
    });

    it('should prevent body scrolling when modal is open', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('document.body.style.overflow = \'hidden\'');
      expect(html).toContain('document.body.style.overflow = \'\'');
    });
  });

  describe('Modal Interaction', () => {
    it('should attach click handler to gallery items', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('div.onclick = function()');
      expect(html).toContain('showModal(imageUrl, sourceImageUrl)');
    });

    it('should close modal on close button click', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('onclick="hideFullImage()"');
    });

    it('should close modal when clicking outside image', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('class="full-image-modal" onclick="hideFullImage()"');
    });

    it('should close modal with Escape key', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('document.addEventListener(\'keydown\'');
      expect(html).toContain('event.key === \'Escape\'');
    });
  });

  describe('Modal Styling', () => {
    it('should have modal overlay with dark background', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('background-color: rgba(0, 0, 0, 0.9)');
      expect(html).toContain('position: fixed');
      expect(html).toContain('z-index: 1000');
    });

    it('should have fade-in animation', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('animation: fadeIn 0.3s');
      expect(html).toContain('@keyframes fadeIn');
    });

    it('should have zoom-in animation for image', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('animation: zoomIn 0.3s');
      expect(html).toContain('@keyframes zoomIn');
    });

    it('should center modal content', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('top: 50%');
      expect(html).toContain('transform: translateY(-50%)');
    });
  });

  describe('Responsive Design', () => {
    it('should adjust image wrapper height on mobile', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('@media (max-width: 768px)');
      expect(html).toContain('.gallery-item .image-wrapper');
      expect(html).toContain('height: 200px');
    });

    it('should adjust modal close button on mobile', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      const mediaQuerySection = html.match(/@media \(max-width: 768px\)[\s\S]*?}/);
      expect(mediaQuerySection).toBeTruthy();
      expect(html).toContain('.modal-close');
    });
  });

  describe('Gallery Item Cursor', () => {
    it('should have pointer cursor on gallery items', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('cursor: pointer');
    });
  });

  describe('Backward Compatibility', () => {
    it('should still load images from database', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('async function loadImages()');
      expect(html).toContain('window.API_ENDPOINTS.MYSQL_QUERY');
      expect(html).toContain("SELECT id, image_url, view_count, coverage_pct, created_at FROM beauty_images WHERE deleted = 0 AND review_status = ?");
    });

    it('should handle image load errors', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('img.onerror = function()');
      expect(html).toContain('div.style.display = \'none\'');
    });

    it('should maintain existing gallery grid layout', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('display: grid');
      expect(html).toContain('grid-template-columns');
    });
  });

  // 后宫门禁（2026-10-20）：遮蔽度 coverage_pct < 50 的图仅对已激活「后宫」的用户展示。
  // 规则只作用于欣赏美女页；快手落地页(beauty-scratch.html)与刮刮乐(scratch-lottery.html)不过滤。
  describe('Harem Coverage Gate', () => {
    it('should select coverage_pct from beauty_images', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('coverage_pct');
      expect(html).toContain('SELECT id, image_url, view_count, coverage_pct, created_at FROM beauty_images');
    });

    it('should gate images by harem activation state', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('window.isHaremActivated && window.isHaremActivated()');
    });

    it('should hide images with coverage below 50 for non-harem users', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('item.coverage_pct == null || Number(item.coverage_pct) >= 50');
    });

    it('should keep unknown coverage (NULL) visible for everyone', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      // NULL（如 legacy 存量投稿）不拦截：过滤条件里 coverage_pct == null 一律放行
      expect(html).toContain('coverage_pct == null ||');
    });

    it('should have harem gate notice element', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('id="harem-gate-notice"');
      expect(html).toContain('id="harem-gate-text"');
      expect(html).toContain('href="harem.html"');
    });

    it('should show notice with hidden count when images are gated', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('已为你隐藏');
      expect(html).toContain('notice.style.display = \'block\'');
    });

    it('should document that kuaishou and scratch pages are unaffected', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('快手任务落地页(beauty-scratch)与');
      expect(html).toContain('刮刮乐(scratch-lottery)不做过滤');
    });
  });
});
