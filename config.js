// Global configuration for use in HTML files
// This provides the same functionality as util/config.js but for direct use in HTML script tags

// Base URL for API and image resources
window.BASE_URL = 'https://letmetry.cloud';

// API endpoints
window.API_ENDPOINTS = {
  AI_CHAT: `${window.BASE_URL}/lws/ai/chat`,
  FILE_UPLOAD: `${window.BASE_URL}/lws/file/upload`,
  FILE_DELETE: `${window.BASE_URL}/lws/file/delete`,
  FILE_INFO: `${window.BASE_URL}/lws/file/info`,
  FILE_LIST: `${window.BASE_URL}/lws/file/list`,
  FILE_DOWNLOAD: `${window.BASE_URL}/lws/file/download`,
  MYSQL_QUERY: `${window.BASE_URL}/lws/mysql/query`,
  MYSQL_GET_BY_ID: `${window.BASE_URL}/lws/mysql/getById`,
  MYSQL_INSERT: `${window.BASE_URL}/lws/mysql/insert`,
  MYSQL_UPDATE: `${window.BASE_URL}/lws/mysql/update`,
  MYSQL_DELETE: `${window.BASE_URL}/lws/mysql/delete`
};

// Helper function to get image URL
window.getImageUrl = function(imagePath) {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${window.BASE_URL}/${cleanPath}`;
};
