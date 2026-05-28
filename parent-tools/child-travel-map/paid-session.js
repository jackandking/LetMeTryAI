(function (globalScope) {
    function createPaidSession(payload = {}) {
        return {
            paid: true,
            orderId: payload.orderId || '',
            paidAt: payload.paidAt || Date.now()
        };
    }

    function isPaidSessionActive(session, now = Date.now(), ttlMs = 30 * 60 * 1000) {
        if (!session || session.paid !== true || !session.paidAt) {
            return false;
        }

        const age = now - Number(session.paidAt);
        return age >= 0 && age <= ttlMs;
    }

    const exported = {
        createPaidSession,
        isPaidSessionActive
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exported;
    }

    globalScope.ChildTravelMapPaidSession = exported;
})(typeof window !== 'undefined' ? window : globalThis);
