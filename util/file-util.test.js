// file-util.test.js
import { uploadFile, deleteFile, getFileInfo, listFiles, downloadFile } from './file-util';
import { API_ENDPOINTS } from './config';

// Mock fetch for testing
global.fetch = jest.fn();

describe('File Utility Functions', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('uploadFile', () => {
    it('should upload a file successfully with valid parameters', async () => {
      const mockResponse = { 
        ok: true, 
        json: async () => ({ success: true, url: 'https://example.com/file.jpg' }) 
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const fileObject = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const targetPath = '/valid/path/';

      const result = await uploadFile(fileObject, targetPath);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(API_ENDPOINTS.FILE_UPLOAD, {
        method: 'POST',
        body: expect.any(FormData)
      });

      expect(result).toEqual({ success: true, url: 'https://example.com/file.jpg' });
    });

    it('should use centralized API endpoint configuration', async () => {
      const mockResponse = { 
        ok: true, 
        json: async () => ({ success: true }) 
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const fileObject = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await uploadFile(fileObject);

      const fetchCall = fetch.mock.calls[0];
      expect(fetchCall[0]).toBe(API_ENDPOINTS.FILE_UPLOAD);
      expect(API_ENDPOINTS.FILE_UPLOAD).toContain('43.143.241.181');
      expect(API_ENDPOINTS.FILE_UPLOAD).toContain('/lws/file/upload');
    });

    it('should throw an error for invalid targetPath', async () => {
      const fileObject = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const targetPath = '/invalid/path/../';

      await expect(uploadFile(fileObject, targetPath)).rejects.toThrow('Invalid targetPath');
    });

    it('should throw an error for non-string targetPath', async () => {
      const fileObject = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const targetPath = 123;

      await expect(uploadFile(fileObject, targetPath)).rejects.toThrow('Invalid targetPath');
    });

    it('should upload a file successfully without targetPath', async () => {
      const mockResponse = { 
        ok: true, 
        json: async () => ({ success: true, url: 'https://example.com/file.jpg' }) 
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const fileObject = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      const result = await uploadFile(fileObject);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(API_ENDPOINTS.FILE_UPLOAD, {
        method: 'POST',
        body: expect.any(FormData)
      });

      expect(result).toEqual({ success: true, url: 'https://example.com/file.jpg' });
    });

    it('should handle HTTP error responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const fileObject = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expect(uploadFile(fileObject)).rejects.toThrow('HTTP error! status: 500 - Internal Server Error');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      const mockResponse = { 
        ok: true, 
        json: async () => ({ success: true, message: 'File deleted' }) 
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await deleteFile('test.jpg');

      expect(fetch).toHaveBeenCalledWith(API_ENDPOINTS.FILE_DELETE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: 'test.jpg' })
      });

      expect(result).toEqual({ success: true, message: 'File deleted' });
    });

    it('should use centralized configuration', async () => {
      const mockResponse = { ok: true, json: async () => ({}) };
      fetch.mockResolvedValueOnce(mockResponse);

      await deleteFile('test.jpg');

      const fetchCall = fetch.mock.calls[0];
      expect(fetchCall[0]).toBe(API_ENDPOINTS.FILE_DELETE);
      expect(API_ENDPOINTS.FILE_DELETE).toContain('/lws/file/delete');
    });
  });

  describe('getFileInfo', () => {
    it('should get file info successfully', async () => {
      const mockResponse = { 
        ok: true, 
        json: async () => ({ name: 'test.jpg', size: 1024 }) 
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await getFileInfo('test.jpg');

      expect(fetch).toHaveBeenCalledWith(`${API_ENDPOINTS.FILE_INFO}/test.jpg`);
      expect(result).toEqual({ name: 'test.jpg', size: 1024 });
    });
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      const mockFiles = [
        { name: 'file1.jpg', size: 1024 },
        { name: 'file2.png', size: 2048 }
      ];
      const mockResponse = { 
        ok: true, 
        json: async () => mockFiles 
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await listFiles();

      expect(fetch).toHaveBeenCalledWith(API_ENDPOINTS.FILE_LIST);
      expect(result).toEqual(mockFiles);
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockBlob = new Blob(['file content'], { type: 'image/jpeg' });
      const mockResponse = { 
        ok: true, 
        blob: async () => mockBlob 
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await downloadFile('test.jpg');

      expect(fetch).toHaveBeenCalledWith(`${API_ENDPOINTS.FILE_DOWNLOAD}/test.jpg`);
      expect(result).toBe(mockBlob);
    });
  });

  describe('Configuration Integration', () => {
    it('should not use hardcoded URLs', () => {
      // Verify that all functions use the centralized configuration
      const configValues = Object.values(API_ENDPOINTS);
      configValues.forEach(endpoint => {
        expect(endpoint).toContain('43.143.241.181');
        expect(endpoint).not.toContain('letmetryai.cn');
      });
    });

    it('should maintain consistent URL structure', () => {
      expect(API_ENDPOINTS.FILE_UPLOAD).toMatch(/^https:\/\/[\d.]+\/lws\/file\/upload$/);
      expect(API_ENDPOINTS.FILE_DELETE).toMatch(/^https:\/\/[\d.]+\/lws\/file\/delete$/);
      expect(API_ENDPOINTS.FILE_INFO).toMatch(/^https:\/\/[\d.]+\/lws\/file\/info$/);
      expect(API_ENDPOINTS.FILE_LIST).toMatch(/^https:\/\/[\d.]+\/lws\/file\/list$/);
      expect(API_ENDPOINTS.FILE_DOWNLOAD).toMatch(/^https:\/\/[\d.]+\/lws\/file\/download$/);
    });
  });
});
