import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadBridge() {
    const source = fs.readFileSync(path.join(__dirname, 'payment-bridge.js'), 'utf8');
    const sandbox = { globalThis: {}, URL, URLSearchParams, module: undefined };
    sandbox.window = sandbox.globalThis;
    vm.runInNewContext(source, sandbox);
    return sandbox.globalThis.ChildTravelMapPaymentBridge;
}

describe('child-travel-map payment bridge', () => {
    const {
        buildReturnUrl,
        buildNativePayUrl,
        normalizeReturnTarget,
        shouldAutoGenerate
    } = loadBridge();

    it('builds a return url that marks payment success', () => {
        const result = buildReturnUrl(
            'https://letmetryai.cn/parent-tools/child-travel-map/?openid=abc&paid=0',
            { paid: 1, payment: 'wechat' }
        );

        expect(result).toBe(
            'https://letmetryai.cn/parent-tools/child-travel-map/?openid=abc&paid=1&payment=wechat'
        );
    });

    it('builds native pay url with h5 payload', () => {
        const result = buildNativePayUrl({
            openid: 'openid-1',
            productId: 'child-travel-map',
            quantity: 1,
            totalAmount: 100,
            subject: '孩子足迹地图生成',
            body: '解锁高清足迹图',
            returnUrl: 'https://letmetryai.cn/parent-tools/child-travel-map/?paid=1'
        });

        expect(result).toContain('/pages/pay/pay?');
        expect(result).toContain('openid=openid-1');
        expect(result).toContain('productId=child-travel-map');
        expect(result).toContain('totalAmount=100');
        expect(result).toContain(
            'returnUrl=https%3A%2F%2Fletmetryai.cn%2Fparent-tools%2Fchild-travel-map%2F%3Fpaid%3D1'
        );
    });

    it('normalizes letmetry h5 return targets for rewardedWebview', () => {
        expect(
            normalizeReturnTarget('https://letmetryai.cn/parent-tools/child-travel-map/?paid=1')
        ).toBe('parent-tools/child-travel-map/?paid=1');
        expect(normalizeReturnTarget('https://example.com/foo')).toBeNull();
    });

    it('detects successful return payload', () => {
        expect(shouldAutoGenerate('?paid=1')).toBe(true);
        expect(shouldAutoGenerate('?paid=0')).toBe(false);
        expect(shouldAutoGenerate('')).toBe(false);
    });
});
