// Application configuration
// Centralized configuration for API and resource URLs

// Base URL for API and image resources

// API endpoints

// Helper function to get image URL
// Application configuration
// Centralized configuration for API and resource URLs

// Base URL for API and image resources
export const BASE_URL = 'https://letmetry.cloud';

// API endpoints
export const API_ENDPOINTS = {
  AI_CHAT: `${BASE_URL}/ai/chat`,
  FILE_UPLOAD: `${BASE_URL}/file/upload`,
  FILE_DELETE: `${BASE_URL}/file/delete`,
  FILE_INFO: `${BASE_URL}/file/info`,
  FILE_LIST: `${BASE_URL}/file/list`,
  FILE_DOWNLOAD: `${BASE_URL}/file/download`,
  IMAGE_UPLOAD: `${BASE_URL}/image/upload`,
  MYSQL_QUERY: `${BASE_URL}/mysql/query`,
  MYSQL_GET_BY_ID: `${BASE_URL}/mysql/getById`,
  MYSQL_INSERT: `${BASE_URL}/mysql/insert`,
  MYSQL_UPDATE: `${BASE_URL}/mysql/update`,
  MYSQL_DELETE: `${BASE_URL}/mysql/delete`,
  GITHUB_CREATE_ISSUE: `${BASE_URL}/github/create-issue`
};

// Helper function to get image URL
export function getImageUrl(imagePath) {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${BASE_URL}/${cleanPath}`;
}
