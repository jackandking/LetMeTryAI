// file-util.test.js
import { uploadFile } from './file-util';
import { API_ENDPOINTS } from './config';

// 启用 fetch 模拟
//global.fetch = require('jest-fetch-mock').enableMocks();

describe('uploadFile', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  it('should upload a file successfully with valid parameters', async () => {
    const mockResponse = { ok: true, json: async () => ({ success: true, url: 'https://example.com/file.jpg' }) };
    fetch.mockResponseOnce(JSON.stringify(mockResponse));

    const fileObject = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const targetPath = '/valid/path/';

    const result = await uploadFile(fileObject, targetPath);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(API_ENDPOINTS.FILE_UPLOAD, {
      method: 'POST',
      body: expect.any(FormData),
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    expect(result).toEqual({ ok: true});
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
    const mockResponse = { ok: true, json: async () => ({ success: true, url: 'https://example.com/file.jpg' }) };
    fetch.mockResponseOnce(JSON.stringify(mockResponse));

    const fileObject = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    const result = await uploadFile(fileObject);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(API_ENDPOINTS.FILE_UPLOAD, {
      method: 'POST',
      body: expect.any(FormData),
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    expect(result).toEqual({ ok: true });
  });

  it('should handle HTTP error responses', async () => {
    fetch.mockResponseOnce('HTTP error!', { status: 500, statusText: 'Internal Server Error' });

    const fileObject = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await expect(uploadFile(fileObject)).rejects.toThrow('HTTP error! status: 500 - Internal Server Error');
  });
});
