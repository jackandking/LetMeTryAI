import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rechargeSource = fs.readFileSync(path.join(__dirname, 'recharge.js'), 'utf8');
let dom;

function loadRecharge({ search = '', responses = [] } = {}) {
    dom = new JSDOM(`<!doctype html><body>
        <div id="packages"></div>
        <strong id="pointsValue"></strong>
        <button id="payButton"></button>
        <div id="message"></div>
    </body>`, {
        runScripts: 'outside-only',
        url: `https://test.example/nanrenbao/recharge.html${search}`
    });
    global.window = dom.window;
    global.document = dom.window.document;
    dom.window.API_ENDPOINTS = {
        PAYMENT_CREATE_ORDER: 'https://test.example/payment/alipay/create-order',
        PAYMENT_QUERY_ORDER: 'https://test.example/payment/order'
    };
    const pointsSystem = {
        initialize: jest.fn(),
        getPoints: jest.fn(() => 3),
        getUserInfo: jest.fn(() => ({ uuid: 'user-uuid-1' })),
        addPoints: jest.fn()
    };
    dom.window.PointsSystem = pointsSystem;
    global.fetch.mockImplementation(async () => responses.shift() || {});
    dom.window.fetch = global.fetch;

    dom.window.eval(rechargeSource);
    return {
        packages: dom.window.document.querySelector('#packages'),
        payButton: dom.window.document.querySelector('#payButton'),
        message: dom.window.document.querySelector('#message'),
        points: dom.window.document.querySelector('#pointsValue'),
        pointsSystem
    };
}

async function flushPromises() {
    for (let index = 0; index < 6; index += 1) {
        await Promise.resolve();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('nanrenbao recharge payment flow', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        dom?.window.close();
        delete global.window;
        delete global.document;
    });

    it('renders the default package and records an intent without creating an order', async () => {
        const page = loadRecharge();

        expect(page.packages.querySelectorAll('.package')).toHaveLength(3);
        expect(page.payButton.textContent).toContain('支付意向');

        page.payButton.click();
        await flushPromises();

        expect(fetch).toHaveBeenCalledWith(
            'https://letmetry.cloud/api/track',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"event":"payment_intent"')
            })
        );
        expect(fetch).not.toHaveBeenCalledWith(
            'https://test.example/payment/alipay/create-order',
            expect.anything()
        );
        expect(page.message.textContent).toContain('已记录你的支付意向');
    });

    it('does not query or claim an old order while payment is paused', async () => {
        const page = loadRecharge({
            search: '?orderNo=ORDER%2F123',
        });

        await flushPromises();

        expect(fetch).not.toHaveBeenCalled();
        expect(page.pointsSystem.addPoints).not.toHaveBeenCalled();
        expect(page.message.textContent).toBe('支付功能暂未开放，暂不处理订单回跳。');
    });

    it('records the selected package details', async () => {
        const page = loadRecharge();

        page.packages.querySelector('[data-package-id="points_550"]').click();
        page.payButton.click();
        await flushPromises();

        const [, request] = fetch.mock.calls[0];
        expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
            event: 'payment_intent',
            packageId: 'points_550',
            points: 550,
            amount: '5.00'
        }));
    });
});
