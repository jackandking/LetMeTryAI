/**
 * Points System for Nanrenbao
 * Manages user points using localStorage
 */

const PointsSystem = (function() {
    const STORAGE_KEYS = {
        USER_UUID: 'nanrenbao_user_uuid',
        POINTS: 'nanrenbao_points',
        LAST_VISIT: 'nanrenbao_last_visit',
        VIEWED_IMAGES: 'nanrenbao_viewed_images',
        INITIALIZED: 'nanrenbao_initialized'
    };

    const POINTS_CONFIG = {
        NEW_USER: 3,           // Initial points for new users
        DAILY_VISIT: 5,        // Points for daily visit
        UPLOAD_IMAGE: 10,       // Points for uploading an image
        VIEW_IMAGE: 1,          // Points to view a full image
        DELETE_IMAGE: 10,      // Points cost to mark an image as deleted
        AD_FULL: 10,            // Points for watching full ad
        AD_PARTIAL: 3           // Points for partially watching ad
    };

    /**
     * Generate a UUID v4
     * @returns {string} UUID
     */
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Get or create user UUID
     * @returns {string} User UUID
     */
    function getUserUUID() {
        let uuid = localStorage.getItem(STORAGE_KEYS.USER_UUID);
        if (!uuid) {
            uuid = generateUUID();
            localStorage.setItem(STORAGE_KEYS.USER_UUID, uuid);
        }
        return uuid;
    }

    /**
     * Get user points
     * @returns {number} Current points
     */
    function getPoints() {
        const points = localStorage.getItem(STORAGE_KEYS.POINTS);
        return points ? parseInt(points, 10) : 0;
    }

    /**
     * Set user points
     * @param {number} points - New points value
     */
    function setPoints(points) {
        localStorage.setItem(STORAGE_KEYS.POINTS, points.toString());
    }

    /**
     * Add points to user account
     * @param {number} points - Points to add
     * @returns {number} New total points
     */
    function addPoints(points) {
        const currentPoints = getPoints();
        const newPoints = currentPoints + points;
        setPoints(newPoints);
        return newPoints;
    }

    /**
     * Initialize new user with starting points
     * @returns {boolean} True if new user was initialized
     */
    function initializeNewUser() {
        const uuid = getUserUUID();
        const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
        
        // Only initialize if never initialized before
        if (!isInitialized) {
            setPoints(POINTS_CONFIG.NEW_USER);
            localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
            console.log(`New user ${uuid} initialized with ${POINTS_CONFIG.NEW_USER} points`);
            return true;
        }
        return false;
    }

    /**
     * Check if today is a new day and award daily points
     * @returns {object} {awarded: boolean, points: number, newTotal: number}
     */
    function checkDailyVisit() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const lastVisit = localStorage.getItem(STORAGE_KEYS.LAST_VISIT);
        
        if (lastVisit !== today) {
            // Award daily points
            const newTotal = addPoints(POINTS_CONFIG.DAILY_VISIT);
            localStorage.setItem(STORAGE_KEYS.LAST_VISIT, today);
            console.log(`Daily visit bonus: +${POINTS_CONFIG.DAILY_VISIT} points. Total: ${newTotal}`);
            return {
                awarded: true,
                points: POINTS_CONFIG.DAILY_VISIT,
                newTotal: newTotal
            };
        }
        
        return {
            awarded: false,
            points: 0,
            newTotal: getPoints()
        };
    }

    /**
     * Award points for uploading an image
     * @returns {number} New total points
     */
    function awardUploadPoints() {
        const newTotal = addPoints(POINTS_CONFIG.UPLOAD_IMAGE);
        console.log(`Upload bonus: +${POINTS_CONFIG.UPLOAD_IMAGE} points. Total: ${newTotal}`);
        return newTotal;
    }

    /**
     * Award points for watching advertisement
     * @param {boolean} watchedFull - Whether user watched the full ad
     * @returns {object} Result with points awarded and new total
     */
    function awardAdPoints(watchedFull) {
        const pointsToAward = watchedFull ? POINTS_CONFIG.AD_FULL : POINTS_CONFIG.AD_PARTIAL;
        const newTotal = addPoints(pointsToAward);
        console.log(`Ad bonus (${watchedFull ? 'full' : 'partial'}): +${pointsToAward} points. Total: ${newTotal}`);
        return {
            pointsAwarded: pointsToAward,
            newTotal: newTotal,
            watchedFull: watchedFull
        };
    }

    /**
     * Initialize points system on page load
     * Checks for new user and daily visit
     * @returns {object} Status information
     */
    function initialize() {
        const uuid = getUserUUID();
        const isNewUser = initializeNewUser();
        const dailyVisit = checkDailyVisit();
        const currentPoints = getPoints();

        return {
            uuid: uuid,
            isNewUser: isNewUser,
            dailyVisit: dailyVisit,
            currentPoints: currentPoints
        };
    }

    /**
     * Get user info and statistics
     * @returns {object} User information
     */
    function getUserInfo() {
        return {
            uuid: getUserUUID(),
            points: getPoints(),
            lastVisit: localStorage.getItem(STORAGE_KEYS.LAST_VISIT)
        };
    }

    /**
     * Reset user data (for testing/debugging)
     */
    function resetUser() {
        localStorage.removeItem(STORAGE_KEYS.USER_UUID);
        localStorage.removeItem(STORAGE_KEYS.POINTS);
        localStorage.removeItem(STORAGE_KEYS.LAST_VISIT);
        localStorage.removeItem(STORAGE_KEYS.VIEWED_IMAGES);
        localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
        console.log('User data reset');
    }

    /**
     * Get viewed images record
     * @returns {object} Record of viewed images with timestamps
     */
    function getViewedImages() {
        const data = localStorage.getItem(STORAGE_KEYS.VIEWED_IMAGES);
        return data ? JSON.parse(data) : {};
    }

    /**
     * Set viewed images record
     * @param {object} viewedImages - Record of viewed images
     */
    function setViewedImages(viewedImages) {
        localStorage.setItem(STORAGE_KEYS.VIEWED_IMAGES, JSON.stringify(viewedImages));
    }

    /**
     * Check if user can view an image (free if viewed within 3 days)
     * @param {string} imageUrl - Image URL to check
     * @returns {object} {canView: boolean, needsPayment: boolean, daysLeft: number}
     */
    function canViewImage(imageUrl) {
        const viewedImages = getViewedImages();
        const viewRecord = viewedImages[imageUrl];
        
        if (!viewRecord) {
            // Never viewed - needs payment
            const currentPoints = getPoints();
            return {
                canView: currentPoints >= POINTS_CONFIG.VIEW_IMAGE,
                needsPayment: true,
                daysLeft: 0,
                hasEnoughPoints: currentPoints >= POINTS_CONFIG.VIEW_IMAGE
            };
        }

        // Check if viewing period expired (3 days)
        const viewTime = new Date(viewRecord.timestamp);
        const now = new Date();
        const daysPassed = (now - viewTime) / (1000 * 60 * 60 * 24);
        
        if (daysPassed < 3) {
            // Still within free viewing period
            return {
                canView: true,
                needsPayment: false,
                daysLeft: Math.ceil(3 - daysPassed),
                hasEnoughPoints: true
            };
        } else {
            // Viewing period expired - needs payment again
            const currentPoints = getPoints();
            return {
                canView: currentPoints >= POINTS_CONFIG.VIEW_IMAGE,
                needsPayment: true,
                daysLeft: 0,
                hasEnoughPoints: currentPoints >= POINTS_CONFIG.VIEW_IMAGE
            };
        }
    }

    /**
     * Record image view and deduct points if needed
     * Also increments the global view count in the database
     * @param {string} imageUrl - Image URL being viewed
     * @returns {object} {success: boolean, pointsSpent: number, newTotal: number, message: string}
     */
    async function viewImage(imageUrl) {
        const viewStatus = canViewImage(imageUrl);
        
        if (!viewStatus.needsPayment) {
            // Free view - already paid within 3 days
            return {
                success: true,
                pointsSpent: 0,
                newTotal: getPoints(),
                message: `免费查看（还剩 ${viewStatus.daysLeft} 天）`
            };
        }

        if (!viewStatus.hasEnoughPoints) {
            // Not enough points
            return {
                success: false,
                pointsSpent: 0,
                newTotal: getPoints(),
                message: '积分不足，无法查看'
            };
        }

        // Deduct points and record view
        const newTotal = addPoints(-POINTS_CONFIG.VIEW_IMAGE);
        const viewedImages = getViewedImages();
        viewedImages[imageUrl] = {
            timestamp: new Date().toISOString(),
            viewCount: (viewedImages[imageUrl]?.viewCount || 0) + 1
        };
        setViewedImages(viewedImages);

        // Increment global view count in database
        try {
            await incrementViewCount(imageUrl);
        } catch (error) {
            console.error('Failed to increment view count in database:', error);
            // Continue anyway - local points already deducted
        }

        return {
            success: true,
            pointsSpent: POINTS_CONFIG.VIEW_IMAGE,
            newTotal: newTotal,
            message: `消费 ${POINTS_CONFIG.VIEW_IMAGE} 积分查看`
        };
    }

    /**
     * Increment the global view count for an image in the database
     * @param {string} imageUrl - Image URL to increment count for
     * @returns {Promise<void>}
     */
    async function incrementViewCount(imageUrl) {
        const API_ENDPOINTS = window.API_ENDPOINTS || {
            MYSQL_QUERY: 'https://letmetry.cloud/mysql/query'
        };

        const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sql: 'UPDATE beauty_images SET view_count = view_count + 1 WHERE image_url = ?',
                params: [imageUrl]
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to update view count: ${response.status}`);
        }

        const data = await response.json();
        console.log(`View count incremented for ${imageUrl}`);
        return data;
    }

    /**
     * Mark an image as deleted in the database (logical delete)
     * @param {string} imageUrl - Image URL to mark deleted
     * @returns {Promise<object>} DB response
     */
    async function markImageDeletedInDB(imageUrl) {
        const API_ENDPOINTS = window.API_ENDPOINTS || {
            MYSQL_QUERY: 'https://letmetry.cloud/mysql/query'
        };

        // First try exact-match update
        let response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sql: 'UPDATE beauty_images SET deleted = 1 WHERE image_url = ?',
                params: [imageUrl]
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to mark image deleted (HTTP ${response.status})`);
        }

        const data = await response.json();

        // If update affected no rows, try a fallback: match by prefix (first 255 chars)
        const affected = data && (data.affectedRows || data.changedRows || 0);
        if (affected > 0) {
            console.log(`Marked deleted in DB for ${imageUrl} (exact match)`);
            return data;
        }

        // Fallback: try to find by prefix (handles long URLs/truncation)
        const prefix = imageUrl.slice(0, 255);
        response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sql: 'SELECT id, image_url FROM beauty_images WHERE image_url LIKE ? LIMIT 1',
                params: [prefix + '%']
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to search image by prefix (HTTP ${response.status})`);
        }

        const rows = await response.json();
        if (Array.isArray(rows) && rows.length > 0) {
            const id = rows[0].id;
            // Update by id
            const updResp = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sql: 'UPDATE beauty_images SET deleted = 1 WHERE id = ?',
                    params: [id]
                })
            });

            if (!updResp.ok) {
                throw new Error(`Failed to mark image deleted by id (HTTP ${updResp.status})`);
            }

            const updResult = await updResp.json();
            const updAffected = updResult && (updResult.affectedRows || updResult.changedRows || 0);
            if (updAffected > 0) {
                console.log(`Marked deleted in DB for ${imageUrl} (matched by prefix, id=${id})`);
                return updResult;
            }
        }

        throw new Error('No matching image found to mark deleted');
    }

    /**
     * Request to logically delete an image by marking it deleted in DB and deducting points.
     * Does not remove the image file or change front-end display by itself.
     * @param {string} imageUrl - Image URL to delete
     * @returns {object} {success: boolean, pointsSpent: number, newTotal: number, message: string}
     */
    async function deleteImage(imageUrl) {
        const cost = POINTS_CONFIG.DELETE_IMAGE;

        const currentPoints = getPoints();
        if (currentPoints < cost) {
            return {
                success: false,
                pointsSpent: 0,
                newTotal: currentPoints,
                message: '积分不足，无法删除图片'
            };
        }

        // Deduct points first (optimistic)
        const newTotal = addPoints(-cost);

        try {
            await markImageDeletedInDB(imageUrl);
            return {
                success: true,
                pointsSpent: cost,
                newTotal: newTotal,
                message: `已消耗 ${cost} 积分，图片已标记为删除`
            };
        } catch (error) {
            console.error('Failed to mark image deleted in DB:', error);
            // refund points on failure
            addPoints(cost);
            return {
                success: false,
                pointsSpent: 0,
                newTotal: getPoints(),
                message: '删除失败，请稍后重试'
            };
        }
    }

    /**
     * Check if image has been viewed
     * @param {string} imageUrl - Image URL to check
     * @returns {boolean} True if viewed within 3 days
     */
    function hasViewedImage(imageUrl) {
        const status = canViewImage(imageUrl);
        return !status.needsPayment;
    }

    // Public API
    return {
        initialize: initialize,
        getUserUUID: getUserUUID,
        getPoints: getPoints,
        addPoints: addPoints,
        awardUploadPoints: awardUploadPoints,
        awardAdPoints: awardAdPoints,
        checkDailyVisit: checkDailyVisit,
        getUserInfo: getUserInfo,
        resetUser: resetUser,
        canViewImage: canViewImage,
        viewImage: viewImage,
        deleteImage: deleteImage,
        hasViewedImage: hasViewedImage,
        POINTS_CONFIG: POINTS_CONFIG
    };
})();

// Export for use in Node.js tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PointsSystem;
}
