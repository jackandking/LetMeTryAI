// AI utility functions for chat integration

export const API_ENDPOINT = 'https://43.143.241.181/lws/ai/chat';

// Error messages
export const ERROR_MESSAGES = {
  REQUEST_FAILED: 'Request to AI chat API failed',
  INVALID_PARAMS: 'Invalid parameters provided'
};

/**
 * Send a message to the AI chat service
 * @param {string} message - The message to send to the AI
 * @returns {Promise<Object>} - The chat response data
 */
export async function sendChatMessage(message) {
  if (!message) {
    throw new Error(ERROR_MESSAGES.INVALID_PARAMS);
  }
  console.log('Sending message to AI:', message);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error(ERROR_MESSAGES.REQUEST_FAILED);
    }

    const data = await response.json();
    console.log('AI response:', data);
    
    if (data.success) {
      console.log('AI response:', data.response);
      return {
        response: data.response,
        timestamp: data.timestamp
      };
    } else {
      console.error('AI request failed:', data);
      throw new Error(data.error || ERROR_MESSAGES.REQUEST_FAILED);
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