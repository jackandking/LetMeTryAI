/**
 * AI Image Generator
 * 支持 MiniMax image-01, OpenAI DALL-E, Stable Diffusion
 */

class ImageGenerator {
  constructor(config = {}) {
    this.provider = config.provider || 'minimax';
    this.apiKey = config.apiKey || process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY;
    this.baseUrl = config.baseUrl || this.getDefaultBaseUrl();
    this.timeout = config.timeout || 60000; // 图像生成需要更长时间
    this.defaultSize = '1024x1024';
    this.defaultQuality = 'standard';
  }

  getDefaultBaseUrl() {
    const urls = {
      minimax: 'https://api.minimax.chat',
      openai: 'https://api.openai.com/v1',
      'stable-diffusion': 'http://localhost:7860'
    };
    return urls[this.provider] || urls.minimax;
  }

  /**
   * 生成图片
   * @param {Object} options - 生成选项
   * @param {string} options.prompt - 图片描述提示词
   * @param {string} [options.aspect_ratio] - 宽高比: 1:1, 16:9, 4:3, 3:2, 2:3, 3:4, 9:16, 21:9
   * @param {string} [options.size] - 图片尺寸 (兼容旧版)
   * @param {string} [options.quality] - 质量: standard, hd
   * @param {string} [options.style] - 风格: natural, vivid
   * @param {number} [options.n] - 生成数量
   * @returns {Promise<Object>} 生成结果
   */
  async generate(options = {}) {
    const {
      prompt,
      aspect_ratio,
      size = this.defaultSize,
      quality = this.defaultQuality,
      style = 'natural',
      n = 1
    } = options;

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const providers = {
      minimax: () => this.generateMiniMax({ prompt, aspect_ratio, quality }),
      openai: () => this.generateOpenAI({ prompt, size, quality, n }),
      'stable-diffusion': () => this.generateStableDiffusion({ prompt, size, style })
    };

    const generator = providers[this.provider];
    if (!generator) {
      throw new Error(`Unsupported provider: ${this.provider}`);
    }

    return generator();
  }

  /**
   * 使用 MiniMax image-01 生成图片
   * API文档: https://platform.minimax.cn/document/API%20Documents/Image-Generation
   */
  async generateMiniMax(options) {
    const { prompt, aspect_ratio = '1:1', quality = 'standard' } = options;

    // 转换 aspect_ratio 格式
    let ratio = aspect_ratio;
    if (sizeToAspectRatio[aspect_ratio]) {
      ratio = sizeToAspectRatio[aspect_ratio];
    }

    const requestBody = {
      model: 'image-01',
      prompt,
      aspect_ratio: ratio,
      ...(quality && { quality })
    };

    console.log('[MiniMax] Generating image with:', { model: 'image-01', aspect_ratio: ratio, prompt: prompt.substring(0, 50) + '...' });

    const response = await this.makeRequest('/v1/image_generation', requestBody, 'minimax');
    
    if (response.base_resp && response.base_resp.status_code !== 0) {
      throw new Error(response.base_resp.status_msg || 'MiniMax API error');
    }

    return {
      url: response.data?.image_urls?.[0] || response.data?.[0]?.url,
      revisedPrompt: prompt,
      created: Date.now(),
      provider: 'minimax',
      imageId: response.id
    };
  }

  /**
   * 使用 OpenAI DALL-E 生成图片
   */
  async generateOpenAI(options) {
    const { prompt, size = '1024x1024', quality = 'standard', n = 1 } = options;

    const requestBody = {
      model: quality === 'hd' ? 'dall-e-3' : 'dall-e-2',
      prompt,
      size,
      quality,
      n: Math.min(n, 10)
    };

    const response = await this.makeRequest('/images/generations', requestBody, 'openai');
    
    return {
      url: response.data?.[0]?.url,
      revisedPrompt: response.data?.[0]?.revised_prompt || prompt,
      created: response.created,
      provider: 'openai'
    };
  }

  /**
   * 使用 Stable Diffusion 生成图片
   */
  async generateStableDiffusion(options) {
    const { prompt, size = '1024x1024', style } = options;
    const [width, height] = size.split('x').map(Number);

    const requestBody = {
      prompt,
      negative_prompt: 'low quality, blurry, distorted, watermark, text',
      width,
      height,
      steps: 30,
      cfg_scale: 7,
      ...(style && { sampler_index: style })
    };

    const response = await this.makeRequest('/sdapi/v1/txt2img', requestBody, 'stable-diffusion');
    
    return {
      url: `data:image/png;base64,${response.images?.[0]}`,
      revisedPrompt: prompt,
      created: Date.now(),
      provider: 'stable-diffusion'
    };
  }

  /**
   * 发送 API 请求
   */
  async makeRequest(endpoint, body, provider = this.provider) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (provider === 'openai') {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    } else if (provider === 'minimax') {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * 批量生成图片
   * @param {string[]} prompts - 提示词数组
   * @param {Object} options - 生成选项
   * @returns {Promise<Object[]>} 生成结果数组
   */
  async generateBatch(prompts, options = {}) {
    const results = [];
    
    for (const prompt of prompts) {
      try {
        const result = await this.generate({ prompt, ...options });
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate image for prompt: ${prompt}`, error.message);
        results.push({ error: error.message, prompt });
      }
    }
    
    return results;
  }

  /**
   * 下载图片到文件
   * @param {string} url - 图片URL
   * @param {string} filepath - 保存路径
   * @returns {Promise<string>} 文件路径
   */
  async downloadImage(url, filepath) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    const fs = await import('fs');
    fs.writeFileSync(filepath, Buffer.from(buffer));
    
    return filepath;
  }
}

// 尺寸到宽高比的映射
const sizeToAspectRatio = {
  '1024x1024': '1:1',
  '512x512': '1:1',
  '256x256': '1:1',
  '1024x576': '16:9',
  '768x512': '3:2',
  '512x768': '2:3',
  '512x682': '3:4',
  '576x1024': '9:16',
  '1024x435': '21:9'
};

// 支持的宽高比
ImageGenerator.SUPPORTED_ASPECT_RATIOS = ['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9'];

// 同时支持 ES module 和 CommonJS 导出
export { ImageGenerator };
export default ImageGenerator;

// CommonJS 兼容
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ImageGenerator };
  module.exports.default = ImageGenerator;
}
