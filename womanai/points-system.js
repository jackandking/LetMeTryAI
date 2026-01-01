/**
 * Points System for Womanai
 * Lightweight adaptation of nanrenbao points mechanism using localStorage
 */

const PointsSystem = (function() {
    const STORAGE_KEYS = {
        USER_UUID: 'womanai_user_uuid',
        POINTS: 'womanai_points',
        LAST_VISIT: 'womanai_last_visit',
        VIEWED_ITEMS: 'womanai_viewed_items',
        INITIALIZED: 'womanai_initialized'
    };

    const POINTS_CONFIG = {
        NEW_USER: 3,
        DAILY_VISIT: 5,
        UPLOAD_IMAGE: 10,
        VIEW_ITEM: 1,
        AD_FULL: 10,
        AD_PARTIAL: 3
    };

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function getUserUUID() {
        let uuid = localStorage.getItem(STORAGE_KEYS.USER_UUID);
        if (!uuid) {
            uuid = generateUUID();
            localStorage.setItem(STORAGE_KEYS.USER_UUID, uuid);
        }
        return uuid;
    }

    function getPoints() {
        const points = localStorage.getItem(STORAGE_KEYS.POINTS);
        return points ? parseInt(points, 10) : 0;
    }

    function setPoints(points) {
        localStorage.setItem(STORAGE_KEYS.POINTS, points.toString());
    }

    function addPoints(points) {
        const current = getPoints();
        const next = current + points;
        setPoints(next);
        return next;
    }

    function initializeNewUser() {
        const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
        if (!isInitialized) {
            setPoints(POINTS_CONFIG.NEW_USER);
            localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
            return true;
        }
        return false;
    }

    function checkDailyVisit() {
        const today = new Date().toISOString().split('T')[0];
        const lastVisit = localStorage.getItem(STORAGE_KEYS.LAST_VISIT);
        if (lastVisit !== today) {
            const newTotal = addPoints(POINTS_CONFIG.DAILY_VISIT);
            localStorage.setItem(STORAGE_KEYS.LAST_VISIT, today);
            return { awarded: true, points: POINTS_CONFIG.DAILY_VISIT, newTotal };
        }
        return { awarded: false, points: 0, newTotal: getPoints() };
    }

    function awardUploadPoints() {
        return addPoints(POINTS_CONFIG.UPLOAD_IMAGE);
    }

    function awardAdPoints(watchedFull) {
        const pts = watchedFull ? POINTS_CONFIG.AD_FULL : POINTS_CONFIG.AD_PARTIAL;
        const newTotal = addPoints(pts);
        return { pointsAwarded: pts, newTotal, watchedFull };
    }

    function initialize() {
        const uuid = getUserUUID();
        const isNewUser = initializeNewUser();
        const dailyVisit = checkDailyVisit();
        return { uuid, isNewUser, dailyVisit, currentPoints: getPoints() };
    }

    function getUserInfo() {
        return {
            uuid: getUserUUID(),
            points: getPoints(),
            lastVisit: localStorage.getItem(STORAGE_KEYS.LAST_VISIT)
        };
    }

    function resetUser() {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    }

    function getViewedItems() {
        const data = localStorage.getItem(STORAGE_KEYS.VIEWED_ITEMS);
        return data ? JSON.parse(data) : {};
    }

    function setViewedItems(record) {
        localStorage.setItem(STORAGE_KEYS.VIEWED_ITEMS, JSON.stringify(record));
    }

    function canViewItem(url) {
        const viewed = getViewedItems();
        const record = viewed[url];
        if (!record) {
            const current = getPoints();
            return { canView: current >= POINTS_CONFIG.VIEW_ITEM, needsPayment: true, daysLeft: 0, hasEnoughPoints: current >= POINTS_CONFIG.VIEW_ITEM };
        }
        const viewTime = new Date(record.timestamp);
        const daysPassed = (Date.now() - viewTime) / (1000 * 60 * 60 * 24);
        if (daysPassed < 3) {
            return { canView: true, needsPayment: false, daysLeft: Math.ceil(3 - daysPassed), hasEnoughPoints: true };
        }
        const current = getPoints();
        return { canView: current >= POINTS_CONFIG.VIEW_ITEM, needsPayment: true, daysLeft: 0, hasEnoughPoints: current >= POINTS_CONFIG.VIEW_ITEM };
    }

    async function viewItem(url) {
        const status = canViewItem(url);
        if (!status.needsPayment) {
            return { success: true, pointsSpent: 0, newTotal: getPoints(), message: `免费查看（还剩 ${status.daysLeft} 天）` };
        }
        if (!status.hasEnoughPoints) {
            return { success: false, pointsSpent: 0, newTotal: getPoints(), message: '积分不足，无法查看' };
        }
        const newTotal = addPoints(-POINTS_CONFIG.VIEW_ITEM);
        const viewed = getViewedItems();
        viewed[url] = { timestamp: new Date().toISOString(), viewCount: (viewed[url]?.viewCount || 0) + 1 };
        setViewedItems(viewed);
        try {
            await incrementViewCount(url);
        } catch (err) {
            console.error('Failed to increment view count:', err);
        }
        return { success: true, pointsSpent: POINTS_CONFIG.VIEW_ITEM, newTotal, message: `消费 ${POINTS_CONFIG.VIEW_ITEM} 积分查看` };
    }

    async function incrementViewCount(imageUrl) {
        const API_ENDPOINTS = window.API_ENDPOINTS || { MYSQL_QUERY: 'https://letmetry.cloud/mysql/query' };
        const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sql: 'UPDATE handsome_images SET view_count = view_count + 1 WHERE image_url = ?',
                params: [imageUrl]
            })
        });
        if (!response.ok) {
            throw new Error(`Failed to update view count: ${response.status}`);
        }
        return response.json();
    }

    async function markItemViewed(imageUrl) {
        const viewed = getViewedItems();
        viewed[imageUrl] = { timestamp: new Date().toISOString(), viewCount: (viewed[imageUrl]?.viewCount || 0) + 1 };
        setViewedItems(viewed);
        try { await incrementViewCount(imageUrl); } catch (err) { console.error('Failed to increment view count:', err); }
        return { success: true };
    }

    return {
        POINTS_CONFIG,
        initialize,
        getPoints,
        addPoints,
        awardUploadPoints,
        awardAdPoints,
        getUserInfo,
        resetUser,
        canViewItem,
        viewItem,
        markItemViewed
    };
})();

if (typeof window !== 'undefined') {
    window.PointsSystem = PointsSystem;
}
