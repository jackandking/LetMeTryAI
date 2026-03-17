---
name: vote-app-image-gen
description: Generate themed SVG images for vote app options using AI Image Generator. Creates brand-appropriate illustrations for each option.
---

# Vote App Image Generator

Generate themed images for vote app options using AI Image Generator (MiniMax image-01).

## Usage

```javascript
import { generateOptionImages } from './vote-app-image-gen/index.js';

const images = await generateOptionImages({
  appDirectory: 'fighter-jets',
  brandProfile: 'nanrenbao',
  options: ['F-22', 'J-20', 'Su-57']
});
```

## CLI Usage

```bash
./.agents/skills/vote-app-image-gen/generate.sh fighter-jets nanrenbao "F-22,J-20,Su-57"
```

## Inputs

| Parameter | Type | Description |
|-----------|------|-------------|
| appDirectory | string | Path to app directory |
| brandProfile | string | Brand ID for theme |
| options | string[] | Option labels to generate images for |

## Prompt Templates

### nanrenbao (Military/Tech)
```
[装备类型]产品图，[具体名称]，专业摄影风格，白色干净背景，高清细节，电商主图风格，科技/军事感
```

Examples:
- "战斗机产品图，F-22猛禽战机，专业航空摄影风格，白色干净背景，高清细节，军事装备主图"
- "坦克产品图，M1艾布拉姆斯主战坦克，专业摄影风格，白色背景，高清细节"
- "芯片产品图，高端AI处理器芯片，科技产品摄影风格，白色背景，专业灯光"

### parent-tools (Education)
```
[学习用品]插画，[具体物品]，温馨家庭教育场景，柔和色调，儿童友好风格
```

Examples:
- "学习用品插画，孩子认真做作业场景，温馨家庭教育风格，柔和蓝色调"
- "教育场景插画，家长陪伴孩子阅读，温馨家庭氛围，柔和色调"

### elder-love (Lifestyle)
```
[生活场景]插画，[具体活动]，温暖养老风格，舒适氛围，柔和暖色调
```

Examples:
- "退休生活插画，老人园艺种植场景，温暖阳光风格，舒适氛围"
- "健康早餐插画，营养粥品搭配小菜，温馨早餐场景，暖色调"

### womanai (Beauty)
```
[美妆产品]产品图，[具体产品]，时尚美妆风格，精美细节，柔和打光
```

Examples:
- "口红产品图，珊瑚蜜桃色口红试色，时尚美妆风格，精美细节，柔和灯光"
- "护肤产品图，保湿精华液瓶身，美妆产品摄影风格，白色背景"

## Output

Generates SVG or PNG files in `images/` directory:
```
app-directory/
└── images/
    ├── option-1.svg
    ├── option-2.svg
    └── option-3.svg
```

## Implementation

Uses MiniMax image-01 API via ai-image-generator skill:

```javascript
import { ImageGenerator } from '../ai-image-generator/index.js';

const generator = new ImageGenerator({
  provider: 'minimax',
  apiKey: process.env.MINIMAX_API_KEY
});

const result = await generator.generate({
  prompt: generatedPrompt,
  aspect_ratio: '1:1',
  quality: 'standard'
});
```

## Fallback

If AI generation fails:
1. Use brand-specific placeholder SVG
2. Generate simple colored circles with labels
3. Log error for manual review

## Configuration

Environment variables:
- `MINIMAX_API_KEY` - API key for image generation
- `VOTE_APP_IMAGE_QUALITY` - 'standard' or 'hd'
- `VOTE_APP_IMAGE_SIZE` - '1:1', '4:3', etc.
