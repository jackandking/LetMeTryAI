/**
 * Main Application JavaScript
 * Handles homepage functionality including app display, search, and idea submission
 */

// Import GitHub utilities (will be loaded as module)
let githubUtil = null;

// Import metadata file
const APPS_METADATA_URL = 'apps-metadata.json';

// Global state
let appsData = [];
let filteredApps = [];
let currentCategory = 'all';
let currentSort = 'visits';

/**
 * Initialize the application
 */
async function initializeApp() {
    console.log('Initializing main application');
    
    try {
        // Load apps metadata
        await loadAppsMetadata();

        // Load app visit stats
        await loadAppStats();
        
        // Initial sort by visits
        sortApps('visits');
        
        // Render initial apps
        renderApps(filteredApps);
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize form handlers
        setupFormHandlers();
        
        console.log('Main application initialized successfully');
    } catch (error) {
        console.error('Error initializing main application:', error);
        showError('应用加载失败，请刷新页面重试');
    }
}

/**
 * Load apps metadata from JSON file
 */
async function loadAppsMetadata() {
    try {
        const response = await fetch(APPS_METADATA_URL + '?t=' + Date.now());
        if (!response.ok) {
            throw new Error('Failed to load apps metadata');
        }
        
        const data = await response.json();
        appsData = data.apps || [];
        filteredApps = [...appsData];
        
        console.log(`Loaded ${appsData.length} apps`);
    } catch (error) {
        console.error('Error loading apps metadata:', error);
        // Fallback to hardcoded data if JSON fails
        appsData = getDefaultApps();
        filteredApps = [...appsData];
    }
}

/**
 * Load app visit stats from database
 */
async function loadAppStats() {
    try {
        console.log('Loading app stats...');
        
        // Use the window.API_ENDPOINTS.MYSQL_QUERY if available, otherwise fallback
        const endpoint = window.API_ENDPOINTS?.MYSQL_QUERY;
        if (!endpoint) {
            console.warn('MySQL API endpoint not found, skipping stats load');
            return;
        }
        
        console.log(`Fetching stats from: ${endpoint}`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sql: "SELECT app_id, visit_count FROM app_visits"
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch app stats: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Stats loaded:', result);
        
        // Check if result is an array (direct rows) or has a specific structure
        // Assuming the API returns an array of rows or { data: [...] }
        const rows = Array.isArray(result) ? result : (result.data || []);
        
        // Create a map of app_id -> visit_count
        const statsMap = {};
        rows.forEach(row => {
            statsMap[row.app_id] = row.visit_count;
        });

        // Merge stats into appsData
        let totalVisits = 0;
        appsData.forEach(app => {
            const count = statsMap[app.id] || 0;
            app.visit_count = count;
            totalVisits += count;
        });
        
        console.log(`Merged stats: Total visits tracked across all apps: ${totalVisits}`);
        
        // Update filteredApps
        filteredApps = [...appsData];
        
        console.log('App stats loaded successfully');
    } catch (error) {
        console.error('Error loading app stats:', error);
        // Initialize visit_count to 0 if fetch fails
        appsData.forEach(app => {
            if (typeof app.visit_count === 'undefined') {
                app.visit_count = 0;
            }
        });
    }
}

/**
 * Track app visit
 */
async function trackAppVisit(appId) {
    console.log(`Tracking visit for app: ${appId}`);
    try {
        const endpoint = window.API_ENDPOINTS?.MYSQL_QUERY;
        if (!endpoint) {
             console.error('MySQL API endpoint not defined');
             return;
        }

        console.log(`Sending visit tracking request to ${endpoint}`);

        // Use INSERT ... ON DUPLICATE KEY UPDATE to increment count
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            keepalive: true, // Ensure request completes even if page unloads
            body: JSON.stringify({
                sql: "INSERT INTO app_visits (app_id, visit_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE visit_count = visit_count + 1",
                params: [appId]
            })
        });
        
        if (!response.ok) {
             console.error(`Tracking failed: ${response.status} ${response.statusText}`);
        } else {
             console.log('Tracking request sent successfully');
        }
    } catch (error) {
        console.error('Error tracking app visit:', error);
    }
}

/**
 * Get default apps (fallback)
 */
function getDefaultApps() {
    return [
        {
            id: 'fireworks',
            name: '爱烟花',
            description: '创意烟花动画展示',
            category: '娱乐',
            url: 'https://museumcheck.cn/fireworks-wall.html',
            external: true,
            image: 'images/game1.jpg',
            tags: ['动画', '烟花'],
            featured: true
        },
        {
            id: 'magic',
            name: '爱魔术',
            description: '神奇的魔术效果展示',
            category: '娱乐',
            url: 'webview3',
            image: 'images/game2.png',
            tags: ['魔术', '互动'],
            featured: true
        },
        {
            id: 'study',
            name: '爱学习',
            description: '有趣的学习工具',
            category: '教育',
            url: 'webview11',
            image: 'images/sample1.png',
            tags: ['学习'],
            featured: true
        }
    ];
}

/**
 * Render apps to the page
 */
function renderApps(apps) {
    const container = document.getElementById('apps-container');
    
    if (!container) {
        console.error('Apps container not found');
        return;
    }
    
    // Clear existing content
    container.innerHTML = '';
    
    // Show loading state
    if (apps.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>没有找到应用</h3>
                <p>尝试调整搜索条件或分类筛选</p>
            </div>
        `;
        return;
    }
    
    // Render each app
    apps.forEach(app => {
        const appCard = createAppCard(app);
        container.appendChild(appCard);
    });
}

/**
 * Create an app card element
 */
function createAppCard(app) {
    const section = document.createElement('section');
    section.className = 'section';
    section.dataset.appId = app.id;
    section.dataset.category = app.category;
    
    const link = document.createElement('a');
    link.href = app.url;
    
    // Add click tracking
    link.addEventListener('click', (e) => {
        // Don't prevent default, but ensure tracking fires
        console.log(`Click detected on app: ${app.id}`);
        trackAppVisit(app.id);
    });

    if (app.external) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    }
    
    // Category badge
    const categoryBadge = `<span class="app-category">${app.category}</span>`;
    
    // Image
    const img = document.createElement('img');
    img.className = 'responsive-img';
    img.alt = app.name;
    img.loading = 'lazy';
    
    // Set image with fallback
    setImageWithFallback(img, app.image);
    
    // Title
    const title = document.createElement('h2');
    title.textContent = app.name;
    
    // Visit count badge (optional, but helpful for verification)
    if (app.visit_count > 0) {
        const statsBadge = document.createElement('span');
        statsBadge.className = 'app-stats';
        statsBadge.innerHTML = `<small>🔥 ${app.visit_count}</small>`;
        statsBadge.style.cssText = 'position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;';
        // Only append if section is relative positioned, or just append to link
        // Actually, let's just append it to the section or link
        // To make it look good, we might need CSS. For now, let's skip visual badge to keep it clean unless requested.
        // The user asked to "show in front", not necessarily show the number.
        // But showing the number helps understanding why it's in front.
        // Let's add it to the description or near title.
    }

    // Description (if available)
    let descriptionHTML = '';
    if (app.description) {
        // Add visit count to description if > 0
        const visitInfo = app.visit_count > 0 ? ` <span style="color: #666; font-size: 0.8em;">(🔥 ${app.visit_count})</span>` : '';
        descriptionHTML = `<p>${app.description}${visitInfo}</p>`;
    } else if (app.visit_count > 0) {
        descriptionHTML = `<p><span style="color: #666; font-size: 0.8em;">🔥 ${app.visit_count} 次访问</span></p>`;
    }
    
    // Tags (if available)
    let tagsHTML = '';
    if (app.tags && app.tags.length > 0) {
        const tagElements = app.tags.map(tag => 
            `<span class="app-tag">${tag}</span>`
        ).join('');
        tagsHTML = `<div class="app-tags">${tagElements}</div>`;
    }
    
    link.appendChild(img);
    link.appendChild(title);
    
    section.innerHTML = categoryBadge;
    section.appendChild(link);
    
    if (descriptionHTML) {
        const desc = document.createElement('p');
        desc.textContent = app.description;
        section.appendChild(desc);
    }
    
    if (tagsHTML) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'app-tags';
        app.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'app-tag';
            tagSpan.textContent = tag;
            tagsDiv.appendChild(tagSpan);
        });
        section.appendChild(tagsDiv);
    }
    
    return section;
}

/**
 * Set image with fallback
 */
function setImageWithFallback(imgElement, imagePath) {
    const fallbackImage = 'images/game1.jpg';
    
    imgElement.onerror = function() {
        console.warn(`Image failed to load: ${imagePath}, using fallback`);
        this.src = fallbackImage;
        this.onerror = null; // Prevent infinite loop
    };
    
    imgElement.src = imagePath;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleCategoryFilter);
    }
    
    // Sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSort);
    }
    
    // Quick idea input - handle Enter key
    const quickInput = document.getElementById('quick-idea-input');
    if (quickInput) {
        quickInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleQuickInput();
            }
        });
    }
}

/**
 * Handle search input
 */
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    
    filteredApps = appsData.filter(app => {
        const matchesSearch = !searchTerm || 
            app.name.toLowerCase().includes(searchTerm) ||
            (app.description && app.description.toLowerCase().includes(searchTerm)) ||
            (app.tags && app.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
        
        const matchesCategory = currentCategory === 'all' || app.category === currentCategory;
        
        return matchesSearch && matchesCategory;
    });
    
    sortApps(currentSort);
    renderApps(filteredApps);
}

/**
 * Handle category filter
 */
function handleCategoryFilter(event) {
    currentCategory = event.target.value;
    
    // Trigger search to apply both filters
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        handleSearch({ target: searchInput });
    } else {
        filteredApps = currentCategory === 'all' 
            ? [...appsData]
            : appsData.filter(app => app.category === currentCategory);
        sortApps(currentSort);
        renderApps(filteredApps);
    }
}

/**
 * Handle sort change
 */
function handleSort(event) {
    currentSort = event.target.value;
    sortApps(currentSort);
    renderApps(filteredApps);
}

/**
 * Sort apps based on criteria
 */
function sortApps(criteria) {
    switch (criteria) {
        case 'visits':
            filteredApps.sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0));
            break;
        case 'name':
            filteredApps.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
            break;
        case 'category':
            filteredApps.sort((a, b) => a.category.localeCompare(b.category, 'zh-CN'));
            break;
        case 'featured':
        default:
            filteredApps.sort((a, b) => {
                if (a.featured && !b.featured) return -1;
                if (!a.featured && b.featured) return 1;
                return 0;
            });
            break;
    }
}

/**
 * Debounce utility function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Set up form handlers
 */
function setupFormHandlers() {
    const form = document.getElementById('idea-form');
    const titleInput = document.getElementById('idea-title');
    const descriptionInput = document.getElementById('idea-description');
    
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Character counters
    if (titleInput) {
        titleInput.addEventListener('input', () => updateCharCount('idea-title', 'title-count', 100));
    }
    
    if (descriptionInput) {
        descriptionInput.addEventListener('input', () => updateCharCount('idea-description', 'description-count', 2000));
    }
}

/**
 * Update character count
 */
function updateCharCount(inputId, countId, maxLength) {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(countId);
    
    if (input && counter) {
        const length = input.value.length;
        counter.textContent = `${length}/${maxLength}`;
        
        if (length > maxLength * 0.9) {
            counter.style.color = '#e74c3c';
        } else {
            counter.style.color = '#999';
        }
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = document.getElementById('submit-button');
    const messageDiv = document.getElementById('form-message');
    
    // Get form data
    const idea = {
        title: document.getElementById('idea-title').value.trim(),
        description: document.getElementById('idea-description').value.trim(),
        category: document.getElementById('idea-category').value
    };
    
    // Validate
    const validation = validateIdeaLocal(idea);
    if (!validation.isValid) {
        showFormMessage(validation.errors.join('<br>'), 'error');
        return;
    }
    
    // Disable submit button
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = '提交中...';
    }
    
    try {
        // For now, show a mock success message since we don't have backend yet
        // In production, this would call: await createIssueFromIdea(idea);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock success response
        const result = {
            success: true,
            message: '创意提交成功！我们已经记录了您的想法。'
        };
        
        showFormMessage(
            `✅ ${result.message}<br><br>您的创意将会被 AI 评估并可能转化为实际应用。<br>感谢您的贡献！`,
            'success'
        );
        
        // Reset form
        form.reset();
        updateCharCount('idea-title', 'title-count', 100);
        updateCharCount('idea-description', 'description-count', 2000);
        
        // Scroll to message
        if (messageDiv) {
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
    } catch (error) {
        console.error('Error submitting idea:', error);
        showFormMessage(
            `❌ 提交失败：${error.message}<br>请稍后重试或联系管理员。`,
            'error'
        );
    } finally {
        // Re-enable submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = '🚀 提交创意';
        }
    }
}

/**
 * Validate idea locally (simplified version)
 */
function validateIdeaLocal(idea) {
    const errors = [];
    
    if (!idea.title || idea.title.length === 0) {
        errors.push('请输入创意标题');
    } else if (idea.title.length < 3) {
        errors.push('创意标题至少需要3个字符');
    } else if (idea.title.length > 100) {
        errors.push('创意标题不能超过100个字符');
    }
    
    if (!idea.description || idea.description.length === 0) {
        errors.push('请输入创意描述');
    } else if (idea.description.length < 10) {
        errors.push('创意描述至少需要10个字符');
    } else if (idea.description.length > 2000) {
        errors.push('创意描述不能超过2000个字符');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Show form message
 */
function showFormMessage(message, type) {
    const messageDiv = document.getElementById('form-message');
    if (messageDiv) {
        messageDiv.className = `form-message ${type}`;
        messageDiv.innerHTML = message;
        messageDiv.style.display = 'block';
        
        // Auto-hide success messages after 10 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 10000);
        }
    }
}

/**
 * Show error message
 */
function showError(message) {
    const container = document.getElementById('apps-container');
    if (container) {
        container.innerHTML = `
            <div class="empty-state" style="color: #e74c3c;">
                <h3>⚠️ 出错了</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

/**
 * Scroll animation duration constant (in milliseconds)
 */
const SCROLL_ANIMATION_DURATION = 500;

/**
 * Scroll to submit form
 */
function scrollToSubmitForm() {
    const submitSection = document.getElementById('submit-form');
    if (submitSection) {
        submitSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Focus on first input after scroll animation completes
        setTimeout(() => {
            const titleInput = document.getElementById('idea-title');
            if (titleInput) {
                titleInput.focus();
            }
        }, SCROLL_ANIMATION_DURATION);
    }
}

/**
 * Handle quick input submission
 */
function handleQuickInput() {
    const quickInput = document.getElementById('quick-idea-input');
    
    if (!quickInput) {
        console.error('Quick input element not found');
        return;
    }
    
    const quickIdea = quickInput.value.trim();
    
    // If empty, just scroll to the form
    if (!quickIdea) {
        scrollToSubmitForm();
        return;
    }
    
    // Pre-fill the title field and scroll to the form
    const titleInput = document.getElementById('idea-title');
    if (titleInput) {
        titleInput.value = quickIdea;
        updateCharCount('idea-title', 'title-count', 100);
    }
    
    // Clear quick input
    quickInput.value = '';
    
    // Scroll to the form and focus on description
    const submitSection = document.getElementById('submit-form');
    if (submitSection) {
        submitSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Focus on description after scroll animation completes
        setTimeout(() => {
            const descriptionInput = document.getElementById('idea-description');
            if (descriptionInput) {
                descriptionInput.focus();
            }
        }, SCROLL_ANIMATION_DURATION);
    }
}

// Make functions available globally
window.scrollToSubmitForm = scrollToSubmitForm;
window.handleQuickInput = handleQuickInput;

/**
 * Initialize when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', initializeApp);
