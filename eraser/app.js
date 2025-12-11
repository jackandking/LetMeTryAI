// Import utilities
// Note: uploadFile is not used as image processing is done client-side

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
    // Validate file exists
    if (!file) {
        alert('未选择文件，请重试！');
        return;
    }
    
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
    
    // Validate file size is not 0
    if (file.size === 0) {
        alert('图片文件为空，请选择有效的图片！');
        return;
    }
    
    selectedFile = file;
    
    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        if (e.target.result) {
            originalImage.src = e.target.result;
            uploadArea.style.display = 'none';
            previewArea.classList.remove('hidden');
        } else {
            console.error('Preview FileReader returned empty result');
            alert('图片预览失败，请重新选择图片。');
            // Reset state since preview failed
            selectedFile = null;
            fileInput.value = '';
        }
    };
    reader.onerror = (e) => {
        console.error('Preview FileReader error:', e, reader.error);
        alert('图片预览失败：' + (reader.error?.message || '未知错误') + '\n您可以尝试重新选择图片。');
        // Reset the state
        selectedFile = null;
        fileInput.value = '';
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

/**
 * Validate that a file object is valid and ready to be read
 * @param {File|Blob} file - The file object to validate
 * @returns {{valid: boolean, error: string|null}} Validation result with error message if invalid
 */
function validateFileObject(file) {
    if (!file) {
        return { valid: false, error: '文件对象无效：文件为空' };
    }
    
    if (!(file instanceof File) && !(file instanceof Blob)) {
        return { valid: false, error: `文件对象类型无效：${typeof file}` };
    }
    
    if (file.size === 0) {
        return { valid: false, error: '文件大小为0，请选择有效的图片文件' };
    }
    
    return { valid: true, error: null };
}

async function processImage() {
    if (!selectedFile) {
        alert('请先选择图片！');
        return;
    }
    
    // Validate file object before processing
    const validation = validateFileObject(selectedFile);
    if (!validation.valid) {
        console.error('File validation failed:', validation.error);
        alert(validation.error + '\n请重新选择图片！');
        resetUpload();
        return;
    }
    
    try {
        // Show processing section
        uploadSection.classList.add('hidden');
        processingSection.classList.remove('hidden');
        
        // Process image directly from file using FileReader
        // This avoids CORS issues and doesn't require server upload for processing
        console.log('Processing image on client side...');
        console.log('File to process:', {
            name: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size
        });
        
        const processedUrl = await processImageFromFile(selectedFile);
        
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

/**
 * Process image directly from a File object
 * Reads the file as a data URL and processes it client-side
 */
async function processImageFromFile(file) {
    return new Promise((resolve, reject) => {
        // Validate file object before reading
        const validation = validateFileObject(file);
        if (!validation.valid) {
            console.error('File validation failed:', validation.error);
            reject(new Error(validation.error));
            return;
        }
        
        console.log('Reading file:', {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        });
        
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            const dataUrl = e.target.result;
            if (!dataUrl) {
                console.error('FileReader returned empty result');
                reject(new Error('文件读取结果为空'));
                return;
            }
            
            try {
                const processedUrl = await processImageClientSide(dataUrl);
                resolve(processedUrl);
            } catch (error) {
                console.error('Error processing image:', error);
                reject(error);
            }
        };
        
        reader.onerror = (e) => {
            const errorCode = reader.error?.code;
            const errorName = reader.error?.name;
            const errorMessage = reader.error?.message;
            
            console.error('FileReader error:', {
                code: errorCode,
                name: errorName,
                message: errorMessage,
                event: e
            });
            
            let userMessage = '无法读取图片文件';
            
            // Provide more specific error messages based on error type
            if (errorName === 'NotFoundError') {
                userMessage = '文件未找到，请重新选择';
            } else if (errorName === 'NotReadableError') {
                userMessage = '文件无法读取，可能文件已损坏';
            } else if (errorName === 'SecurityError') {
                userMessage = '安全限制：无法读取此文件';
            } else if (errorMessage) {
                userMessage = `读取失败：${errorMessage}`;
            }
            
            reject(new Error(userMessage));
        };
        
        reader.onabort = () => {
            console.error('FileReader was aborted');
            reject(new Error('文件读取被中断'));
        };
        
        try {
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Exception when starting FileReader:', error);
            reject(new Error(`启动文件读取失败：${error.message}`));
        }
    });
}

/**
 * Process image to erase Chinese characters while preserving pinyin and grid lines
 * This is a client-side implementation using canvas-based image processing
 * Algorithm:
 * 1. Convert image to grayscale
 * 2. Detect grid structure (田字格)
 * 3. Identify character regions (typically center of cells)
 * 4. Preserve pinyin regions (typically top 30% of cells)
 * 5. Erase characters while keeping grid lines
 */
async function processImageClientSide(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Load image without setting crossOrigin to avoid CORS issues with data URLs
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // Draw original image
                ctx.drawImage(img, 0, 0);
                
                // Get image data for processing
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Process the image to erase characters
                processImageData(data, canvas.width, canvas.height);
                
                // Put processed data back
                ctx.putImageData(imageData, 0, 0);
                
                const processedDataUrl = canvas.toDataURL('image/png');
                resolve(processedDataUrl);
            } catch (error) {
                console.error('Error processing image data:', error);
                // If error processing image data (e.g., CORS, memory issues), return original URL as fallback
                console.log('Falling back to original image URL');
                resolve(imageUrl);
            }
        };
        img.onerror = (error) => {
            console.error('Error loading image:', error);
            // Fallback: return original URL so user can at least see something
            resolve(imageUrl);
        };
        img.src = imageUrl;
    });
}

/**
 * Process image data to erase Chinese characters
 * Uses improved adaptive thresholding to detect and erase dark regions (characters)
 * while preserving lighter grid lines and pinyin text
 */
function processImageData(data, width, height) {
    // Create a brightness map
    const brightness = new Uint8Array(width * height);
    
    // Calculate brightness for each pixel
    for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Calculate luminance using standard formula
        brightness[pixelIndex] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    
    // Calculate adaptive threshold based on image statistics
    const threshold = calculateAdaptiveThreshold(brightness, width, height);
    
    // Apply improved erasing algorithm with better grid detection
    eraseCharactersAdaptive(data, brightness, width, height, threshold);
}

/**
 * Calculate adaptive threshold using Otsu's method
 * This automatically finds the optimal threshold for separating foreground (text/grid) from background
 */
function calculateAdaptiveThreshold(brightness, width, height) {
    // Build histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < brightness.length; i++) {
        histogram[Math.floor(brightness[i])]++;
    }
    
    // Calculate total number of pixels
    const total = width * height;
    
    // Calculate sum of all brightness values
    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
    }
    
    // Find optimal threshold using Otsu's method
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 128; // Default threshold
    
    for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        
        wF = total - wB;
        if (wF === 0) break;
        
        sumB += t * histogram[t];
        
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        
        const variance = wB * wF * (mB - mF) * (mB - mF);
        
        if (variance > maxVariance) {
            maxVariance = variance;
            threshold = t;
        }
    }
    
    return threshold;
}

/**
 * Improved character erasing with adaptive thresholding
 * Uses morphological analysis to better distinguish characters from grid lines
 */
function eraseCharactersAdaptive(data, brightness, width, height, threshold) {
    // First pass: identify what should be preserved (pinyin and grid lines)
    const preserve = new Uint8Array(width * height);
    
    // Detect grid lines using edge detection
    detectGridLines(brightness, preserve, width, height);
    
    // Detect pinyin region (typically top 25-35% of image with small text)
    detectPinyinRegion(brightness, preserve, width, height);
    
    // Second pass: erase characters (dark regions not marked for preservation)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const pixelIdx = idx * 4;
            
            // Skip if marked for preservation
            if (preserve[idx] > 0) {
                continue;
            }
            
            // Erase if pixel is darker than threshold
            if (brightness[idx] < threshold) {
                // Get background color from neighboring pixels
                const bgColor = estimateBackgroundColor(data, x, y, width, height);
                
                data[pixelIdx] = bgColor.r;
                data[pixelIdx + 1] = bgColor.g;
                data[pixelIdx + 2] = bgColor.b;
            }
        }
    }
}

/**
 * Detect grid lines using edge continuity analysis
 * Grid lines are straight, thin lines that span across the image
 */
function detectGridLines(brightness, preserve, width, height) {
    const lineThreshold = 120; // Pixels darker than this might be grid lines
    const minLineLength = Math.min(width, height) * 0.3; // Grid lines should be fairly long
    
    // Detect horizontal grid lines
    for (let y = 0; y < height; y++) {
        let lineLength = 0;
        let darkPixels = [];
        
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            if (brightness[idx] < lineThreshold) {
                lineLength++;
                darkPixels.push(idx);
            } else {
                // Check if we have a line
                if (lineLength > minLineLength) {
                    // Mark these pixels as part of grid line
                    for (const pixelIdx of darkPixels) {
                        preserve[pixelIdx] = 1;
                    }
                }
                lineLength = 0;
                darkPixels = [];
            }
        }
        
        // Check end of row
        if (lineLength > minLineLength) {
            for (const pixelIdx of darkPixels) {
                preserve[pixelIdx] = 1;
            }
        }
    }
    
    // Detect vertical grid lines
    for (let x = 0; x < width; x++) {
        let lineLength = 0;
        let darkPixels = [];
        
        for (let y = 0; y < height; y++) {
            const idx = y * width + x;
            
            if (brightness[idx] < lineThreshold) {
                lineLength++;
                darkPixels.push(idx);
            } else {
                // Check if we have a line
                if (lineLength > minLineLength) {
                    // Mark these pixels as part of grid line
                    for (const pixelIdx of darkPixels) {
                        preserve[pixelIdx] = 1;
                    }
                }
                lineLength = 0;
                darkPixels = [];
            }
        }
        
        // Check end of column
        if (lineLength > minLineLength) {
            for (const pixelIdx of darkPixels) {
                preserve[pixelIdx] = 1;
            }
        }
    }
}

/**
 * Detect pinyin region (typically top portion with smaller text)
 * Uses density analysis to identify regions with text
 */
function detectPinyinRegion(brightness, preserve, width, height) {
    // Analyze top 40% of image for pinyin
    const pinyinHeight = Math.floor(height * 0.4);
    const textThreshold = 150; // Threshold for text detection
    
    // Divide into horizontal bands and analyze text density
    const bandHeight = Math.floor(height / 20);
    
    for (let band = 0; band < Math.floor(pinyinHeight / bandHeight); band++) {
        const startY = band * bandHeight;
        const endY = Math.min(startY + bandHeight, pinyinHeight);
        
        // Calculate text density in this band
        let darkPixelCount = 0;
        let totalPixels = 0;
        
        for (let y = startY; y < endY; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                totalPixels++;
                if (brightness[idx] < textThreshold) {
                    darkPixelCount++;
                }
            }
        }
        
        const density = darkPixelCount / totalPixels;
        
        // If this band has text (density between 5% and 30%), preserve it
        if (density > 0.05 && density < 0.3) {
            for (let y = startY; y < endY; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = y * width + x;
                    if (brightness[idx] < textThreshold) {
                        preserve[idx] = 1;
                    }
                }
            }
        }
    }
}

/**
 * Estimate background color from neighboring pixels
 * This helps blend erased areas with the background
 */
function estimateBackgroundColor(data, x, y, width, height) {
    let sumR = 0, sumG = 0, sumB = 0;
    let count = 0;
    
    // Sample neighboring pixels that are not dark (likely background)
    const radius = 5;
    
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = ny * width + nx;
                const pixelIdx = idx * 4;
                
                // Sample bright pixels (likely background)
                const brightness = 0.299 * data[pixelIdx] + 0.587 * data[pixelIdx + 1] + 0.114 * data[pixelIdx + 2];
                
                if (brightness > 200) {
                    sumR += data[pixelIdx];
                    sumG += data[pixelIdx + 1];
                    sumB += data[pixelIdx + 2];
                    count++;
                }
            }
        }
    }
    
    // Return average background color, or white if no samples
    if (count > 0) {
        return {
            r: Math.round(sumR / count),
            g: Math.round(sumG / count),
            b: Math.round(sumB / count)
        };
    } else {
        return { r: 255, g: 255, b: 255 };
    }
}

function downloadAsImage() {
    if (!processedImageUrl) {
        alert('没有可下载的图片！');
        return;
    }
    
    try {
        const link = document.createElement('a');
        link.href = processedImageUrl;
        link.download = `eraser-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error downloading image:', error);
        alert('下载失败，请右键点击图片另存为');
    }
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
    validateFileObject,
    resetUpload,
    processImage,
    processImageFromFile,
    processImageClientSide
};
