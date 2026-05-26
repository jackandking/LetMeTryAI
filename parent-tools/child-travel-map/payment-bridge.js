(function (globalScope) {
    const APP_ORIGIN = 'https://letmetryai.cn';
    const MINIAPP_PAY_PATH = '/pages/pay/pay';

    function buildReturnUrl(locationHref, params = {}) {
        const currentUrl = new URL(locationHref, APP_ORIGIN);
        currentUrl.searchParams.delete('paid');
        currentUrl.searchParams.delete('orderId');
        currentUrl.searchParams.delete('payment');

        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') {
                currentUrl.searchParams.delete(key);
            } else {
                currentUrl.searchParams.set(key, String(value));
            }
        });

        return currentUrl.toString();
    }

    function buildNativePayUrl(payload) {
        const {
            openid,
            productId,
            quantity,
            totalAmount,
            subject,
            body,
            returnUrl
        } = payload;

        const query = new URLSearchParams({
            openid: openid || '',
            productId: productId || '',
            quantity: String(quantity || 1),
            totalAmount: String(totalAmount || 0),
            subject: subject || '',
            body: body || '',
            returnUrl: returnUrl || ''
        });

        return `${MINIAPP_PAY_PATH}?${query.toString()}`;
    }

    function normalizeReturnTarget(returnUrl) {
        if (!returnUrl) return null;
        const parsed = new URL(returnUrl, APP_ORIGIN);
        if (parsed.origin !== APP_ORIGIN) return null;
        return `${parsed.pathname.replace(/^\//, '')}${parsed.search}${parsed.hash}`;
    }

    function shouldAutoGenerate(search) {
        const params = new URLSearchParams(search);
        return params.get('paid') === '1';
    }

    const exported = {
        APP_ORIGIN,
        MINIAPP_PAY_PATH,
        buildReturnUrl,
        buildNativePayUrl,
        normalizeReturnTarget,
        shouldAutoGenerate
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exported;
    }

    globalScope.ChildTravelMapPaymentBridge = exported;
})(typeof window !== 'undefined' ? window : globalThis);
