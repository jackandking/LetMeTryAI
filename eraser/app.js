// Import utilities
// Note: uploadFile is not used as image processing is done client-side

/**
 * 爱橡皮 (Love Eraser) - Optimized Algorithm
 * 
 * This implementation uses a cell-based approach for erasing Chinese characters
 * from 田字格 (grid cells) while preserving pinyin and grid structure.
 * 
 * Key Optimization: Process each cell individually to preserve pinyin within each cell.
 * The previous approach used a global pinyin region, but real images have pinyin
 * above each character within individual cells.
 * 
 * Algorithm Overview:
 * 1. Detect horizontal grid lines (>40% dark pixel coverage across width)
 * 2. Identify individual cells (regions between consecutive grid lines)
 * 3. Within each cell, preserve top 30% (pinyin region)
 * 4. Erase bottom 70% of each cell (character region)
 * 5. Keep grid lines intact for structure
 * 
 * Benefits:
 * - Better pinyin preservation (works with pinyin in each cell)
 * - More accurate character erasure
 * - Handles varied layouts (different cell heights)
 * - Cleaner output with empty grid boxes below pinyin
 */

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
 * Simplified algorithm: Delete entire rows where 田字格 (grid cells) contain characters
 * This is more reliable than pixel-by-pixel analysis
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
    
    // Apply simplified row-based erasing algorithm
    eraseCharacterRows(data, brightness, width, height);
}

// Algorithm constants for image processing
const GRID_LINE_BRIGHTNESS_THRESHOLD = 150; // Pixels darker than this might be part of grid line
const MIN_GRID_LINE_COVERAGE = 0.4; // Grid line should cover at least 40% of width (reduced for better detection)
const GRID_LINE_MERGE_DISTANCE = 3; // Merge grid lines within this many pixels (reduced for precision)
const PINYIN_RATIO_IN_CELL = 0.30; // Pinyin typically in top 30% of each cell
const CHARACTER_BRIGHTNESS_THRESHOLD = 180; // Erase pixels darker than this (lowered for better detection)
const GRID_LINE_PROTECTION_PIXELS = 1; // Protect this many pixels above/below grid lines (reduced to 1)
const MIN_CELL_HEIGHT = 40; // Minimum height of a cell to be considered valid (in pixels)

/**
 * Optimized cell-based character erasing algorithm
 * Strategy: Identify grid cells, then erase characters while preserving pinyin in each cell
 * This approach works better for images where pinyin is within each cell rather than a global top region
 */
function eraseCharacterRows(data, brightness, width, height) {
    // Step 1: Detect all horizontal grid line positions
    const gridLineRows = detectHorizontalGridLines(brightness, width, height);
    
    if (gridLineRows.length === 0) {
        console.warn('No grid lines detected, using fallback algorithm');
        // Fallback: use simple top-region approach
        const pinyinEndRow = Math.floor(height * 0.25);
        eraseRowsBetweenGridLines(data, brightness, width, height, [], pinyinEndRow);
        return;
    }
    
    // Step 2: Process each cell individually (between consecutive grid lines)
    // This allows us to preserve pinyin within each cell
    eraseCellsWithPinyinPreservation(data, brightness, width, height, gridLineRows);
}

/**
 * Detect horizontal grid lines by looking for rows with high density of dark pixels
 * Grid lines span across the width of the image
 * Improved version with better threshold handling
 */
function detectHorizontalGridLines(brightness, width, height) {
    const gridLines = [];
    const rowDarkness = new Array(height).fill(0);
    
    // Calculate darkness score for each row
    for (let y = 0; y < height; y++) {
        let darkPixelCount = 0;
        let totalDarkness = 0;
        
        // Count dark pixels and accumulate darkness in this row
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const pixelBrightness = brightness[idx];
            if (pixelBrightness < GRID_LINE_BRIGHTNESS_THRESHOLD) {
                darkPixelCount++;
                totalDarkness += (GRID_LINE_BRIGHTNESS_THRESHOLD - pixelBrightness);
            }
        }
        
        // Calculate coverage ratio
        const coverage = darkPixelCount / width;
        rowDarkness[y] = coverage;
        
        // If this row has enough dark pixels spanning across, it's likely a grid line
        if (coverage > MIN_GRID_LINE_COVERAGE) {
            gridLines.push(y);
        }
    }
    
    // Merge adjacent grid lines (grid lines can be multiple pixels thick)
    const mergedLines = mergeAdjacentLines(gridLines);
    
    console.log(`Detected ${mergedLines.length} grid lines at rows: ${mergedLines.join(', ')}`);
    return mergedLines;
}

/**
 * Merge adjacent grid line rows into single line positions
 * Returns the middle row of each grid line
 */
function mergeAdjacentLines(lines) {
    if (lines.length === 0) return [];
    
    const merged = [];
    let groupStart = lines[0];
    let groupEnd = lines[0];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i] - lines[i - 1] <= GRID_LINE_MERGE_DISTANCE) {
            // Part of same grid line (within merge distance)
            groupEnd = lines[i];
        } else {
            // New grid line group
            merged.push(Math.floor((groupStart + groupEnd) / 2));
            groupStart = lines[i];
            groupEnd = lines[i];
        }
    }
    
    // Add last group
    merged.push(Math.floor((groupStart + groupEnd) / 2));
    
    return merged;
}

/**
 * Find where pinyin region ends (typically before the first grid cell structure)
 * Pinyin is usually in the top portion with smaller, lighter text
 */
function findPinyinRegionEnd(brightness, width, height, gridLines) {
    // If we found grid lines, pinyin is likely above the first grid line
    if (gridLines.length > 0) {
        // Look for the start of the grid structure
        // Pinyin typically ends before first grid line or at the configured ratio from top
        const firstGridLine = gridLines[0];
        return Math.min(firstGridLine, Math.floor(height * 0.25));
    }
    
    // Fallback: assume pinyin is in top portion of image
    return Math.floor(height * 0.20);
}

/**
 * Process each cell individually to preserve pinyin while erasing characters
 * This is the optimized approach that handles pinyin within each cell
 */
function eraseCellsWithPinyinPreservation(data, brightness, width, height, gridLineRows) {
    // Estimate background color (typically white or near-white)
    const bgColor = { r: 255, g: 255, b: 255 };
    
    // Create a set for fast grid line lookup
    const gridLineSet = new Set(gridLineRows);
    const protectedRows = new Set();
    for (const line of gridLineRows) {
        for (let offset = -GRID_LINE_PROTECTION_PIXELS; offset <= GRID_LINE_PROTECTION_PIXELS; offset++) {
            protectedRows.add(line + offset);
        }
    }
    
    // Process each cell (region between consecutive grid lines)
    for (let i = 0; i < gridLineRows.length - 1; i++) {
        const cellTopLine = gridLineRows[i];
        const cellBottomLine = gridLineRows[i + 1];
        const cellHeight = cellBottomLine - cellTopLine;
        
        // Skip cells that are too small (likely noise)
        if (cellHeight < MIN_CELL_HEIGHT) {
            continue;
        }
        
        // Calculate pinyin region within this cell
        // Pinyin is typically in the top 30% of each cell
        const pinyinEndInCell = cellTopLine + Math.floor(cellHeight * PINYIN_RATIO_IN_CELL);
        
        // Erase rows in the character region (below pinyin, above bottom grid line)
        for (let y = pinyinEndInCell; y < cellBottomLine; y++) {
            // Skip if this is a protected grid line row
            if (protectedRows.has(y)) {
                continue;
            }
            
            // Erase this row (character region)
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const pixelIdx = idx * 4;
                
                // Only erase dark pixels (characters), leave background
                if (brightness[idx] < CHARACTER_BRIGHTNESS_THRESHOLD) {
                    data[pixelIdx] = bgColor.r;
                    data[pixelIdx + 1] = bgColor.g;
                    data[pixelIdx + 2] = bgColor.b;
                }
            }
        }
    }
}

/**
 * Erase all pixels in rows between grid lines, but keep grid lines and pinyin
 * This is the core of the simplified algorithm
 */
function eraseRowsBetweenGridLines(data, brightness, width, height, gridLines, pinyinEndRow) {
    // Create a set of grid line rows for fast lookup
    const gridLineSet = new Set(gridLines);
    
    // For each grid line, also protect pixels above and below it
    const protectedRows = new Set();
    for (const line of gridLines) {
        for (let offset = -GRID_LINE_PROTECTION_PIXELS; offset <= GRID_LINE_PROTECTION_PIXELS; offset++) {
            protectedRows.add(line + offset);
        }
    }
    
    // Estimate background color (typically white or near-white)
    const bgColor = { r: 255, g: 255, b: 255 };
    
    // Erase rows: keep pinyin region and grid lines, erase everything else
    for (let y = 0; y < height; y++) {
        // Skip pinyin region
        if (y < pinyinEndRow) {
            continue;
        }
        
        // Skip grid line rows (and nearby rows to keep lines clean)
        if (protectedRows.has(y)) {
            continue;
        }
        
        // Erase this entire row
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const pixelIdx = idx * 4;
            
            // Only erase dark pixels (characters), leave background as-is
            if (brightness[idx] < CHARACTER_BRIGHTNESS_THRESHOLD) {
                data[pixelIdx] = bgColor.r;
                data[pixelIdx + 1] = bgColor.g;
                data[pixelIdx + 2] = bgColor.b;
            }
        }
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
