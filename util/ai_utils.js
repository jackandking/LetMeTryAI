// AI utility functions for chat integration

import { API_ENDPOINTS } from './config.js';

export const API_ENDPOINT = API_ENDPOINTS.AI_CHAT;

// Error messages
export const ERROR_MESSAGES = {
  REQUEST_FAILED: 'Request to AI chat API failed',
  INVALID_PARAMS: 'Invalid parameters provided',
  API_KEY_MISSING: 'DeepSeek API key is not configured'
};

// AI utility functions for chat integration with DeepSeek API

import { API_ENDPOINTS } from './config.js';

export const API_ENDPOINT = API_ENDPOINTS.AI_CHAT;

// Error messages
export const ERROR_MESSAGES = {
  REQUEST_FAILED: 'Request to AI chat API failed',
  INVALID_PARAMS: 'Invalid parameters provided',
  API_KEY_MISSING: 'DeepSeek API key is not configured'
};

/**
 * Get the DeepSeek API key from environment or throw an error
 * @returns {string} - The API key
 * @throws {Error} - If API key is not found
 */
function getApiKey() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(ERROR_MESSAGES.API_KEY_MISSING);
  }
  return apiKey;
}

/**
 * Send a message to the DeepSeek AI chat service
 * @param {string} message - The message to send to the AI
 * @returns {Promise<Object>} - The chat response data
 */
export async function sendChatMessage(message) {
  if (!message) {
    throw new Error(ERROR_MESSAGES.INVALID_PARAMS);
  }
  console.log('Sending message to DeepSeek AI:', message);

  try {
    const apiKey = getApiKey();
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 2048,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || ERROR_MESSAGES.REQUEST_FAILED;
      throw new Error(`${ERROR_MESSAGES.REQUEST_FAILED}: ${errorMessage}`);
    }

    const data = await response.json();
    console.log('DeepSeek AI response:', data);
    
    if (data.choices && data.choices.length > 0) {
      const aiResponse = data.choices[0].message.content;
      console.log('AI response:', aiResponse);
      return {
        response: aiResponse,
        timestamp: new Date().toISOString(),
        usage: data.usage || {}
      };
    } else {
      console.error('Unexpected AI response format:', data);
      throw new Error(ERROR_MESSAGES.REQUEST_FAILED);
    }
  } catch (error) {
    console.error('Chat request failed:', error);
    throw error;
  }
}

/**
 * Generate an innovative prompt based on a base prompt
 * @param {string} basePrompt - The base prompt to enhance
 * @param {number} creativityFactor - How much to modify the prompt (0-1)
 * @param {function} callback - Callback with (error, newPrompt)
 */
export function generateInnovativePrompt(basePrompt, creativityFactor, callback) {
  if (!basePrompt || typeof creativityFactor !== 'number' || creativityFactor < 0 || creativityFactor > 1) {
    console.log('[AI] Invalid parameters for generateInnovativePrompt', { 
      basePrompt: basePrompt, 
      creativityFactor: creativityFactor 
    });
    return callback(new Error('Invalid parameters'));
  }

  const prompt = `To make the generated photo be more attractive to women, take this creative prompt and enhance it with creativity level ${creativityFactor}: ${basePrompt}. only return the enhanced prompt. no extra notes in the response.`;
  console.log('[AI] Sending prompt to AI service', { 
    basePrompt: basePrompt, 
    creativityFactor: creativityFactor,
    fullPrompt: prompt
  });
  
  sendChatMessage(prompt)
    .then(response => {
      console.log('[AI] Received response from AI service', {
        originalPrompt: basePrompt,
        response: response.response
      });
      callback(null, response.response);
    })
    .catch(error => {
      console.log('[AI] Error generating innovative prompt', {
        error: error.message,
        stack: error.stack,
        basePrompt: basePrompt
      });
      callback(error);
    });
}