#!/usr/bin/env node
/**
 * Generate lipstick swatch images using AI Image Generator
 * Usage: MINIMAX_API_KEY=your_key node generate-images.mjs
 */

import { ImageGenerator } from '../.agents/skills/ai-image-generator/index.js';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.MINIMAX_API_KEY;

if (!API_KEY) {
    console.error('❌ Error: MINIMAX_API_KEY environment variable is required');
    console.error('\nUsage: MINIMAX_API_KEY=your_key node generate-images.mjs');
    console.error('\nOr export it first:');
    console.error('  export MINIMAX_API_KEY=your_key');
    console.error('  node generate-images.mjs');
    process.exit(1);
}

// Lipstick configurations with optimized prompts
const lipsticks = [
    {
        name: 'coral-peach',
        label: '珊瑚蜜桃',
        prompt: '口红产品特写，珊瑚蜜桃色，柔和的珊瑚粉橙色，水润光泽质地，白色干净背景，专业美妆产品摄影，高清细节，柔和光线，电商主图风格，春季氛围'
    },
    {
        name: 'dusty-rose',
        label: '豆沙玫瑰',
        prompt: '口红产品特写，豆沙玫瑰色，温柔的干枯玫瑰色调，奶油哑光质地，白色干净背景，专业美妆产品摄影，高清细节，柔和光线，电商主图风格，优雅气质'
    },
    {
        name: 'berry-mocha',
        label: '莓果奶茶',
        prompt: '口红产品特写，莓果奶茶色，深玫瑰浆果色调，丝绒哑光质地，白色干净背景，专业美妆产品摄影，高清细节，柔和光线，电商主图风格，甜美深邃'
    },
    {
        name: 'warm-orange-brown',
        label: '橘棕暖阳',
        prompt: '口红产品特写，橘棕色，温暖的南瓜橘棕色调，滋润光泽质地，白色干净背景，专业美妆产品摄影，高清细节，柔和光线，电商主图风格，温暖亲和'
    }
];

async function downloadImage(url, filepath) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
    return filepath;
}

async function generateImages() {
    const generator = new ImageGenerator({
        provider: 'minimax',
        apiKey: API_KEY
    });

    const outputDir = path.dirname(new URL(import.meta.url).pathname);
    const imagesDir = path.join(outputDir, 'images');

    // Ensure images directory exists
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    console.log('💄 春季显白口红图片生成工具\n');
    console.log(`📁 输出目录: ${imagesDir}\n`);

    for (const lipstick of lipsticks) {
        console.log(`🎨 正在生成: ${lipstick.label} (${lipstick.name})`);
        console.log(`   提示词: ${lipstick.prompt.substring(0, 50)}...`);

        try {
            const result = await generator.generate({
                prompt: lipstick.prompt,
                aspect_ratio: '1:1',
                quality: 'standard'
            });

            // Save as PNG (replacing the old SVG)
            const outputPath = path.join(imagesDir, `${lipstick.name}.png`);
            await downloadImage(result.url, outputPath);

            console.log(`   ✅ 已保存: ${outputPath}`);
            console.log(`   📎 图片URL: ${result.url.substring(0, 60)}...\n`);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`   ❌ 生成失败: ${error.message}\n`);
        }
    }

    console.log('🎉 所有图片生成完成!');
    console.log('\n提示: 更新 index.html 中的图片引用为 .png 格式');
}

generateImages().catch(error => {
    console.error('❌ 错误:', error);
    process.exit(1);
});
