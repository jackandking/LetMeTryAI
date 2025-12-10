// Import utilities
import { uploadFile } from '../util/file-util.js';
import { sendChatMessage } from '../util/ai_utils.js';

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
    // Validate file type
    if (!file.type.match('image/(jpeg|jpg|png)')) {
        alert('请上传 JPG 或 PNG 格式的图片！');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('图片大小不能超过 10MB！');
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
        
        // Send to AI for processing
        const prompt = `请分析这张田字格汉字练习图片。这是一张包含拼音和汉字的练习册图片。
        
        你的任务是：
        1. 识别图片中的所有文字内容
        2. 保留所有拼音（通常在上方）
        3. 将田字格中的汉字擦除/替换为空白
        4. 保留田字格的线条结构
        
        图片链接: ${imageUrl}
        
        请生成一张处理后的图片，并返回图片的URL或base64数据。`;
        
        console.log('Sending to AI:', prompt);
        const aiResponse = await sendChatMessage(prompt);
        console.log('AI response:', aiResponse);
        
        // Parse AI response for image
        // The AI should return either a URL or instructions
        // For now, we'll use a simulated response
        const processedUrl = await simulateImageProcessing(imageUrl);
        
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

// Simulate image processing (in real implementation, this would be done by AI)
async function simulateImageProcessing(imageUrl) {
    // In a real implementation, the AI would process the image and return a new URL
    // For now, we'll simulate by creating a canvas and drawing instructions
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
            
            // Add overlay text (simulation)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '20px Arial';
            ctx.fillText('处理后的图片预览', 50, 50);
            ctx.fillText('(实际处理由AI完成)', 50, 80);
            
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
    
    // For PDF generation, we would use jsPDF or similar library
    // For now, we'll show an alert
    alert('PDF下载功能开发中...\n\n您可以先下载图片，然后使用系统自带的打印功能选择"另存为PDF"来生成PDF文件。');
}

// Export functions for testing
export {
    initializeElements,
    setupEventListeners,
    validateAndPreviewFile,
    resetUpload,
    processImage
};
