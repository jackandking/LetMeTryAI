// Global configuration for use in HTML files
// This provides the same functionality as util/config.js but for direct use in HTML script tags

// Base URL for API and image resources
window.BASE_URL = 'https://letmetry.cloud';

/**
 * TESTING MODE: Enable MySQL API mocking for testing when connection fails
 * Set to true to use mock data when ERR_CONNECTION_RESET or network errors occur
 * Also can be enabled via URL parameter: ?mock=true
 * This is useful for development and testing without requiring a live database connection
 */
window.ENABLE_MYSQL_MOCK = false; // Set to true to enable mock mode

// API endpoints
window.API_ENDPOINTS = {
  AI_CHAT: `${window.BASE_URL}/ai/chat`,
  FILE_UPLOAD: `${window.BASE_URL}/file/upload`,
  FILE_DELETE: `${window.BASE_URL}/file/delete`,
  FILE_INFO: `${window.BASE_URL}/file/info`,
  FILE_LIST: `${window.BASE_URL}/file/list`,
  FILE_DOWNLOAD: `${window.BASE_URL}/file/download`,
  IMAGE_UPLOAD: `${window.BASE_URL}/image/upload`,
  MYSQL_QUERY: `${window.BASE_URL}/mysql/query`,
  MYSQL_GET_BY_ID: `${window.BASE_URL}/mysql/getById`,
  MYSQL_INSERT: `${window.BASE_URL}/mysql/insert`,
  MYSQL_UPDATE: `${window.BASE_URL}/mysql/update`,
  MYSQL_DELETE: `${window.BASE_URL}/mysql/delete`
};

// Helper function to get image URL
window.getImageUrl = function(imagePath) {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${window.BASE_URL}/${cleanPath}`;
};
