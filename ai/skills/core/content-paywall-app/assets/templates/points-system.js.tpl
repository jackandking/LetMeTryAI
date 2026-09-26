/**
 * Points System for {{APP_NAME}}
 * Manages user points using localStorage
 */

const PointsSystem = (function() {
    const STORAGE_KEYS = {
        USER_UUID: '{{STORAGE_PREFIX}}_user_uuid',
        POINTS: '{{STORAGE_PREFIX}}_points',
        LAST_VISIT: '{{STORAGE_PREFIX}}_last_visit',
        VIEWED_IMAGES: '{{STORAGE_PREFIX}}_viewed_images',
        INITIALIZED: '{{STORAGE_PREFIX}}_initialized'
    };

    const POINTS_CONFIG = {
        NEW_USER: {{PV_NEW_USER}},
        DAILY_VISIT: {{PV_DAILY_VISIT}},
        UPLOAD_IMAGE: {{PV_UPLOAD}},
        VIEW_IMAGE: {{PV_VIEW}},
        FREE_DAYS: {{PV_FREE_DAYS}},
        AD_FULL: {{PV_AD_FULL}},
        AD_PARTIAL: {{PV_AD_PARTIAL}}
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
        const newPoints = getPoints() + points;
        setPoints(newPoints);
        return newPoints;
    }

    function initializeNewUser() {
        const uuid = getUserUUID();
        if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
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
            return { awarded: true, points: POINTS_CONFIG.DAILY_VISIT, newTotal: newTotal };
        }
        return { awarded: false, points: 0, newTotal: getPoints() };
    }

    function awardUploadPoints() {
        return addPoints(POINTS_CONFIG.UPLOAD_IMAGE);
    }

    function awardAdPoints(watchedFull) {
        const pointsToAward = watchedFull ? POINTS_CONFIG.AD_FULL : POINTS_CONFIG.AD_PARTIAL;
        return { pointsAwarded: pointsToAward, newTotal: addPoints(pointsToAward), watchedFull: watchedFull };
    }

    function initialize() {
        const uuid = getUserUUID();
        const isNewUser = initializeNewUser();
        const dailyVisit = checkDailyVisit();
        return { uuid: uuid, isNewUser: isNewUser, dailyVisit: dailyVisit, currentPoints: getPoints() };
    }

    function getViewedImages() {
        const data = localStorage.getItem(STORAGE_KEYS.VIEWED_IMAGES);
        return data ? JSON.parse(data) : {};
    }

    function canViewImage(imageUrl) {
        const viewedImages = getViewedImages();
        const viewRecord = viewedImages[imageUrl];
        const currentPoints = getPoints();

        if (viewRecord) {
            const daysPassed = (Date.now() - new Date(viewRecord.timestamp)) / (1000 * 60 * 60 * 24);
            if (daysPassed < POINTS_CONFIG.FREE_DAYS) {
                return { canView: true, needsPayment: false, daysLeft: Math.ceil(POINTS_CONFIG.FREE_DAYS - daysPassed), hasEnoughPoints: true };
            }
        }
        return {
            canView: currentPoints >= POINTS_CONFIG.VIEW_IMAGE,
            needsPayment: true,
            daysLeft: 0,
            hasEnoughPoints: currentPoints >= POINTS_CONFIG.VIEW_IMAGE
        };
    }

    async function viewImage(imageUrl) {
        const permission = canViewImage(imageUrl);
        if (!permission.canView) {
            return { success: false, pointsSpent: 0, message: '积分不足，需 ' + POINTS_CONFIG.VIEW_IMAGE + ' 积分解锁' };
        }

        let pointsSpent = 0;
        if (permission.needsPayment) {
            setPoints(getPoints() - POINTS_CONFIG.VIEW_IMAGE);
            pointsSpent = POINTS_CONFIG.VIEW_IMAGE;
        }

        const viewedImages = getViewedImages();
        viewedImages[imageUrl] = { timestamp: Date.now() };
        localStorage.setItem(STORAGE_KEYS.VIEWED_IMAGES, JSON.stringify(viewedImages));

        return { success: true, pointsSpent: pointsSpent, newTotal: getPoints(), message: '解锁成功' };
    }

    function resetUser() {
        Object.keys(STORAGE_KEYS).forEach(function(key) {
            localStorage.removeItem(STORAGE_KEYS[key]);
        });
    }

    return {
        POINTS_CONFIG: POINTS_CONFIG,
        initialize: initialize,
        getPoints: getPoints,
        addPoints: addPoints,
        awardUploadPoints: awardUploadPoints,
        awardAdPoints: awardAdPoints,
        canViewImage: canViewImage,
        viewImage: viewImage,
        resetUser: resetUser
    };
})();