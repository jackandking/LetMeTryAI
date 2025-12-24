/**
 * Tests for nanrenbao appreciate page with blur effect and modal
 */

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
      
      expect(html).toContain('<div id="imageModal" class="modal">');
      expect(html).toContain('modal-close');
      expect(html).toContain('modal-content');
    });

    it('should have showModal function', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('function showModal(imageUrl)');
      expect(html).toContain('modal.style.display = \'block\'');
      expect(html).toContain('modalImg.src = imageUrl');
    });

    it('should have closeModal function', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('function closeModal()');
      expect(html).toContain('modal.style.display = \'none\'');
    });

    it('should prevent body scrolling when modal is open', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('document.body.style.overflow = \'hidden\'');
      expect(html).toContain('document.body.style.overflow = \'auto\'');
    });
  });

  describe('Modal Interaction', () => {
    it('should attach click handler to gallery items', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('div.onclick = function()');
      expect(html).toContain('showModal(item.image_url)');
    });

    it('should close modal on close button click', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('closeBtn.onclick = closeModal');
    });

    it('should close modal when clicking outside image', () => {
      const html = require('fs').readFileSync('./nanrenbao/appreciate.html', 'utf8');
      expect(html).toContain('modal.onclick = function(event)');
      expect(html).toContain('event.target === modal');
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
      expect(html).toContain('SELECT id, image_url, created_at FROM beauty_images');
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
});
