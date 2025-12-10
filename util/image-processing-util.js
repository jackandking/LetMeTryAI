// Image processing utility functions
// Professional image processing API integration for the eraser app

import { API_ENDPOINTS } from './config.js';

/**
 * Process an image to erase Chinese characters while preserving pinyin and grid lines
 * @param {string} imageUrl - URL of the image to process
 * @param {Object} options - Processing options
 * @param {string} options.mode - Processing mode: 'eraser' for erasing characters
 * @param {boolean} options.preservePinyin - Whether to preserve pinyin (default: true)
 * @param {boolean} options.preserveGrid - Whether to preserve grid lines (default: true)
 * @returns {Promise<Object>} - Processing result with processed image URL
 */
export async function processImage(imageUrl, options = {}) {
  if (!imageUrl) {
    throw new Error('Image URL is required');
  }

  const {
    mode = 'eraser',
    preservePinyin = true,
    preserveGrid = true
  } = options;

  console.log('Processing image:', imageUrl, 'with options:', options);

  try {
    const response = await fetch(API_ENDPOINTS.IMAGE_PROCESS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl,
        mode,
        preservePinyin,
        preserveGrid
      })
    });

    if (!response.ok) {
      throw new Error(`Image processing failed: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Image processing result:', data);

    if (data.success) {
      return {
        processedImageUrl: data.processedImageUrl,
        originalImageUrl: imageUrl,
        processingTime: data.processingTime,
        metadata: data.metadata
      };
    } else {
      throw new Error(data.error || 'Image processing failed');
    }
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Get processing status for an image
 * @param {string} taskId - The task ID returned from processImage
 * @returns {Promise<Object>} - Processing status
 */
export async function getProcessingStatus(taskId) {
  if (!taskId) {
    throw new Error('Task ID is required');
  }

  try {
    const response = await fetch(`${API_ENDPOINTS.IMAGE_PROCESS}/${taskId}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Failed to get processing status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting processing status:', error);
    throw error;
  }
}

/**
 * Validate image for processing
 * @param {File} file - The image file to validate
 * @returns {Object} - Validation result with isValid and error message
 */
export function validateImageForProcessing(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Please use JPG or PNG.' };
  }

  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 10MB limit' };
  }

  return { isValid: true };
}

/**
 * Export all image processing utility functions
 */
export default {
  processImage,
  getProcessingStatus,
  validateImageForProcessing
};
