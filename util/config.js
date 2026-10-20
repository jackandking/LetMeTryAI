// Application configuration
// Centralized configuration for API and resource URLs

// Base URL for API and image resources

// API endpoints

// Helper function to get image URL
// Application configuration
// Centralized configuration for API and resource URLs

// Base URL for API and image resources
export const BASE_URL = 'https://letmetry.cn';

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
  // 男人宝审核后台专用写端点（KV_ADMIN_KEY 鉴权；/mysql/update、/mysql/delete
  // 自 2026-09-06 P0 起仅 admin key 可写，admin.js 已于 2026-10-16 切走）
  NANRENBAO_ADMIN_REVIEW: `${BASE_URL}/api/nanrenbao/admin/review`,
  NANRENBAO_ADMIN_VISIBILITY: `${BASE_URL}/api/nanrenbao/admin/visibility`,
  NANRENBAO_ADMIN_COVERAGE: `${BASE_URL}/api/nanrenbao/admin/coverage`,
  NANRENBAO_ADMIN_PURGE: `${BASE_URL}/api/nanrenbao/admin/purge`,
  PAYMENT_CREATE_ORDER: `${BASE_URL}/payment/alipay/create-order`,
  PAYMENT_QUERY_ORDER: `${BASE_URL}/payment/order`
};

// Helper function to get image URL
export function getImageUrl(imagePath) {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${BASE_URL}/${cleanPath}`;
}
