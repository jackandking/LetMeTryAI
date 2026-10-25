/**
 * Points System for Nanrenbao
 * Manages user points using localStorage
 */

const PointsSystem = (function() {
    const STORAGE_KEYS = {
        USER_UUID: 'nanrenbao_user_uuid',
        POINTS: 'nanrenbao_points',
        LAST_VISIT: 'nanrenbao_last_visit',
        LAST_SHARE: 'nanrenbao_last_share', // 转发得积分记录：JSON { date: 'YYYY-MM-DD', count: N }
        VIEWED_IMAGES: 'nanrenbao_viewed_images',
        INITIALIZED: 'nanrenbao_initialized',
        VIEWED_IDS: 'nanrenbao_viewed_ids'
    };

    const POINTS_CONFIG = {
        NEW_USER: 3,           // Initial points for new users
        DAILY_VISIT: 5,        // Points for daily visit
        UPLOAD_IMAGE: 10,       // Points for uploading an image
        VIEW_IMAGE: 1,          // Points to view a full image
        DELETE_IMAGE: 10,      // Points cost to mark an image as deleted
        AD_FULL: 10,            // Points for watching full ad
        AD_PARTIAL: 3,          // Points for partially watching ad
        SHARE: 10,              // Points per share (honor-system on H5, no reliable verification)
        SHARE_DAILY_LIMIT: 10   // Max share rewards per day
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
     * Get today's date string (YYYY-MM-DD, local-ish via ISO).
     * @returns {string}
     */
    function getTodayStr() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Read the share-reward record for the current user.
     * Stored as JSON { date: 'YYYY-MM-DD', count: N }. Expired days reset to 0.
     * @returns {object} { date: string, count: number }
     */
    function getShareRecord() {
        const today = getTodayStr();
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.LAST_SHARE);
            if (raw) {
                const obj = JSON.parse(raw);
                if (obj && typeof obj.date === 'string' && typeof obj.count === 'number') {
                    if (obj.date === today) {
                        return { date: today, count: obj.count };
                    }
                    // Old day -> reset count
                    return { date: today, count: 0 };
                }
            }
        } catch (e) {
            // Corrupted value -> treat as no record
        }
        return { date: today, count: 0 };
    }

    /**
     * How many share rewards are still available today.
     * @returns {number} Remaining share rewards (0..SHARE_DAILY_LIMIT).
     */
    function getShareRemainingToday() {
        const rec = getShareRecord();
        return Math.max(0, POINTS_CONFIG.SHARE_DAILY_LIMIT - rec.count);
    }

    /**
     * Whether the user can still earn a share reward today.
     * @returns {boolean} True if at least one share reward is available.
     */
    function canShareToday() {
        return getShareRemainingToday() > 0;
    }

    /**
     * Award points for sharing (honor-system, up to SHARE_DAILY_LIMIT per day).
     *
     * IMPORTANT: On the H5/browser entry point there is NO reliable way to
     * verify that a share actually completed — the Web Share API does not
     * confirm the content was posted. This is a trust-based reward. The Kuaishou
     * mini-program (separate runtime) would instead verify via the platform
     * share callback before awarding; there the share button is hidden entirely
     * (see appreciate.html / back-view-killer.html environment detection).
     * See POINTS-SYSTEM.md "转发送积分".
     * @returns {object} {awarded: boolean, points: number, newTotal: number, remaining: number, message: string}
     */
    function awardSharePoints() {
        const remaining = getShareRemainingToday();
        if (remaining <= 0) {
            return {
                awarded: false,
                points: 0,
                newTotal: getPoints(),
                remaining: 0,
                message: `今日转发已拿满（${POINTS_CONFIG.SHARE_DAILY_LIMIT}×${POINTS_CONFIG.SHARE} 分），明天再来`
            };
        }

        const newTotal = addPoints(POINTS_CONFIG.SHARE);

        // Persist count for today as JSON { date, count }
        const today = getTodayStr();
        const rec = getShareRecord();
        const newCount = (rec.date === today ? rec.count : 0) + 1;
        localStorage.setItem(STORAGE_KEYS.LAST_SHARE, JSON.stringify({ date: today, count: newCount }));
        const left = POINTS_CONFIG.SHARE_DAILY_LIMIT - newCount;

        console.log(`Share bonus: +${POINTS_CONFIG.SHARE} points (${newCount}/${POINTS_CONFIG.SHARE_DAILY_LIMIT} today). Total: ${newTotal}`);
        return {
            awarded: true,
            points: POINTS_CONFIG.SHARE,
            newTotal: newTotal,
            remaining: left,
            message: left > 0
                ? `🎉 转发成功！获得 ${POINTS_CONFIG.SHARE} 积分（今日还可转发 ${left} 次）`
                : `🎉 转发成功！获得 ${POINTS_CONFIG.SHARE} 积分（今日已拿满）`
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
        localStorage.removeItem(STORAGE_KEYS.LAST_SHARE);
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
            MYSQL_QUERY: 'https://letmetry.cn/mysql/query'
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
     * Mark a beauty image as viewed without charging points (used for harem auto-collect)
     * @param {string} imageUrl
     */
    async function markImageViewed(imageUrl) {
        const viewedImages = getViewedImages();
        viewedImages[imageUrl] = {
            timestamp: new Date().toISOString(),
            viewCount: (viewedImages[imageUrl]?.viewCount || 0) + 1
        };
        setViewedImages(viewedImages);

        try {
            await incrementViewCount(imageUrl);
        } catch (err) {
            console.error('Failed to increment beauty image view count:', err);
        }

        return { success: true };
    }

    /**
     * Mark an image as deleted in the database (logical delete)
     * Routes through the dedicated /api/beauty/delete endpoint — the raw
     * `UPDATE beauty_images SET deleted = 1` sent via /mysql/query has been
     * rejected with 403 since the 2026-09-06 read-only lockdown.
     * @param {string} imageUrl - Image URL to mark deleted
     * @returns {Promise<object>} Endpoint response ({ success, affectedRows })
     */
    async function markImageDeletedInDB(imageUrl) {
        const API_ENDPOINTS = window.API_ENDPOINTS || {};
        // 双兜底：window.API_ENDPOINTS 缺项（旧缓存 config.js）时用硬编码默认值
        const BEAUTY_DELETE = API_ENDPOINTS.BEAUTY_DELETE || 'https://letmetry.cn/api/beauty/delete';
        const MYSQL_QUERY = API_ENDPOINTS.MYSQL_QUERY || 'https://letmetry.cn/mysql/query';
        const uuid = getUserUUID();

        // First try exact-match delete via the dedicated endpoint
        let response = await fetch(BEAUTY_DELETE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageUrl: imageUrl, uuid: uuid })
        });

        if (!response.ok) {
            throw new Error(`Failed to mark image deleted (HTTP ${response.status})`);
        }

        const data = await response.json();
        const affected = data && (data.affectedRows || 0);
        if (affected > 0) {
            console.log(`Marked deleted in DB for ${imageUrl} (exact match)`);
            return data;
        }

        // Fallback: try to find by prefix (handles long URLs/truncation), then delete by id
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
            // Delete by id through the dedicated endpoint
            const updResp = await fetch(BEAUTY_DELETE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: id, uuid: uuid })
            });

            if (!updResp.ok) {
                throw new Error(`Failed to mark image deleted by id (HTTP ${updResp.status})`);
            }

            const updResult = await updResp.json();
            const updAffected = updResult && (updResult.affectedRows || 0);
            if (updAffected > 0) {
                console.log(`Marked deleted in DB for ${imageUrl} (matched by prefix, id=${id})`);
                return updResult;
            }
        }

        throw new Error('No matching image found to mark deleted');
    }

    /**
     * Mark a back_view image as deleted by id in the database.
     * Routes through the dedicated /api/backview/delete endpoint — the raw
     * `UPDATE back_view_images SET deleted = 1` sent via /mysql/query has been
     * rejected with 403 since the 2026-09-06 read-only lockdown.
     * @param {number} id - back_view_images.id
     * @returns {Promise<object>}
     */
    async function markBackViewDeletedById(id) {
        const API_ENDPOINTS = window.API_ENDPOINTS || {};
        // 双兜底：window.API_ENDPOINTS 缺项（旧缓存 config.js）时用硬编码默认值
        const BACKVIEW_DELETE = API_ENDPOINTS.BACKVIEW_DELETE || 'https://letmetry.cn/api/backview/delete';

        const resp = await fetch(BACKVIEW_DELETE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, uuid: getUserUUID() })
        });

        if (!resp.ok) throw new Error(`Failed to mark back_view deleted (HTTP ${resp.status})`);
        const json = await resp.json();
        return json;
    }

    /**
     * Mark a back-view image as viewed (no points charged). Updates local view record and DB click_count.
     * @param {number} id
     */
    async function markBackViewViewedById(id) {
        const key = `back_view_${id}`;
        const viewedImages = getViewedImages();
        viewedImages[key] = {
            timestamp: new Date().toISOString(),
            viewCount: (viewedImages[key]?.viewCount || 0) + 1
        };
        setViewedImages(viewedImages);

        try {
            const API_ENDPOINTS = window.API_ENDPOINTS || { MYSQL_QUERY: 'https://letmetry.cn/mysql/query' };
            await fetch(API_ENDPOINTS.MYSQL_QUERY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql: 'UPDATE back_view_images SET click_count = click_count + 1 WHERE id = ?', params: [id] })
            });
        } catch (err) {
            console.error('Failed to increment back_view click count:', err);
        }

        return { success: true };
    }

    /**
     * Delete a back-view-killer image (logical) by id and deduct points
     * @param {number} id
     */
    async function deleteBackViewImage(id) {
        const cost = POINTS_CONFIG.DELETE_IMAGE;
        const currentPoints = getPoints();
        if (currentPoints < cost) {
            return { success: false, pointsSpent: 0, newTotal: currentPoints, message: '积分不足，无法删除图片' };
        }

        const newTotal = addPoints(-cost);
        try {
            const res = await markBackViewDeletedById(id);
            // consider success when affectedRows or changedRows > 0
            const affected = res && (res.affectedRows || res.changedRows || 0);
            if (affected > 0) {
                return { success: true, pointsSpent: cost, newTotal: newTotal, message: `已消耗 ${cost} 积分，图片已标记为删除` };
            } else {
                // refund
                addPoints(cost);
                return { success: false, pointsSpent: 0, newTotal: getPoints(), message: '删除失败，未找到目标' };
            }
        } catch (err) {
            console.error('Failed to delete back view image:', err);
            addPoints(cost);
            return { success: false, pointsSpent: 0, newTotal: getPoints(), message: '删除失败，请稍后重试' };
        }
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

    /**
     * Get viewed IDs record
     * @param {string} type - Type of images ('beauty' or 'backview')
     * @returns {Array} Array of viewed IDs
     */
    function getViewedIds(type) {
        const data = localStorage.getItem(STORAGE_KEYS.VIEWED_IDS);
        const allViewed = data ? JSON.parse(data) : {};
        return allViewed[type] || [];
    }

    /**
     * Save viewed IDs record
     * @param {string} type - Type of images ('beauty' or 'backview')
     * @param {Array} ids - Array of viewed IDs
     */
    function saveViewedIds(type, ids) {
        const data = localStorage.getItem(STORAGE_KEYS.VIEWED_IDS);
        const allViewed = data ? JSON.parse(data) : {};
        allViewed[type] = ids;
        localStorage.setItem(STORAGE_KEYS.VIEWED_IDS, JSON.stringify(allViewed));
    }

    /**
     * Mark an image ID as viewed (for prioritizing unseen images)
     * @param {number|string} id - Image ID
     * @param {string} type - Type of images ('beauty' or 'backview')
     */
    function markImageIdAsViewed(id, type) {
        const viewedIds = getViewedIds(type);
        const idStr = String(id);
        if (!viewedIds.includes(idStr)) {
            viewedIds.push(idStr);
            saveViewedIds(type, viewedIds);
        }
    }

    /**
     * Check if an image ID has been viewed
     * @param {number|string} id - Image ID
     * @param {string} type - Type of images ('beauty' or 'backview')
     * @returns {boolean} True if viewed
     */
    function hasViewedImageId(id, type) {
        const viewedIds = getViewedIds(type);
        return viewedIds.includes(String(id));
    }

    /**
     * Sort images array: unseen images first, then by original order
     * @param {Array} images - Array of image objects
     * @param {string} idField - Field name for ID (e.g., 'id')
     * @param {string} type - Type of images ('beauty' or 'backview')
     * @returns {Array} Sorted array
     */
    function sortImagesByViewedStatus(images, idField, type) {
        const viewedIds = getViewedIds(type);
        return images.slice().sort((a, b) => {
            const aViewed = viewedIds.includes(String(a[idField]));
            const bViewed = viewedIds.includes(String(b[idField]));
            // Unseen images come first
            if (aViewed === bViewed) return 0;
            return aViewed ? 1 : -1;
        });
    }

    // Public API
    return {
        initialize: initialize,
        getUserUUID: getUserUUID,
        getPoints: getPoints,
        addPoints: addPoints,
        awardUploadPoints: awardUploadPoints,
        awardAdPoints: awardAdPoints,
        canShareToday: canShareToday,
        getShareRemainingToday: getShareRemainingToday,
        awardSharePoints: awardSharePoints,
        checkDailyVisit: checkDailyVisit,
        getUserInfo: getUserInfo,
        resetUser: resetUser,
        canViewImage: canViewImage,
        viewImage: viewImage,
        markImageViewed: markImageViewed,
        deleteImage: deleteImage,
        deleteBackViewImage: deleteBackViewImage,
        markBackViewViewedById: markBackViewViewedById,
        hasViewedImage: hasViewedImage,
        POINTS_CONFIG: POINTS_CONFIG,
        // Viewed IDs API for prioritizing unseen images
        markImageIdAsViewed: markImageIdAsViewed,
        hasViewedImageId: hasViewedImageId,
        sortImagesByViewedStatus: sortImagesByViewedStatus
    };
})();

// Export for use in Node.js tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PointsSystem;
}
