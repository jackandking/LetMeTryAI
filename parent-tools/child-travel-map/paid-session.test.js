import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadPaidSessionHelper() {
    const source = fs.readFileSync(path.join(__dirname, 'paid-session.js'), 'utf8');
    const sandbox = { globalThis: {}, module: undefined };
    sandbox.window = sandbox.globalThis;
    vm.runInNewContext(source, sandbox);
    return sandbox.globalThis.ChildTravelMapPaidSession;
}

describe('child travel map paid session', () => {
    const {
        createPaidSession,
        isPaidSessionActive
    } = loadPaidSessionHelper();

    it('creates a paid session payload', () => {
        const session = createPaidSession({
            orderId: 'order_123',
            paidAt: 1000
        });

        expect(session).toEqual({
            paid: true,
            orderId: 'order_123',
            paidAt: 1000
        });
    });

    it('treats recent paid session as active', () => {
        expect(isPaidSessionActive({
            paid: true,
            orderId: 'order_123',
            paidAt: 1000
        }, 1000 + 5 * 60 * 1000)).toBe(true);
    });

    it('expires old paid sessions', () => {
        expect(isPaidSessionActive({
            paid: true,
            orderId: 'order_123',
            paidAt: 1000
        }, 1000 + 31 * 60 * 1000)).toBe(false);
    });
});
