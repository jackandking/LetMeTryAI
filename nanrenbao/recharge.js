/* global PointsSystem */

(function () {
    'use strict';

    const PACKAGES = [
        { id: 'points_100', points: 100, amount: '1.00' },
        { id: 'points_550', points: 550, amount: '5.00' },
        { id: 'points_1200', points: 1200, amount: '10.00' }
    ];

    const packagesElement = document.getElementById('packages');
    const pointsElement = document.getElementById('pointsValue');
    const payButton = document.getElementById('payButton');
    const messageElement = document.getElementById('message');
    const EVENT_ENDPOINT = 'https://letmetry.cloud/api/track';
    const INTENT_STORAGE_KEY = 'nanrenbao_payment_intents';
    let selectedPackage = null;

    function showMessage(message, type) {
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
    }

    function updateBalance() {
        pointsElement.textContent = PointsSystem.getPoints();
    }

    function getIntentCount() {
        const count = Number.parseInt(window.localStorage.getItem(INTENT_STORAGE_KEY), 10);
        return Number.isFinite(count) ? count : 0;
    }

    function renderPackages() {
        packagesElement.innerHTML = PACKAGES.map((item, index) => `
            <button class="package${index === 0 ? ' selected' : ''}" type="button"
                role="radio" aria-checked="${index === 0}" data-package-id="${item.id}">
                <span class="points">${item.points} 积分</span>
                <span class="price">¥${item.amount}</span>
            </button>
        `).join('');
        selectedPackage = PACKAGES[0];
        payButton.disabled = false;
        payButton.textContent = `支付宝支付意向 ¥${selectedPackage.amount}`;
        packagesElement.querySelectorAll('.package').forEach((button) => {
            button.addEventListener('click', () => selectPackage(button.dataset.packageId));
        });
    }

    function selectPackage(packageId) {
        selectedPackage = PACKAGES.find((item) => item.id === packageId);
        packagesElement.querySelectorAll('.package').forEach((button) => {
            const selected = button.dataset.packageId === packageId;
            button.classList.toggle('selected', selected);
            button.setAttribute('aria-checked', String(selected));
        });
        payButton.disabled = !selectedPackage;
        payButton.textContent = selectedPackage
            ? `支付宝支付意向 ¥${selectedPackage.amount}`
            : '请选择套餐';
    }

    function recordPaymentIntent() {
        if (!selectedPackage) return;
        const userInfo = PointsSystem.getUserInfo();
        const intentCount = getIntentCount() + 1;
        window.localStorage.setItem(INTENT_STORAGE_KEY, String(intentCount));
        const payload = {
            event: 'payment_intent',
            appId: 'nanrenbao-recharge',
            packageId: selectedPackage.id,
            points: selectedPackage.points,
            amount: selectedPackage.amount,
            userUuid: userInfo.uuid,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0]
        };
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            navigator.sendBeacon(EVENT_ENDPOINT, JSON.stringify(payload));
        } else if (typeof fetch !== 'undefined') {
            fetch(EVENT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        }
        showMessage(`支付功能暂未开放，已记录你的支付意向（本设备累计 ${intentCount} 次）。`, 'info');
    }

    function showPaymentPausedMessage() {
        const orderNo = new URLSearchParams(window.location.search).get('orderNo');
        if (!orderNo) return;
        showMessage('支付功能暂未开放，暂不处理订单回跳。', 'info');
    }

    PointsSystem.initialize();
    updateBalance();
    renderPackages();
    payButton.addEventListener('click', recordPaymentIntent);
    showPaymentPausedMessage();
})();
