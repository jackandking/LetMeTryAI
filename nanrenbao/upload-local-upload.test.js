/**
 * Tests for local photo upload feature in upload.html
 */
import { readFileSync } from 'fs';

const content = readFileSync('./nanrenbao/upload.html', 'utf8');

describe('Local Photo Upload Feature', () => {
  describe('HTML Elements', () => {
    it('should have a hidden file input for local image selection', () => {
      expect(content).toContain('type="file"');
      expect(content).toContain('id="localFileInput"');
      expect(content).toContain('accept="image/*"');
    });

    it('should have a file selection button', () => {
      expect(content).toContain('id="localFileBtn"');
      expect(content).toContain('选择本地图片');
    });

    it('should have a file name display element', () => {
      expect(content).toContain('id="localFileName"');
      expect(content).toContain('未选择文件');
    });

    it('should show a compression hint to the user', () => {
      expect(content).toContain('500KB');
      expect(content).toContain('compress-hint');
    });

    it('should show an OR divider between URL and local upload', () => {
      expect(content).toContain('upload-or-divider');
      expect(content).toContain('或者选择本地图片');
    });

    it('should make the URL input optional (no required attribute)', () => {
      const urlInputMatch = content.match(/id="imageUrl"[\s\S]*?>/);
      expect(urlInputMatch).toBeTruthy();
      expect(urlInputMatch[0]).not.toContain('required');
    });
  });

  describe('Image Compression Function', () => {
    it('should define a compressImageFile function', () => {
      expect(content).toContain('async function compressImageFile(');
    });

    it('should use 500KB as the max file size limit', () => {
      expect(content).toContain('500 * 1024');
    });

    it('should have a minimum quality floor', () => {
      expect(content).toContain('MIN_QUALITY');
      expect(content).toContain('0.3');
    });

    it('should reduce image dimensions for large images', () => {
      expect(content).toContain('maxWidth');
      expect(content).toContain('maxHeight');
      expect(content).toContain('ratio');
    });

    it('should output a JPEG file', () => {
      expect(content).toContain("'image/jpeg'");
    });

    it('should use a UUID for the compressed file name', () => {
      expect(content).toContain('generateUUID()');
      expect(content).toContain('.jpg');
    });
  });

  describe('UUID Generation', () => {
    it('should define a generateUUID function', () => {
      expect(content).toContain('function generateUUID()');
    });

    it('should prefer crypto.randomUUID when available', () => {
      expect(content).toContain('crypto.randomUUID');
    });

    it('should include a fallback UUID implementation', () => {
      expect(content).toContain('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');
    });
  });

  describe('Image API Upload', () => {
    it('should define an uploadFileToImageApi function', () => {
      expect(content).toContain('async function uploadFileToImageApi(');
    });

    it('should use the IMAGE_UPLOAD API endpoint', () => {
      expect(content).toContain('window.API_ENDPOINTS.IMAGE_UPLOAD');
    });

    it('should use FormData to send the file', () => {
      expect(content).toContain('new FormData()');
      expect(content).toContain("formData.append('file'");
    });

    it('should handle upload errors gracefully', () => {
      expect(content).toContain('上传请求失败');
    });
  });

  describe('URL Extraction from API Response', () => {
    it('should define an extractImageUrlFromResponse function', () => {
      expect(content).toContain('function extractImageUrlFromResponse(');
    });

    it('should extract url from json.url', () => {
      expect(content).toContain('json.url');
    });

    it('should extract url from json.path', () => {
      expect(content).toContain('json.path');
    });

    it('should extract url from nested json.data.url', () => {
      expect(content).toContain('json.data && json.data.url');
    });
  });

  describe('Submit Flow with Local File', () => {
    it('should show compression status during upload', () => {
      expect(content).toContain('压缩中...');
    });

    it('should show image upload status during upload', () => {
      expect(content).toContain('上传图片中...');
    });

    it('should validate that at least URL or local file is provided', () => {
      expect(content).toContain('请输入图片URL或选择本地图片');
    });

    it('should call compressImageFile before uploading local file', () => {
      const localUploadSection = content.match(/if \(localFile\)[\s\S]*?compressImageFile/);
      expect(localUploadSection).toBeTruthy();
    });

    it('should call uploadFileToImageApi after compression', () => {
      const uploadSection = content.match(/compressImageFile[\s\S]*?uploadFileToImageApi/);
      expect(uploadSection).toBeTruthy();
    });

    it('should call extractImageUrlFromResponse after API upload', () => {
      const extractSection = content.match(/uploadFileToImageApi[\s\S]*?extractImageUrlFromResponse/);
      expect(extractSection).toBeTruthy();
    });

    it('should show error when URL cannot be extracted from response', () => {
      expect(content).toContain('未能从服务器响应中获取图片URL');
    });

    it('should show an error message when local file upload fails', () => {
      expect(content).toContain('本地图片上传失败');
    });
  });

  describe('Mutual Exclusion of URL and Local File', () => {
    it('should clear URL input when a local file is selected', () => {
      expect(content).toContain("imageUrlInput.value = ''");
    });

    it('should clear local file when URL is typed', () => {
      expect(content).toContain('localFile = null');
    });
  });

  describe('Reset after Successful Upload', () => {
    it('should reset localFile state after successful upload', () => {
      const successSection = content.match(/result\.affectedRows > 0[\s\S]*?localFile = null/);
      expect(successSection).toBeTruthy();
    });

    it('should reset local file name display after successful upload', () => {
      const successSection = content.match(/localFile = null[\s\S]*?未选择文件/);
      expect(successSection).toBeTruthy();
    });
  });

  describe('Styles', () => {
    it('should have file-btn CSS class', () => {
      expect(content).toContain('.file-btn {');
    });

    it('should have file-upload-row CSS class', () => {
      expect(content).toContain('.file-upload-row {');
    });

    it('should have file-name CSS class', () => {
      expect(content).toContain('.file-name {');
    });

    it('should have upload-or-divider CSS class', () => {
      expect(content).toContain('.upload-or-divider {');
    });

    it('should have compress-hint CSS class', () => {
      expect(content).toContain('.compress-hint {');
    });
  });
});


