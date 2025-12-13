/**
 * Lure Fishing Application
 * Handles photo uploads, location tracking, and temperature data analysis
 */

// Import weather utility functions
import { fetchWeatherByLocationAndDate, formatTemperature, getTemperatureDescription } from '../util/weather-util.js';

// MySQL table name for fishing records
const TABLE_NAME = 'lure_fishing_records';

// Current page for pagination
let currentPage = 1;
const RECORDS_PER_PAGE = 9;

// Store current location coordinates for weather fetching
let currentCoordinates = null;

// UI timeout constants (in milliseconds)
const SUCCESS_MESSAGE_TIMEOUT = 3000; // 3 seconds
const LOCATION_SUCCESS_TIMEOUT = 2000; // 2 seconds

/**
 * Format a Date object to MySQL datetime format (YYYY-MM-DD HH:MM:SS)
 * @param {Date} date - The date to format (defaults to current date/time)
 * @returns {string} Formatted datetime string for MySQL
 */
function formatDateTimeForMySQL(date = new Date()) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    loadRecords();
    loadTemperatureStats();
    setupEventListeners();
});

/**
 * Initialize form with current date
 */
function initializeForm() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.max = today; // Prevent future dates
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Photo upload preview
    document.getElementById('photoUpload').addEventListener('change', handlePhotoPreview);
    
    // Get location button
    document.getElementById('getLocationBtn').addEventListener('click', getLocation);
    
    // Get temperature button
    document.getElementById('getTemperatureBtn').addEventListener('click', getTemperature);
    
    // Form submission
    document.getElementById('uploadForm').addEventListener('submit', handleFormSubmit);
    
    // Load more records
    document.getElementById('loadMoreBtn').addEventListener('click', function() {
        currentPage++;
        loadRecords(false);
    });
}

/**
 * Handle photo preview
 */
function handlePhotoPreview(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('photoPreview');
            preview.innerHTML = ''; // Clear previous preview
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Preview';
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Get user's current location
 */
function getLocation() {
    const locationInput = document.getElementById('location');
    const btn = document.getElementById('getLocationBtn');
    
    if (!navigator.geolocation) {
        showStatus('浏览器不支持地理位置功能', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '获取中...';
    locationInput.value = '定位中...';
    
    navigator.geolocation.getCurrentPosition(
        async function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Store coordinates for weather fetching
            currentCoordinates = { latitude: lat, longitude: lon };
            
            // Use reverse geocoding to get address (simplified version)
            // In a real application, you would call a geocoding API
            const locationStr = `纬度: ${lat.toFixed(4)}, 经度: ${lon.toFixed(4)}`;
            locationInput.value = locationStr;
            
            btn.disabled = false;
            btn.textContent = '获取位置';
            showStatus('位置获取成功！坐标已保存', 'success');
            
            // Log coordinates for debugging
            console.log('Coordinates obtained:', currentCoordinates);
            
            // Hide success message after 2 seconds
            setTimeout(() => {
                document.getElementById('uploadStatus').style.display = 'none';
            }, LOCATION_SUCCESS_TIMEOUT);
        },
        function(error) {
            let errorMsg = '位置获取失败';
            let errorDetail = '';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg = '用户拒绝了地理位置请求';
                    errorDetail = '请在浏览器设置中允许位置访问权限';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg = '位置信息不可用';
                    errorDetail = '请确保设备GPS已开启';
                    break;
                case error.TIMEOUT:
                    errorMsg = '请求超时';
                    errorDetail = '请重试';
                    break;
            }
            
            // Reset coordinates on error
            currentCoordinates = null;
            locationInput.value = '';
            btn.disabled = false;
            btn.textContent = '获取位置';
            showStatus(`${errorMsg}：${errorDetail}`, 'error');
            console.error('Geolocation error:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

/**
 * Get temperature based on location and date
 */
async function getTemperature() {
    const temperatureInput = document.getElementById('temperature');
    const dateInput = document.getElementById('date');
    const btn = document.getElementById('getTemperatureBtn');
    
    // Validate that location has been obtained
    if (!currentCoordinates) {
        showStatus('请先获取位置信息', 'error');
        return;
    }
    
    // Validate that date has been selected
    const date = dateInput.value;
    if (!date) {
        showStatus('请先选择日期', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '获取中...';
    temperatureInput.value = '';
    
    try {
        showStatus('正在获取天气数据...', 'success');
        
        const weatherData = await fetchWeatherByLocationAndDate(
            currentCoordinates.latitude,
            currentCoordinates.longitude,
            date
        );
        
        // Use mean temperature as the default value
        const temperature = weatherData.temperature_mean;
        temperatureInput.value = formatTemperature(temperature, 1);
        
        // Show success message with additional info
        const description = getTemperatureDescription(temperature);
        showStatus(
            `温度获取成功！当日平均温度: ${formatTemperature(temperature)}°C (${description})`,
            'success'
        );
        
        // Hide success message after 3 seconds
        setTimeout(() => {
            document.getElementById('uploadStatus').style.display = 'none';
        }, SUCCESS_MESSAGE_TIMEOUT);
        
    } catch (error) {
        console.error('Error fetching temperature:', error);
        showStatus(`温度获取失败: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '自动获取温度';
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    
    try {
        // Get form data
        const photo = document.getElementById('photoUpload').files[0];
        const location = document.getElementById('location').value;
        const date = document.getElementById('date').value;
        const temperature = parseFloat(document.getElementById('temperature').value);
        const catchCount = parseInt(document.getElementById('catchCount').value);
        const notes = document.getElementById('notes').value;
        
        if (!photo) {
            throw new Error('请选择照片');
        }
        
        if (!location) {
            throw new Error('请获取位置信息');
        }
        
        // Compress photo if needed
        showStatus('正在处理照片...', 'success');
        const originalSize = photo.size;
        const processedPhoto = await compressImage(photo);
        
        // Show compression info if image was compressed
        if (processedPhoto.size < originalSize) {
            const savedKB = ((originalSize - processedPhoto.size) / 1024).toFixed(0);
            const compressionRatio = ((1 - processedPhoto.size / originalSize) * 100).toFixed(0);
            showStatus(`照片已压缩 ${compressionRatio}%（节省 ${savedKB}KB）`, 'success');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Show message briefly
        }
        
        // Upload photo
        showStatus('正在上传照片...', 'success');
        const uploadResult = await uploadPhoto(processedPhoto);
        
        if (!uploadResult || !uploadResult.filename) {
            throw new Error('照片上传失败');
        }
        
        // Ensure photo_url includes the full path
        // If the server returns just the filename, prepend the targetPath
        let photoUrl = uploadResult.filename;
        if (!photoUrl.startsWith('lure-fishing/')) {
            photoUrl = 'lure-fishing/' + photoUrl;
        }
        
        // Save record to database
        showStatus('正在保存记录...', 'success');
        const recordData = {
            photo_url: photoUrl,
            location: location,
            catch_date: date,
            temperature: temperature,
            catch_count: catchCount,
            notes: notes,
            created_at: formatDateTimeForMySQL()
        };
        
        await saveRecord(recordData);
        
        showStatus('成果提交成功！', 'success');
        
        // Reset form
        document.getElementById('uploadForm').reset();
        document.getElementById('photoPreview').innerHTML = '';
        initializeForm();
        
        // Reload records and stats
        currentPage = 1;
        await loadRecords(true);
        await loadTemperatureStats();
        
        // Hide success message after 3 seconds
        setTimeout(() => {
            document.getElementById('uploadStatus').style.display = 'none';
        }, SUCCESS_MESSAGE_TIMEOUT);
        
    } catch (error) {
        console.error('Error submitting form:', error);
        showStatus(`提交失败: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '提交成果';
    }
}

/**
 * Compress image if larger than 1MB
 * @param {File} file - The image file to compress
 * @returns {Promise<File|Blob>} Compressed image or original file if under 1MB
 */
async function compressImage(file) {
    const MAX_SIZE = 1 * 1024 * 1024; // 1MB in bytes
    
    // If file is already under 1MB, return it as-is
    if (file.size <= MAX_SIZE) {
        return file;
    }
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                // Create canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions (maintain aspect ratio)
                let width = img.width;
                let height = img.height;
                
                // If image is very large, scale it down
                const MAX_DIMENSION = 2048;
                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    if (width > height) {
                        height = (height / width) * MAX_DIMENSION;
                        width = MAX_DIMENSION;
                    } else {
                        width = (width / height) * MAX_DIMENSION;
                        height = MAX_DIMENSION;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);
                
                // Try different quality levels to get under 1MB
                let quality = 0.8;
                let attempt = 0;
                const maxAttempts = 5;
                
                const tryCompress = () => {
                    canvas.toBlob(function(blob) {
                        if (!blob) {
                            reject(new Error('图片压缩失败'));
                            return;
                        }
                        
                        // If still too large and haven't reached max attempts, try lower quality
                        if (blob.size > MAX_SIZE && attempt < maxAttempts - 1) {
                            quality -= 0.1;
                            attempt++;
                            tryCompress();
                        } else {
                            // Create a new File object from the blob
                            // Update filename to reflect JPEG format
                            const newFileName = file.name.replace(/\.[^.]+$/, '.jpg');
                            const compressedFile = new File([blob], newFileName, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        }
                    }, 'image/jpeg', quality);
                };
                
                tryCompress();
            };
            img.onerror = function() {
                reject(new Error('图片加载失败'));
            };
        };
        reader.onerror = function() {
            reject(new Error('文件读取失败'));
        };
    });
}

/**
 * Upload photo to server
 */
async function uploadPhoto(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetPath', 'lure-fishing/');
    
    const response = await fetch(window.API_ENDPOINTS.IMAGE_UPLOAD, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`上传失败: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * Save record to database
 */
async function saveRecord(data) {
    const response = await fetch(window.API_ENDPOINTS.MYSQL_INSERT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            table: TABLE_NAME,
            data: data
        })
    });
    
    if (!response.ok) {
        throw new Error(`保存失败: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * Load fishing records from database
 */
async function loadRecords(clearExisting = true) {
    try {
        const offset = (currentPage - 1) * RECORDS_PER_PAGE;
        const query = 'SELECT photo_url, location, catch_date, temperature, catch_count, notes, created_at FROM ?? ORDER BY created_at DESC LIMIT ? OFFSET ?';
        
        const response = await fetch(window.API_ENDPOINTS.MYSQL_QUERY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sql: query,
                params: [TABLE_NAME, RECORDS_PER_PAGE, offset]
            })
        });
        
        if (!response.ok) {
            throw new Error(`查询失败: ${response.status}`);
        }
        
        const records = await response.json();
        displayRecords(records, clearExisting);
        
        // Hide load more button if no more records
        if (records.length < RECORDS_PER_PAGE) {
            document.getElementById('loadMoreBtn').style.display = 'none';
        } else {
            document.getElementById('loadMoreBtn').style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error loading records:', error);
        // Show friendly message for any error
        const gallery = document.getElementById('recordsGallery');
        if (clearExisting) {
            gallery.innerHTML = '<p>暂无数据，快来上传第一条记录吧！</p>';
        }
    }
}

/**
 * Display records in gallery
 */
function displayRecords(records, clearExisting = true) {
    const gallery = document.getElementById('recordsGallery');
    
    if (clearExisting) {
        gallery.innerHTML = '';
    }
    
    if (records.length === 0 && clearExisting) {
        gallery.innerHTML = '<p>暂无数据，快来上传第一条记录吧！</p>';
        return;
    }
    
    records.forEach(record => {
        const card = createRecordCard(record);
        gallery.appendChild(card);
    });
}

/**
 * Create a record card element
 */
function createRecordCard(record) {
    const card = document.createElement('div');
    card.className = 'record-card';
    
    // Sanitize and validate photo URL
    const photoUrl = encodeURI(`${window.BASE_URL}/${record.photo_url}`);
    const date = new Date(record.catch_date).toLocaleDateString('zh-CN');
    
    // Create elements programmatically to avoid XSS
    const img = document.createElement('img');
    img.src = photoUrl;
    img.alt = '钓鱼成果';
    img.onerror = function() { this.src = '../images/game1.jpg'; };
    
    const recordInfo = document.createElement('div');
    recordInfo.className = 'record-info';
    
    const dateP = document.createElement('p');
    dateP.innerHTML = '<strong>日期:</strong> ';
    dateP.appendChild(document.createTextNode(date));
    
    const locationP = document.createElement('p');
    locationP.innerHTML = '<strong>地点:</strong> ';
    locationP.appendChild(document.createTextNode(record.location));
    
    const tempP = document.createElement('p');
    tempP.innerHTML = '<strong>温度:</strong> ';
    tempP.appendChild(document.createTextNode(`${record.temperature}°C`));
    
    const catchP = document.createElement('p');
    catchP.innerHTML = '<strong>钓获:</strong> ';
    catchP.appendChild(document.createTextNode(`${record.catch_count} 条`));
    
    recordInfo.appendChild(dateP);
    recordInfo.appendChild(locationP);
    recordInfo.appendChild(tempP);
    recordInfo.appendChild(catchP);
    
    if (record.notes) {
        const notesP = document.createElement('p');
        notesP.innerHTML = '<strong>备注:</strong> ';
        notesP.appendChild(document.createTextNode(record.notes));
        recordInfo.appendChild(notesP);
    }
    
    card.appendChild(img);
    card.appendChild(recordInfo);
    
    return card;
}

/**
 * Load and display temperature statistics
 */
async function loadTemperatureStats() {
    try {
        const query = `
            SELECT 
                temperature,
                COUNT(*) as count,
                SUM(catch_count) as total_catch
            FROM ??
            GROUP BY temperature
            ORDER BY count DESC
        `;
        
        const response = await fetch(window.API_ENDPOINTS.MYSQL_QUERY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sql: query,
                params: [TABLE_NAME]
            })
        });
        
        if (!response.ok) {
            throw new Error(`查询失败: ${response.status}`);
        }
        
        const stats = await response.json();
        displayTemperatureStats(stats);
        
    } catch (error) {
        console.error('Error loading temperature stats:', error);
        const statsDiv = document.getElementById('temperatureStats');
        statsDiv.innerHTML = '<p>暂无温度数据</p>';
    }
}

/**
 * Display temperature statistics
 */
function displayTemperatureStats(stats) {
    const statsDiv = document.getElementById('temperatureStats');
    
    if (!stats || stats.length === 0) {
        statsDiv.innerHTML = '<p>暂无温度数据</p>';
        return;
    }
    
    // Group by temperature ranges
    const ranges = {
        '0-10°C': { count: 0, totalCatch: 0 },
        '10-15°C': { count: 0, totalCatch: 0 },
        '15-20°C': { count: 0, totalCatch: 0 },
        '20-25°C': { count: 0, totalCatch: 0 },
        '25-30°C': { count: 0, totalCatch: 0 },
        '30°C+': { count: 0, totalCatch: 0 }
    };
    
    stats.forEach(stat => {
        const temp = parseFloat(stat.temperature);
        const count = parseInt(stat.count);
        const totalCatch = parseInt(stat.total_catch);
        
        if (temp < 10) {
            ranges['0-10°C'].count += count;
            ranges['0-10°C'].totalCatch += totalCatch;
        } else if (temp < 15) {
            ranges['10-15°C'].count += count;
            ranges['10-15°C'].totalCatch += totalCatch;
        } else if (temp < 20) {
            ranges['15-20°C'].count += count;
            ranges['15-20°C'].totalCatch += totalCatch;
        } else if (temp < 25) {
            ranges['20-25°C'].count += count;
            ranges['20-25°C'].totalCatch += totalCatch;
        } else if (temp < 30) {
            ranges['25-30°C'].count += count;
            ranges['25-30°C'].totalCatch += totalCatch;
        } else {
            ranges['30°C+'].count += count;
            ranges['30°C+'].totalCatch += totalCatch;
        }
    });
    
    // Create stat cards
    statsDiv.innerHTML = '';
    
    // Sort ranges by count
    const sortedRanges = Object.entries(ranges)
        .filter(([_, data]) => data.count > 0)
        .sort((a, b) => b[1].count - a[1].count);
    
    sortedRanges.forEach(([range, data]) => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        
        const h3 = document.createElement('h3');
        h3.textContent = range;
        
        const p1 = document.createElement('p');
        p1.textContent = `记录次数: ${data.count} 次`;
        
        const p2 = document.createElement('p');
        p2.textContent = `总钓获: ${data.totalCatch} 条`;
        
        const p3 = document.createElement('p');
        p3.textContent = `平均每次: ${(data.totalCatch / data.count).toFixed(1)} 条`;
        
        card.appendChild(h3);
        card.appendChild(p1);
        card.appendChild(p2);
        card.appendChild(p3);
        
        statsDiv.appendChild(card);
    });
    
    // Simple text-based chart
    drawSimpleChart(sortedRanges);
}

/**
 * Draw a simple text-based chart
 */
function drawSimpleChart(sortedRanges) {
    const canvas = document.getElementById('chartCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;
    
    if (sortedRanges.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const maxCount = Math.max(...sortedRanges.map(r => r[1].count));
    const barWidth = (canvas.width - 60) / sortedRanges.length;
    const chartHeight = canvas.height - 60;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars
    sortedRanges.forEach(([range, data], index) => {
        const barHeight = (data.count / maxCount) * chartHeight;
        const x = 30 + index * barWidth;
        const y = canvas.height - 30 - barHeight;
        
        // Draw bar
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height - 30);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
        
        // Draw count
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(data.count, x + barWidth / 2, y - 5);
        
        // Draw label
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.translate(x + barWidth / 2, canvas.height - 10);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(range, 0, 0);
        ctx.restore();
    });
    
    // Draw axis
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, canvas.height - 30);
    ctx.lineTo(canvas.width - 30, canvas.height - 30);
    ctx.stroke();
}

/**
 * Show status message
 */
function showStatus(message, type) {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
}
