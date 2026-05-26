import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadHelper() {
    const source = fs.readFileSync(path.join(__dirname, 'image-upload-helper.js'), 'utf8');
    const sandbox = {
        globalThis: {},
        URL,
        URLSearchParams,
        fetch: async () => ({
            blob: async () => new Blob(['x'], { type: 'image/png' })
        }),
        File,
        Blob,
        crypto: {
            randomUUID: () => '123e4567-e89b-12d3-a456-426614174000'
        },
        module: undefined
    };
    sandbox.window = sandbox.globalThis;
    sandbox.window.crypto = sandbox.crypto;
    vm.runInNewContext(source, sandbox);
    return sandbox.globalThis.ChildTravelMapImageUpload;
}

describe('child-travel-map image upload helper', () => {
    const {
        generateUuidFilename,
        extractImageUrlFromResponse
    } = loadHelper();

    it('generates uuid-based png filenames', () => {
        expect(generateUuidFilename('png')).toBe('123e4567-e89b-12d3-a456-426614174000.png');
    });

    it('extracts direct url from upload response', () => {
        expect(extractImageUrlFromResponse({ url: 'https://letmetry.cloud/images/test.png' }))
            .toBe('https://letmetry.cloud/images/test.png');
    });

    it('extracts path-based url from upload response', () => {
        expect(extractImageUrlFromResponse({ path: '/images/test.png' }))
            .toBe('https://letmetry.cloud/images/test.png');
    });
});
