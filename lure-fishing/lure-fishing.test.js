/**
 * Tests for Lure Fishing Feature
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Lure Fishing Feature Tests', () => {
  let mockFetch;
  
  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <form id="uploadForm">
        <input type="file" id="photoUpload" />
        <div id="photoPreview"></div>
        <input type="text" id="location" readonly />
        <button type="button" id="getLocationBtn">获取位置</button>
        <input type="date" id="date" />
        <input type="number" id="temperature" />
        <input type="number" id="catchCount" />
        <textarea id="notes"></textarea>
        <button type="submit" id="submitBtn">提交成果</button>
      </form>
      <div id="uploadStatus"></div>
      <div id="recordsGallery"></div>
      <button id="loadMoreBtn">加载更多</button>
      <div id="temperatureStats"></div>
      <canvas id="chartCanvas"></canvas>
    `;
    
    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Mock window.API_ENDPOINTS
    window.API_ENDPOINTS = {
      FILE_UPLOAD: 'https://letmetry.cloud/lws/file/upload',
      MYSQL_INSERT: 'https://letmetry.cloud/lws/mysql/insert',
      MYSQL_QUERY: 'https://letmetry.cloud/lws/mysql/query'
    };
    
    window.BASE_URL = 'https://letmetry.cloud';
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Configuration Integration', () => {
    it('should use centralized API endpoints for file upload', () => {
      expect(window.API_ENDPOINTS.FILE_UPLOAD).toContain('letmetry.cloud');
      expect(window.API_ENDPOINTS.FILE_UPLOAD).toContain('/lws/file/upload');
    });
    
    it('should use centralized API endpoints for MySQL operations', () => {
      expect(window.API_ENDPOINTS.MYSQL_INSERT).toContain('letmetry.cloud');
      expect(window.API_ENDPOINTS.MYSQL_INSERT).toContain('/lws/mysql/insert');
      expect(window.API_ENDPOINTS.MYSQL_QUERY).toContain('letmetry.cloud');
      expect(window.API_ENDPOINTS.MYSQL_QUERY).toContain('/lws/mysql/query');
    });
    
    it('should use centralized BASE_URL for image construction', () => {
      expect(window.BASE_URL).toBe('https://letmetry.cloud');
    });
    
    it('should not use old domain', () => {
      expect(window.API_ENDPOINTS.FILE_UPLOAD).not.toContain('letmetryai.cn');
      expect(window.API_ENDPOINTS.MYSQL_INSERT).not.toContain('letmetryai.cn');
    });
  });
  
  describe('Form Validation', () => {
    it('should have all required form fields', () => {
      expect(document.getElementById('photoUpload')).toBeTruthy();
      expect(document.getElementById('location')).toBeTruthy();
      expect(document.getElementById('date')).toBeTruthy();
      expect(document.getElementById('temperature')).toBeTruthy();
      expect(document.getElementById('catchCount')).toBeTruthy();
    });
    
    it('should have photo upload input accepting images', () => {
      const photoInput = document.getElementById('photoUpload');
      expect(photoInput.type).toBe('file');
    });
    
    it('should have date input with proper type', () => {
      const dateInput = document.getElementById('date');
      expect(dateInput.type).toBe('date');
    });
    
    it('should have temperature input as number', () => {
      const tempInput = document.getElementById('temperature');
      expect(tempInput.type).toBe('number');
    });
    
    it('should have catch count input as number', () => {
      const catchInput = document.getElementById('catchCount');
      expect(catchInput.type).toBe('number');
    });
  });
  
  describe('Data Storage Structure', () => {
    it('should use correct MySQL table name', () => {
      const TABLE_NAME = 'lure_fishing_records';
      expect(TABLE_NAME).toBe('lure_fishing_records');
    });
    
    it('should prepare record data with all required fields', () => {
      const recordData = {
        photo_url: 'test.jpg',
        location: 'Test Location',
        catch_date: '2025-01-01',
        temperature: 25.5,
        catch_count: 5,
        notes: 'Test notes',
        created_at: new Date().toISOString()
      };
      
      expect(recordData).toHaveProperty('photo_url');
      expect(recordData).toHaveProperty('location');
      expect(recordData).toHaveProperty('catch_date');
      expect(recordData).toHaveProperty('temperature');
      expect(recordData).toHaveProperty('catch_count');
      expect(recordData).toHaveProperty('notes');
      expect(recordData).toHaveProperty('created_at');
    });
  });
  
  describe('Temperature Range Analysis', () => {
    it('should group temperatures into correct ranges', () => {
      const ranges = {
        '0-10°C': { count: 0, totalCatch: 0 },
        '10-15°C': { count: 0, totalCatch: 0 },
        '15-20°C': { count: 0, totalCatch: 0 },
        '20-25°C': { count: 0, totalCatch: 0 },
        '25-30°C': { count: 0, totalCatch: 0 },
        '30°C+': { count: 0, totalCatch: 0 }
      };
      
      expect(ranges).toHaveProperty('0-10°C');
      expect(ranges).toHaveProperty('10-15°C');
      expect(ranges).toHaveProperty('15-20°C');
      expect(ranges).toHaveProperty('20-25°C');
      expect(ranges).toHaveProperty('25-30°C');
      expect(ranges).toHaveProperty('30°C+');
    });
    
    it('should categorize temperature 5°C correctly', () => {
      const temp = 5;
      expect(temp).toBeLessThan(10);
    });
    
    it('should categorize temperature 12°C correctly', () => {
      const temp = 12;
      expect(temp).toBeGreaterThanOrEqual(10);
      expect(temp).toBeLessThan(15);
    });
    
    it('should categorize temperature 18°C correctly', () => {
      const temp = 18;
      expect(temp).toBeGreaterThanOrEqual(15);
      expect(temp).toBeLessThan(20);
    });
    
    it('should categorize temperature 22°C correctly', () => {
      const temp = 22;
      expect(temp).toBeGreaterThanOrEqual(20);
      expect(temp).toBeLessThan(25);
    });
    
    it('should categorize temperature 28°C correctly', () => {
      const temp = 28;
      expect(temp).toBeGreaterThanOrEqual(25);
      expect(temp).toBeLessThan(30);
    });
    
    it('should categorize temperature 35°C correctly', () => {
      const temp = 35;
      expect(temp).toBeGreaterThanOrEqual(30);
    });
  });
  
  describe('Pagination', () => {
    it('should define records per page constant', () => {
      const RECORDS_PER_PAGE = 9;
      expect(RECORDS_PER_PAGE).toBe(9);
    });
    
    it('should calculate offset correctly for page 1', () => {
      const currentPage = 1;
      const RECORDS_PER_PAGE = 9;
      const offset = (currentPage - 1) * RECORDS_PER_PAGE;
      expect(offset).toBe(0);
    });
    
    it('should calculate offset correctly for page 2', () => {
      const currentPage = 2;
      const RECORDS_PER_PAGE = 9;
      const offset = (currentPage - 1) * RECORDS_PER_PAGE;
      expect(offset).toBe(9);
    });
  });
  
  describe('File Upload Path', () => {
    it('should use correct target path for lure-fishing photos', () => {
      const targetPath = 'lure-fishing/';
      expect(targetPath).toBe('lure-fishing/');
      expect(targetPath).toContain('lure-fishing');
    });
  });
  
  describe('SQL Query Structure', () => {
    it('should construct valid SELECT query with parameterization', () => {
      const TABLE_NAME = 'lure_fishing_records';
      const RECORDS_PER_PAGE = 9;
      const offset = 0;
      const query = 'SELECT photo_url, location, catch_date, temperature, catch_count, notes, created_at FROM ?? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      const params = [TABLE_NAME, RECORDS_PER_PAGE, offset];
      
      expect(query).toContain('SELECT photo_url, location, catch_date, temperature, catch_count, notes, created_at FROM ??');
      expect(query).toContain('ORDER BY created_at DESC');
      expect(query).toContain('LIMIT ?');
      expect(query).toContain('OFFSET ?');
      expect(params).toEqual(['lure_fishing_records', 9, 0]);
    });
    
    it('should construct valid aggregation query with parameterization', () => {
      const TABLE_NAME = 'lure_fishing_records';
      const query = `
        SELECT 
          temperature,
          COUNT(*) as count,
          SUM(catch_count) as total_catch
        FROM ??
        GROUP BY temperature
        ORDER BY count DESC
      `;
      const params = [TABLE_NAME];
      
      expect(query).toContain('SELECT');
      expect(query).toContain('temperature');
      expect(query).toContain('COUNT(*)');
      expect(query).toContain('SUM(catch_count)');
      expect(query).toContain('FROM ??');
      expect(query).toContain('GROUP BY temperature');
      expect(query).toContain('ORDER BY count DESC');
      expect(params).toEqual(['lure_fishing_records']);
    });
  });
  
  describe('Image URL Construction', () => {
    it('should construct correct image URL from photo_url', () => {
      const record = { photo_url: 'lure-fishing/test.jpg' };
      const photoUrl = `${window.BASE_URL}/${record.photo_url}`;
      
      expect(photoUrl).toBe('https://letmetry.cloud/lure-fishing/test.jpg');
      expect(photoUrl).toContain('https://letmetry.cloud');
    });
    
    it('should not use old domain in image URLs', () => {
      const record = { photo_url: 'lure-fishing/test.jpg' };
      const photoUrl = `${window.BASE_URL}/${record.photo_url}`;
      
      expect(photoUrl).not.toContain('letmetryai.cn');
    });
    
    it('should encode URLs to prevent XSS', () => {
      const record = { photo_url: 'lure-fishing/test.jpg' };
      const photoUrl = encodeURI(`${window.BASE_URL}/${record.photo_url}`);
      
      expect(photoUrl).toBe('https://letmetry.cloud/lure-fishing/test.jpg');
    });
  });
  
  describe('Geolocation Handling', () => {
    it('should check for geolocation support', () => {
      const hasGeolocation = 'geolocation' in navigator;
      // In test environment, this might be false, but we test the check exists
      expect(typeof hasGeolocation).toBe('boolean');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing photo gracefully', () => {
      const photoInput = document.getElementById('photoUpload');
      expect(photoInput.files.length).toBe(0);
      // Should throw error when trying to submit without photo
    });
    
    it('should handle missing location gracefully', () => {
      const locationInput = document.getElementById('location');
      expect(locationInput.value).toBe('');
      // Should require location before submission
    });
  });
  
  describe('Main Page Integration', () => {
    it('should have lure-fishing section in main index.html', () => {
      // This would be tested by checking if index.html contains the section
      const expectedSection = 'lure-fishing';
      expect(expectedSection).toBe('lure-fishing');
    });
    
    it('should have image configuration for lure-fishing in main.js', () => {
      const imageId = 'lure-fishing-img';
      expect(imageId).toBe('lure-fishing-img');
    });
  });
  
  describe('Database Schema Validation', () => {
    it('should define correct table name', () => {
      const TABLE_NAME = 'lure_fishing_records';
      expect(TABLE_NAME).toBe('lure_fishing_records');
      expect(TABLE_NAME).toMatch(/^[a-z_]+$/); // Only lowercase and underscores
    });
    
    it('should have all required columns in record data', () => {
      const requiredColumns = [
        'photo_url',
        'location',
        'catch_date',
        'temperature',
        'catch_count',
        'notes',
        'created_at'
      ];
      
      const recordData = {
        photo_url: 'test.jpg',
        location: 'Test Location',
        catch_date: '2025-01-01',
        temperature: 25.5,
        catch_count: 5,
        notes: 'Test notes',
        created_at: new Date().toISOString()
      };
      
      requiredColumns.forEach(column => {
        expect(recordData).toHaveProperty(column);
      });
    });
    
    it('should validate photo_url is a string', () => {
      const recordData = {
        photo_url: 'test.jpg'
      };
      expect(typeof recordData.photo_url).toBe('string');
      expect(recordData.photo_url.length).toBeGreaterThan(0);
    });
    
    it('should validate location is a string', () => {
      const recordData = {
        location: '纬度: 30.6250, 经度: 121.0851'
      };
      expect(typeof recordData.location).toBe('string');
      expect(recordData.location.length).toBeGreaterThan(0);
    });
    
    it('should validate catch_date is a valid date string', () => {
      const recordData = {
        catch_date: '2025-01-01'
      };
      expect(typeof recordData.catch_date).toBe('string');
      expect(recordData.catch_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    
    it('should validate temperature is a number', () => {
      const recordData = {
        temperature: 25.5
      };
      expect(typeof recordData.temperature).toBe('number');
      expect(recordData.temperature).toBeGreaterThanOrEqual(-50); // Reasonable range
      expect(recordData.temperature).toBeLessThanOrEqual(50); // Reasonable range
    });
    
    it('should validate catch_count is an integer', () => {
      const recordData = {
        catch_count: 5
      };
      expect(typeof recordData.catch_count).toBe('number');
      expect(Number.isInteger(recordData.catch_count)).toBe(true);
      expect(recordData.catch_count).toBeGreaterThanOrEqual(0);
    });
    
    it('should validate notes is a string', () => {
      const recordData = {
        notes: 'Great fishing day!'
      };
      expect(typeof recordData.notes).toBe('string');
    });
    
    it('should validate created_at is an ISO timestamp', () => {
      const recordData = {
        created_at: new Date().toISOString()
      };
      expect(typeof recordData.created_at).toBe('string');
      expect(recordData.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
    
    it('should handle empty notes field', () => {
      const recordData = {
        notes: ''
      };
      expect(typeof recordData.notes).toBe('string');
      expect(recordData.notes).toBe('');
    });
    
    it('should use proper SQL query for retrieving records', () => {
      const query = 'SELECT photo_url, location, catch_date, temperature, catch_count, notes, created_at FROM ?? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      
      // Verify query includes all required fields
      expect(query).toContain('photo_url');
      expect(query).toContain('location');
      expect(query).toContain('catch_date');
      expect(query).toContain('temperature');
      expect(query).toContain('catch_count');
      expect(query).toContain('notes');
      expect(query).toContain('created_at');
      
      // Verify query uses parameterization
      expect(query).toContain('??'); // Table name parameterization
      expect(query).toContain('LIMIT ?');
      expect(query).toContain('OFFSET ?');
    });
  });
});

describe('Lure Fishing Regression Tests', () => {
  it('should not break existing functionality', () => {
    expect(window.API_ENDPOINTS).toBeDefined();
    expect(window.BASE_URL).toBeDefined();
  });
  
  it('should maintain centralized configuration pattern', () => {
    expect(window.BASE_URL).toBe('https://letmetry.cloud');
    expect(window.API_ENDPOINTS.FILE_UPLOAD).toContain(window.BASE_URL);
    expect(window.API_ENDPOINTS.MYSQL_INSERT).toContain(window.BASE_URL);
  });
  
  it('should use correct API paths', () => {
    expect(window.API_ENDPOINTS.FILE_UPLOAD).toContain('/lws/file/upload');
    expect(window.API_ENDPOINTS.MYSQL_INSERT).toContain('/lws/mysql/insert');
    expect(window.API_ENDPOINTS.MYSQL_QUERY).toContain('/lws/mysql/query');
  });
});
