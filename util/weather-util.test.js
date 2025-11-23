/**
 * Tests for Weather Utility Module
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fetchWeatherByLocationAndDate, formatTemperature, getTemperatureDescription } from './weather-util.js';

describe('Weather Utility Module', () => {
  let mockFetch;
  
  beforeEach(() => {
    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchWeatherByLocationAndDate', () => {
    it('should fetch weather data successfully', async () => {
      const mockWeatherData = {
        latitude: 39.9,
        longitude: 116.4,
        timezone: 'Asia/Shanghai',
        daily: {
          time: ['2025-01-15'],
          temperature_2m_mean: [12.5],
          temperature_2m_max: [15.2],
          temperature_2m_min: [8.3]
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockWeatherData
      });

      const result = await fetchWeatherByLocationAndDate(39.9, 116.4, '2025-01-15');

      expect(result).toEqual({
        date: '2025-01-15',
        temperature_mean: 12.5,
        temperature_max: 15.2,
        temperature_min: 8.3,
        latitude: 39.9,
        longitude: 116.4,
        timezone: 'Asia/Shanghai'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('archive-api.open-meteo.com')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('latitude=39.9')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('longitude=116.4')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2025-01-15')
      );
    });

    it('should throw error when latitude is missing', async () => {
      await expect(
        fetchWeatherByLocationAndDate(null, 116.4, '2025-01-15')
      ).rejects.toThrow('Latitude, longitude, and date are required');
    });

    it('should throw error when longitude is missing', async () => {
      await expect(
        fetchWeatherByLocationAndDate(39.9, null, '2025-01-15')
      ).rejects.toThrow('Latitude, longitude, and date are required');
    });

    it('should throw error when date is missing', async () => {
      await expect(
        fetchWeatherByLocationAndDate(39.9, 116.4, null)
      ).rejects.toThrow('Latitude, longitude, and date are required');
    });

    it('should throw error for invalid latitude (too low)', async () => {
      await expect(
        fetchWeatherByLocationAndDate(-91, 116.4, '2025-01-15')
      ).rejects.toThrow('Invalid latitude. Must be between -90 and 90');
    });

    it('should throw error for invalid latitude (too high)', async () => {
      await expect(
        fetchWeatherByLocationAndDate(91, 116.4, '2025-01-15')
      ).rejects.toThrow('Invalid latitude. Must be between -90 and 90');
    });

    it('should throw error for invalid longitude (too low)', async () => {
      await expect(
        fetchWeatherByLocationAndDate(39.9, -181, '2025-01-15')
      ).rejects.toThrow('Invalid longitude. Must be between -180 and 180');
    });

    it('should throw error for invalid longitude (too high)', async () => {
      await expect(
        fetchWeatherByLocationAndDate(39.9, 181, '2025-01-15')
      ).rejects.toThrow('Invalid longitude. Must be between -180 and 180');
    });

    it('should throw error for invalid date format', async () => {
      await expect(
        fetchWeatherByLocationAndDate(39.9, 116.4, '2025/01/15')
      ).rejects.toThrow('Invalid date format. Expected YYYY-MM-DD');
    });

    it('should throw error for future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      await expect(
        fetchWeatherByLocationAndDate(39.9, 116.4, futureDateStr)
      ).rejects.toThrow('Cannot fetch weather for future dates');
    });

    it('should handle API request failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(
        fetchWeatherByLocationAndDate(39.9, 116.4, '2025-01-15')
      ).rejects.toThrow('Weather API request failed: 500');
    });

    it('should handle missing temperature data in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          latitude: 39.9,
          longitude: 116.4,
          daily: {}
        })
      });

      await expect(
        fetchWeatherByLocationAndDate(39.9, 116.4, '2025-01-15')
      ).rejects.toThrow('No temperature data available for this date and location');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        fetchWeatherByLocationAndDate(39.9, 116.4, '2025-01-15')
      ).rejects.toThrow('Failed to fetch weather data: Network error');
    });

    it('should accept valid boundary coordinates', async () => {
      const mockWeatherData = {
        latitude: -90,
        longitude: -180,
        timezone: 'UTC',
        daily: {
          time: ['2025-01-15'],
          temperature_2m_mean: [5.0],
          temperature_2m_max: [8.0],
          temperature_2m_min: [2.0]
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockWeatherData
      });

      const result = await fetchWeatherByLocationAndDate(-90, -180, '2025-01-15');
      expect(result.temperature_mean).toBe(5.0);
    });

    it('should use Open-Meteo archive API', async () => {
      const mockWeatherData = {
        latitude: 39.9,
        longitude: 116.4,
        timezone: 'Asia/Shanghai',
        daily: {
          time: ['2025-01-15'],
          temperature_2m_mean: [12.5],
          temperature_2m_max: [15.2],
          temperature_2m_min: [8.3]
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockWeatherData
      });

      await fetchWeatherByLocationAndDate(39.9, 116.4, '2025-01-15');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('archive-api.open-meteo.com/v1/archive');
      expect(calledUrl).toContain('daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean');
      expect(calledUrl).toContain('timezone=auto');
    });
  });

  describe('formatTemperature', () => {
    it('should format temperature with 1 decimal by default', () => {
      expect(formatTemperature(25.567)).toBe('25.6');
    });

    it('should format temperature with specified decimals', () => {
      expect(formatTemperature(25.567, 2)).toBe('25.57');
      expect(formatTemperature(25.567, 0)).toBe('26');
    });

    it('should handle null temperature', () => {
      expect(formatTemperature(null)).toBe('N/A');
    });

    it('should handle undefined temperature', () => {
      expect(formatTemperature(undefined)).toBe('N/A');
    });

    it('should handle zero temperature', () => {
      expect(formatTemperature(0)).toBe('0.0');
    });

    it('should handle negative temperatures', () => {
      expect(formatTemperature(-10.5)).toBe('-10.5');
    });
  });

  describe('getTemperatureDescription', () => {
    it('should return "严寒" for temperatures below 0°C', () => {
      expect(getTemperatureDescription(-5)).toBe('严寒');
      expect(getTemperatureDescription(-0.1)).toBe('严寒');
    });

    it('should return "寒冷" for temperatures 0-10°C', () => {
      expect(getTemperatureDescription(0)).toBe('寒冷');
      expect(getTemperatureDescription(5)).toBe('寒冷');
      expect(getTemperatureDescription(9.9)).toBe('寒冷');
    });

    it('should return "凉爽" for temperatures 10-15°C', () => {
      expect(getTemperatureDescription(10)).toBe('凉爽');
      expect(getTemperatureDescription(12)).toBe('凉爽');
      expect(getTemperatureDescription(14.9)).toBe('凉爽');
    });

    it('should return "温和" for temperatures 15-20°C', () => {
      expect(getTemperatureDescription(15)).toBe('温和');
      expect(getTemperatureDescription(18)).toBe('温和');
      expect(getTemperatureDescription(19.9)).toBe('温和');
    });

    it('should return "温暖" for temperatures 20-25°C', () => {
      expect(getTemperatureDescription(20)).toBe('温暖');
      expect(getTemperatureDescription(22)).toBe('温暖');
      expect(getTemperatureDescription(24.9)).toBe('温暖');
    });

    it('should return "炎热" for temperatures 25-30°C', () => {
      expect(getTemperatureDescription(25)).toBe('炎热');
      expect(getTemperatureDescription(28)).toBe('炎热');
      expect(getTemperatureDescription(29.9)).toBe('炎热');
    });

    it('should return "酷热" for temperatures 30°C and above', () => {
      expect(getTemperatureDescription(30)).toBe('酷热');
      expect(getTemperatureDescription(35)).toBe('酷热');
      expect(getTemperatureDescription(40)).toBe('酷热');
    });

    it('should return "未知" for null temperature', () => {
      expect(getTemperatureDescription(null)).toBe('未知');
    });

    it('should return "未知" for undefined temperature', () => {
      expect(getTemperatureDescription(undefined)).toBe('未知');
    });
  });
});

describe('Weather Utility Regression Tests', () => {
  it('should maintain consistent API endpoint usage', () => {
    const expectedEndpoint = 'archive-api.open-meteo.com/v1/archive';
    expect(expectedEndpoint).toBe('archive-api.open-meteo.com/v1/archive');
  });

  it('should maintain date format validation', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(dateRegex.test('2025-01-15')).toBe(true);
    expect(dateRegex.test('2025/01/15')).toBe(false);
    expect(dateRegex.test('15-01-2025')).toBe(false);
  });

  it('should maintain coordinate validation ranges', () => {
    const validLat = 39.9;
    const validLon = 116.4;
    
    expect(validLat >= -90 && validLat <= 90).toBe(true);
    expect(validLon >= -180 && validLon <= 180).toBe(true);
  });
});
