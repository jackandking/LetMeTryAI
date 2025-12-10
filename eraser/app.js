// Import utilities
import { uploadFile } from '../util/file-util.js';
import { sendChatMessage } from '../util/ai_utils.js';
import { processImage as processImageAPI, validateImageForProcessing } from '../util/image-processing-util.js';

// DOM elements
let fileInput;
let uploadBtn;
let uploadArea;
let previewArea;
let originalImage;
let processBtn;
let resetBtn;
let uploadSection;
let processingSection;
let resultSection;
let processedImage;
let downloadImageBtn;
let downloadPdfBtn;
let newProcessBtn;

// State
let selectedFile = null;
let processedImageData = null;
let processedImageUrl = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    setupEventListeners();
});

function initializeElements() {
    fileInput = document.getElementById('fileInput');
    uploadBtn = document.getElementById('uploadBtn');
    uploadArea = document.getElementById('uploadArea');
    previewArea = document.getElementById('previewArea');
    originalImage = document.getElementById('originalImage');
    processBtn = document.getElementById('processBtn');
    resetBtn = document.getElementById('resetBtn');
    uploadSection = document.getElementById('uploadSection');
    processingSection = document.getElementById('processingSection');
    resultSection = document.getElementById('resultSection');
    processedImage = document.getElementById('processedImage');
    downloadImageBtn = document.getElementById('downloadImageBtn');
    downloadPdfBtn = document.getElementById('downloadPdfBtn');
    newProcessBtn = document.getElementById('newProcessBtn');
}

function setupEventListeners() {
    // Upload button click
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Upload area click
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Process button
    processBtn.addEventListener('click', processImage);
    
    // Reset button
    resetBtn.addEventListener('click', resetUpload);
    
    // Download buttons
    downloadImageBtn.addEventListener('click', downloadAsImage);
    downloadPdfBtn.addEventListener('click', downloadAsPdf);
    
    // New process button
    newProcessBtn.addEventListener('click', resetUpload);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        validateAndPreviewFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = event.dataTransfer.files[0];
    if (file) {
        validateAndPreviewFile(file);
    }
}

function validateAndPreviewFile(file) {
    // Use the centralized validation function
    const validation = validateImageForProcessing(file);
    
    if (!validation.isValid) {
        alert(validation.error);
        return;
    }
    
    selectedFile = file;
    
    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        originalImage.src = e.target.result;
        uploadArea.style.display = 'none';
        previewArea.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function resetUpload() {
    selectedFile = null;
    processedImageData = null;
    processedImageUrl = null;
    fileInput.value = '';
    
    uploadArea.style.display = 'block';
    previewArea.classList.add('hidden');
    processingSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
}

async function processImage() {
    if (!selectedFile) {
        alert('请先选择图片！');
        return;
    }
    
    try {
        // Show processing section
        uploadSection.classList.add('hidden');
        processingSection.classList.remove('hidden');
        
        // Upload image
        console.log('Uploading image...');
        const uploadResult = await uploadFile(selectedFile, 'eraser');
        console.log('Upload result:', uploadResult);
        
        if (!uploadResult || !uploadResult.filename) {
            throw new Error('图片上传失败');
        }
        
        const imageUrl = `${window.BASE_URL}/${uploadResult.filename}`;
        console.log('Image URL:', imageUrl);
        
        // Process image using professional image processing API
        console.log('Processing image with professional API...');
        const processingOptions = {
            mode: 'eraser',
            preservePinyin: true,
            preserveGrid: true
        };
        
        let processedUrl;
        try {
            // Try to use the professional image processing API
            const result = await processImageAPI(imageUrl, processingOptions);
            processedUrl = result.processedImageUrl;
            console.log('Image processed successfully:', result);
        } catch (apiError) {
            // Fallback to simulation if API is not available
            console.warn('Image processing API unavailable, using fallback:', apiError.message);
            
            // Send to AI for guidance as a fallback
            const prompt = `这是一张田字格汉字练习图片。图片链接: ${imageUrl}
            
            请描述如何处理这张图片：
            1. 保留所有拼音（通常在田字格上方）
            2. 擦除田字格中的汉字
            3. 保留田字格的线条结构
            
            请简要说明处理思路。`;
            
            const aiResponse = await sendChatMessage(prompt);
            console.log('AI guidance:', aiResponse);
            
            // Use simulation as fallback
            processedUrl = await simulateImageProcessing(imageUrl, aiResponse.response);
        }
        
        processedImageUrl = processedUrl;
        processedImage.src = processedUrl;
        
        // Show result section
        processingSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error processing image:', error);
        alert('处理失败：' + error.message);
        processingSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    }
}

// Simulate image processing (demonstration only)
// NOTE: This is a placeholder implementation. In production, this would:
// 1. Use computer vision (OCR) to detect Chinese characters and pinyin
// 2. Preserve grid lines and pinyin while erasing characters
// 3. Return a properly processed image via a specialized API
async function simulateImageProcessing(imageUrl, aiGuidance = '') {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            // Draw original image
            ctx.drawImage(img, 0, 0);
            
            // Add overlay indicating this is a demo
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillRect(20, 20, 380, 120);
            
            ctx.fillStyle = 'rgba(102, 126, 234, 1)';
            ctx.font = 'bold 22px Arial';
            ctx.fillText('🔄 示例处理预览', 40, 50);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.font = '16px Arial';
            ctx.fillText('完整功能需要图像处理API', 40, 80);
            ctx.fillText('当前显示为演示版本', 40, 105);
            
            const processedDataUrl = canvas.toDataURL('image/png');
            resolve(processedDataUrl);
        };
        img.onerror = () => {
            // Fallback if can't load image
            resolve(imageUrl);
        };
        img.src = imageUrl;
    });
}

function downloadAsImage() {
    if (!processedImageUrl) {
        alert('没有可下载的图片！');
        return;
    }
    
    const link = document.createElement('a');
    link.href = processedImageUrl;
    link.download = `eraser-${Date.now()}.png`;
    link.click();
}

async function downloadAsPdf() {
    if (!processedImageUrl) {
        alert('没有可下载的PDF！');
        return;
    }
    
    // PDF generation requires jsPDF library or similar
    // Users can use print-to-PDF as a workaround
    alert('PDF下载功能开发中...\n\n临时方案：\n1. 先下载图片\n2. 使用浏览器的"打印"功能\n3. 选择"另存为PDF"来生成PDF文件\n\n或者将图片插入Word文档后保存为PDF。');
}

// Export functions for testing
export {
    initializeElements,
    setupEventListeners,
    validateAndPreviewFile,
    resetUpload,
    processImage
};
