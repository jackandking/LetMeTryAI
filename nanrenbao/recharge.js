/* global PointsSystem, API_ENDPOINTS */

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
    let selectedPackage = null;

    function showMessage(message, type) {
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
    }

    function updateBalance() {
        pointsElement.textContent = PointsSystem.getPoints();
    }

    async function readJson(response) {
        const text = await response.text();
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch (error) {
            throw new Error(`支付服务返回了无效响应（HTTP ${response.status}）`);
        }
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
        payButton.textContent = `使用支付宝支付 ¥${selectedPackage.amount}`;
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
            ? `使用支付宝支付 ¥${selectedPackage.amount}`
            : '请选择套餐';
    }

    async function createOrder() {
        if (!selectedPackage) return;
        const userUuid = PointsSystem.getUserInfo().uuid;
        if (!userUuid) {
            showMessage('用户信息尚未准备好，请刷新页面后重试', 'error');
            return;
        }
        payButton.disabled = true;
        showMessage('正在创建订单，请稍候……', 'info');
        try {
            const response = await fetch(API_ENDPOINTS.PAYMENT_CREATE_ORDER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userUuid,
                    packageId: selectedPackage.id
                })
            });
            const result = await readJson(response);
            if (!response.ok || !result.paymentUrl) {
                throw new Error(result.message || '支付服务暂未就绪，请稍后再试');
            }
            window.location.assign(result.paymentUrl);
        } catch (error) {
            showMessage(error.message || '订单创建失败，请稍后再试', 'error');
            payButton.disabled = false;
        }
    }

    async function checkReturnedOrder() {
        const orderNo = new URLSearchParams(window.location.search).get('orderNo');
        if (!orderNo) return;

        const userUuid = PointsSystem.getUserInfo().uuid;
        if (!userUuid) {
            showMessage('用户信息尚未准备好，请刷新页面后重试', 'error');
            return;
        }
        showMessage('已返回支付页面，正在确认订单……', 'info');
        for (let attempt = 0; attempt < 12; attempt += 1) {
            try {
                const url = `${API_ENDPOINTS.PAYMENT_QUERY_ORDER}/${encodeURIComponent(orderNo)}?userUuid=${encodeURIComponent(userUuid)}`;
                const response = await fetch(url);
                const order = await readJson(response);
                if (!response.ok) throw new Error(order.message || '订单查询失败');
                if (order.status === 'PAID') {
                    const claimResponse = await fetch(`${API_ENDPOINTS.PAYMENT_QUERY_ORDER}/${encodeURIComponent(orderNo)}/claim`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userUuid })
                    });
                    const claim = await readJson(claimResponse);
                    if (!claimResponse.ok) throw new Error(claim.message || '积分领取失败');
                    if (claim.credited) {
                        PointsSystem.addPoints(Number(claim.points));
                        updateBalance();
                        showMessage(`支付成功，已到账 ${claim.points} 积分。订单号：${orderNo}`, 'info');
                    } else {
                        showMessage(`订单已支付，积分已领取。订单号：${orderNo}`, 'info');
                    }
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return;
                }
            } catch (error) {
                showMessage(error.message || '订单查询失败，请稍后重试', 'error');
                return;
            }
            await new Promise((resolve) => window.setTimeout(resolve, 2500));
        }
        showMessage(`订单仍在确认中，请稍后刷新查看。订单号：${orderNo}`, 'info');
    }

    PointsSystem.initialize();
    updateBalance();
    renderPackages();
    payButton.addEventListener('click', createOrder);
    checkReturnedOrder();
})();
