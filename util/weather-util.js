/**
 * Weather Utility Module
 * Provides functions to fetch weather data based on location and date
 * Uses Open-Meteo API (free, no API key required)
 */

/**
 * Fetch weather temperature for a specific location and date
 * @param {number} latitude - Latitude of the location
 * @param {number} longitude - Longitude of the location
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Weather data including temperature
 */
export async function fetchWeatherByLocationAndDate(latitude, longitude, date) {
  if (!latitude || !longitude || !date) {
    throw new Error('Latitude, longitude, and date are required');
  }

  // Validate latitude and longitude
  if (latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude. Must be between -90 and 90');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude. Must be between -180 and 180');
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  // Check if date is not in the future
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (inputDate > today) {
    throw new Error('Cannot fetch weather for future dates');
  }

  try {
    // Use Open-Meteo API for historical weather data
    // API documentation: https://open-meteo.com/en/docs/historical-weather-api
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${date}&end_date=${date}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean&timezone=auto`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Extract temperature data
    if (!data.daily || !data.daily.temperature_2m_mean || data.daily.temperature_2m_mean.length === 0) {
      throw new Error('No temperature data available for this date and location');
    }

    return {
      date: data.daily.time[0],
      temperature_mean: data.daily.temperature_2m_mean[0],
      temperature_max: data.daily.temperature_2m_max[0],
      temperature_min: data.daily.temperature_2m_min[0],
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone
    };
  } catch (error) {
    if (error.message.includes('Weather API request failed')) {
      throw error;
    }
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }
}

/**
 * Format temperature for display
 * @param {number} temperature - Temperature in Celsius
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted temperature string
 */
export function formatTemperature(temperature, decimals = 1) {
  if (temperature === null || temperature === undefined) {
    return 'N/A';
  }
  return Number(temperature).toFixed(decimals);
}

/**
 * Get temperature description based on value
 * @param {number} temperature - Temperature in Celsius
 * @returns {string} Temperature description in Chinese
 */
export function getTemperatureDescription(temperature) {
  if (temperature === null || temperature === undefined) {
    return '未知';
  }

  if (temperature < 0) {
    return '严寒';
  } else if (temperature < 10) {
    return '寒冷';
  } else if (temperature < 15) {
    return '凉爽';
  } else if (temperature < 20) {
    return '温和';
  } else if (temperature < 25) {
    return '温暖';
  } else if (temperature < 30) {
    return '炎热';
  } else {
    return '酷热';
  }
}
