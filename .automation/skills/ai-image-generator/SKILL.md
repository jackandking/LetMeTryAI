---
name: ai-image-generator
description: AI图像生成能力，支持调用MiniMax image-01、OpenAI DALL-E等图像生成API创建图片。适用于需要动态生成图片素材的场景，如社交媒体配图、创意设计等。
---

# AI Image Generator

AI图像生成技能，调用AI API根据文字描述生成图片。

## 支持的API

- **MiniMax image-01** - 默认推荐，支持中文提示词，支持多种宽高比
- **OpenAI DALL-E** - 英文提示词效果最佳
- **Stable Diffusion** - 本地部署方案

## 快速开始

### 基本用法

```javascript
import { ImageGenerator } from './ai-image-generator/index.js';

const generator = new ImageGenerator({
  provider: 'minimax', // 或 'openai', 'stable-diffusion'
  apiKey: process.env.MINIMAX_API_KEY
});

// 生成图片 - MiniMax image-01
const result = await generator.generate({
  prompt: '一只可爱的橘猫坐在窗台上，阳光透过窗户照进来',
  aspect_ratio: '1:1'  // 可选: 1:1, 16:9, 4:3, 3:2, 2:3, 3:4, 9:16, 21:9
});

console.log('生成的图片:', result.url);
```

### 在Agent中使用

```javascript
// 作为Agent的工具能力
const agent = new Agent({
  skills: ['ai-image-generator']
});

// Agent可以直接调用
await agent.execute('生成一张科技感的未来城市图片');
```

## API参考

### ImageGenerator

#### 构造函数

```javascript
new ImageGenerator(config)
```

**config参数:**
- `provider` - API提供商: `'minimax' | 'openai' | 'stable-diffusion'`
- `apiKey` - API密钥
- `baseUrl` - 自定义API地址(可选)
- `timeout` - 请求超时时间(默认60000ms)

#### generate(options)

生成图片

**options参数:**
- `prompt` - 图片描述提示词 (必需)
- `aspect_ratio` - 宽高比: `'1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9'`
- `quality` - 质量: `'standard' | 'hd'`
- `style` - 风格 (SD): `'natural' | 'vivid' | 'artistic'`
- `n` - 生成数量 (DALL-E)

**返回值:**
```javascript
{
  url: string,           // 图片URL
  revisedPrompt: string, // 提示词
  created: number,       // 创建时间戳
  provider: string,      // 使用的API提供商
  imageId: string       // 图像ID (MiniMax)
}
```

#### generateBatch(prompts)

批量生成图片

```javascript
const results = await generator.generateBatch([
  '蓝天白云',
  '夕阳西下',
  '星空璀璨'
]);
```

## MiniMax image-01 API 配置

```javascript
// 使用MiniMax image-01 API
const generator = new ImageGenerator({
  provider: 'minimax',
  apiKey: process.env.MINIMAX_API_KEY
});
```

**环境变量:**
```bash
# .env
MINIMAX_API_KEY=your_api_key_here
```

### 支持的宽高比

| 宽高比 | 说明 |
|--------|------|
| 1:1 | 正方形 |
| 16:9 | 宽屏 |
| 4:3 | 标准 |
| 3:2 | 横向 |
| 2:3 | 竖向 |
| 3:4 | 竖版 |
| 9:16 | 竖屏 (手机) |
| 21:9 | 超宽屏 |

## 提示词技巧

### 优质提示词结构

```
[主体] + [场景/环境] + [风格] + [光线] + [色彩] + [构图]
```

### 示例

| 场景 | 提示词 |
|------|--------|
| 人物肖像 | 年轻女性肖像，自然光线，柔和色调，浅景深，工作室风格 |
| 风景 | 日落时的海滩，金色阳光，倒影，印象派风格 |
| 产品 | 极简主义产品摄影，白色背景，专业灯光，电商主图 |
| 动漫 | 二次元少女，粉色头发，大眼睛，动漫风格，精致细节 |

### 常用风格关键词

- **写实**: photorealistic, realistic, photography, 写实风格
- **动漫**: anime, manga, illustration, cartoon, 动漫风格
- **油画**: oil painting, canvas, artistic, 油画风格
- **水彩**: watercolor, soft, delicate, 水彩风格
- **科技**: futuristic, cyberpunk, technological, 科技感
- **复古**: vintage, retro, classic, 复古风格

### 避免的事项

1. ❌ 避免过于复杂的描述
2. ❌ 避免矛盾的元素
3. ❌ 避免版权人物或品牌
4. ✅ 使用具体明确的名词
5. ✅ 添加风格关键词
6. ✅ 说明光线和色彩

## 错误处理

```javascript
try {
  const result = await generator.generate({
    prompt: '你的提示词'
  });
} catch (error) {
  if (error.message.includes('invalid params')) {
    console.error('参数错误，请检查宽高比是否正确');
  } else if (error.message.includes('timeout')) {
    console.error('请求超时，请稍后重试');
  } else if (error.message.includes('rate limit')) {
    console.error('请求频率超限，请稍后重试');
  } else if (error.message.includes('content policy')) {
    console.error('内容不符合政策');
  } else {
    console.error('生成失败:', error.message);
  }
}
```

## 完整示例

```javascript
import { ImageGenerator } from './ai-image-generator/index.js';
import fs from 'fs';

async function main() {
  const generator = new ImageGenerator({
    provider: 'minimax',
    apiKey: process.env.MINIMAX_API_KEY
  });

  // 单张图片生成
  console.log('正在生成图片...');
  const result = await generator.generate({
    prompt: '一只可爱的橘猫坐在窗台上，阳光透过窗户照进来，温暖治愈的氛围',
    aspect_ratio: '16:9',
    quality: 'standard'
  });

  console.log('✅ 图片生成成功!');
  console.log('📎 图片URL:', result.url);
  console.log('🆔 图像ID:', result.imageId);

  // 下载图片
  const filename = `generated_${Date.now()}.png`;
  await generator.downloadImage(result.url, filename);
  console.log('💾 图片已保存到:', filename);
}

main();
```

## 注意事项

1. **API配额**: 留意API的调用配额和费用
2. **内容政策**: 确保提示词符合API的内容政策
3. **异步下载**: 生成的URL可能有有效期，建议及时下载保存
4. **网络环境**: 确保API访问的网络环境稳定
5. **错误重试**: 建议实现重试机制应对网络波动
6. **宽高比**: MiniMax image-01 支持特定的宽高比，请参考上表
