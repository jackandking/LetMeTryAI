// Application configuration
// Centralized configuration for API and resource URLs

// Base URL for API and image resources
export const BASE_URL = 'https://letmetry.cloud;

// API endpoints
export const API_ENDPOINTS = {
  AI_CHAT: `${BASE_URL}/lws/ai/chat`,
  FILE_UPLOAD: `${BASE_URL}/lws/file/upload`,
  FILE_DELETE: `${BASE_URL}/lws/file/delete`,
  FILE_INFO: `${BASE_URL}/lws/file/info`,
  FILE_LIST: `${BASE_URL}/lws/file/list`,
  FILE_DOWNLOAD: `${BASE_URL}/lws/file/download`,
  MYSQL_QUERY: `${BASE_URL}/lws/mysql/query`,
  MYSQL_GET_BY_ID: `${BASE_URL}/lws/mysql/getById`,
  MYSQL_INSERT: `${BASE_URL}/lws/mysql/insert`,
  MYSQL_UPDATE: `${BASE_URL}/lws/mysql/update`,
  MYSQL_DELETE: `${BASE_URL}/lws/mysql/delete`
};

// Helper function to get image URL
export function getImageUrl(imagePath) {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${BASE_URL}/${cleanPath}`;
}
