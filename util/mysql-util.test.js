// mysql-util.test.js - Unit tests for MySQL utility functions
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { queryDatabase, getById, insertRecord, updateRecord, deleteRecord, formatDateTimeForMySQL } from './mysql-util';
import { API_ENDPOINTS } from './config';

describe('MySQL Utilities', () => {
  beforeEach(() => {
    fetch.mockClear();
    console.log.mockClear();
  });

  describe('queryDatabase', () => {
    it('should execute query successfully', (done) => {
      const mockResponse = { 
        ok: true,
        json: async () => [{ id: 1, name: 'test' }]
      };
      fetch.mockResolvedValueOnce(mockResponse);

      queryDatabase('SELECT * FROM test', [], (error, result) => {
        expect(error).toBeNull();
        expect(result).toEqual([{ id: 1, name: 'test' }]);
        
        expect(fetch).toHaveBeenCalledWith(API_ENDPOINTS.MYSQL_QUERY, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql: 'SELECT * FROM test', params: [] })
        });
        
        done();
      });
    });

    it('should use centralized configuration', (done) => {
      const mockResponse = { ok: true, json: async () => [] };
      fetch.mockResolvedValueOnce(mockResponse);

      queryDatabase('SELECT 1', [], (error, result) => {
        const fetchCall = fetch.mock.calls[0];
        expect(fetchCall[0]).toBe(API_ENDPOINTS.MYSQL_QUERY);
        expect(API_ENDPOINTS.MYSQL_QUERY).toContain('letmetry.cloud');
        expect(API_ENDPOINTS.MYSQL_QUERY).toContain('/mysql/query');
        done();
      });
    });

    it('should handle fetch errors', (done) => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      queryDatabase('SELECT 1', [], (error, result) => {
        expect(error).toBeInstanceOf(Error);
        expect(result).toBeUndefined();
        done();
      });
    });
  });

  describe('getById', () => {
    it('should get record by ID successfully', (done) => {
      const mockResponse = { 
        ok: true,
        json: async () => ({ id: 1, name: 'test record' })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      getById('users', 1, (error, result) => {
        expect(error).toBeNull();
        
        expect(fetch).toHaveBeenCalledWith(API_ENDPOINTS.MYSQL_GET_BY_ID, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ table: 'users', id: 1 })
        });
        
        done();
      });
    });

    it('should use centralized endpoint', (done) => {
      const mockResponse = { ok: true, json: async () => ({}) };
      fetch.mockResolvedValueOnce(mockResponse);

      getById('test', 1, (error, result) => {
        expect(fetch.mock.calls[0][0]).toBe(API_ENDPOINTS.MYSQL_GET_BY_ID);
        done();
      });
    });
  });

  describe('insertRecord', () => {
    it('should insert record successfully', (done) => {
      const mockResponse = {
        ok: true,
        text: async () => JSON.stringify({ insertId: 123 })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const testData = { name: 'test', email: 'test@example.com' };

      insertRecord('users', testData, (error, insertId) => {
        expect(error).toBeNull();
        expect(insertId).toBe(123);
        
        expect(fetch).toHaveBeenCalledWith(API_ENDPOINTS.MYSQL_INSERT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ table: 'users', data: testData })
        });
        
        done();
      });
    });

    it('should handle invalid JSON response', (done) => {
      const mockResponse = {
        ok: true,
        text: async () => 'Invalid JSON'
      };
      fetch.mockResolvedValueOnce(mockResponse);

      insertRecord('users', { name: 'test' }, (error, result) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Invalid JSON response');
        done();
      });
    });

    it('should handle HTTP errors', (done) => {
      const mockResponse = {
        ok: false,
        status: 500
      };
      fetch.mockResolvedValueOnce(mockResponse);

      insertRecord('users', { name: 'test' }, (error, result) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('HTTP error! status: 500');
        done();
      });
    });
  });

  describe('updateRecord', () => {
    it('should update record successfully', (done) => {
      const mockResponse = { 
        ok: true,
        json: async () => ({ affectedRows: 1 })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const testData = { name: 'updated name' };

      updateRecord('users', 1, testData, (error, affectedRows) => {
        expect(error).toBeNull();
        expect(affectedRows).toBe(1);
        
        expect(fetch).toHaveBeenCalledWith(API_ENDPOINTS.MYSQL_UPDATE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ table: 'users', id: 1, data: testData })
        });
        
        done();
      });
    });
  });

  describe('deleteRecord', () => {
    it('should delete record successfully', (done) => {
      const mockResponse = { 
        ok: true,
        json: async () => ({ affectedRows: 1 })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      deleteRecord('users', 1, (error, affectedRows) => {
        expect(error).toBeNull();
        expect(affectedRows).toBe(1);
        
        expect(fetch).toHaveBeenCalledWith(API_ENDPOINTS.MYSQL_DELETE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ table: 'users', id: 1 })
        });
        
        done();
      });
    });
  });

  describe('Configuration Integration', () => {
    it('should use all MySQL endpoints from centralized config', () => {
      const mysqlEndpoints = [
        'MYSQL_QUERY',
        'MYSQL_GET_BY_ID', 
        'MYSQL_INSERT',
        'MYSQL_UPDATE',
        'MYSQL_DELETE'
      ];

      mysqlEndpoints.forEach(endpoint => {
        expect(API_ENDPOINTS[endpoint]).toBeDefined();
        expect(API_ENDPOINTS[endpoint]).toContain('letmetry.cloud');
        expect(API_ENDPOINTS[endpoint]).toContain('/mysql/');
        expect(API_ENDPOINTS[endpoint]).not.toContain('letmetryai.cn');
      });
    });

    it('should maintain consistent URL structure', () => {
      expect(API_ENDPOINTS.MYSQL_QUERY).toMatch(/^https:\/\/[a-z0-9.-]+\/mysql\/query$/);
      expect(API_ENDPOINTS.MYSQL_GET_BY_ID).toMatch(/^https:\/\/[a-z0-9.-]+\/mysql\/getById$/);
      expect(API_ENDPOINTS.MYSQL_INSERT).toMatch(/^https:\/\/[a-z0-9.-]+\/mysql\/insert$/);
      expect(API_ENDPOINTS.MYSQL_UPDATE).toMatch(/^https:\/\/[a-z0-9.-]+\/mysql\/update$/);
      expect(API_ENDPOINTS.MYSQL_DELETE).toMatch(/^https:\/\/[a-z0-9.-]+\/mysql\/delete$/);
    });
  });

  describe('formatDateTimeForMySQL', () => {
    it('should format date to MySQL datetime format', () => {
      const testDate = new Date('2025-11-23T10:28:10.222Z');
      const formatted = formatDateTimeForMySQL(testDate);
      
      expect(formatted).toBe('2025-11-23 10:28:10');
    });

    it('should match MySQL datetime format pattern', () => {
      const formatted = formatDateTimeForMySQL();
      
      // Should match MySQL datetime format: YYYY-MM-DD HH:MM:SS
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should not contain T or Z characters', () => {
      const formatted = formatDateTimeForMySQL();
      
      expect(formatted).not.toContain('T');
      expect(formatted).not.toContain('Z');
    });

    it('should be exactly 19 characters long', () => {
      const formatted = formatDateTimeForMySQL();
      
      expect(formatted.length).toBe(19);
    });

    it('should use current date when no parameter provided', () => {
      const before = new Date();
      const formatted = formatDateTimeForMySQL();
      const after = new Date();
      
      // Parse the formatted string back to a date
      const formattedDate = new Date(formatted.replace(' ', 'T') + 'Z');
      
      // Should be between before and after timestamps
      expect(formattedDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(formattedDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('should handle different dates correctly', () => {
      const testCases = [
        { input: '2025-01-01T00:00:00.000Z', expected: '2025-01-01 00:00:00' },
        { input: '2025-12-31T23:59:59.999Z', expected: '2025-12-31 23:59:59' },
        { input: '2025-06-15T12:30:45.500Z', expected: '2025-06-15 12:30:45' }
      ];

      testCases.forEach(({ input, expected }) => {
        const formatted = formatDateTimeForMySQL(new Date(input));
        expect(formatted).toBe(expected);
      });
    });
  });
});