import type * as fs from 'node:fs';
import { createRequire } from 'node:module';
import { jest } from '@jest/globals';

// The real module, loaded through CommonJS so the mock below does not resolve to itself.
const actual = createRequire(import.meta.url)('node:fs') as typeof fs;
const readFileSync = jest.fn<(path: string) => void>();
jest.unstable_mockModule('node:fs', () => {
    return {
        ...actual,
        default: actual,
        readFileSync: (...args: Parameters<typeof actual.readFileSync>) => {
            readFileSync(String(args[0]));
            return actual.readFileSync(...args);
        }
    };
});

describe('package import', () => {
    it('reads no resource file until a session or a generation needs one', async () => {
        // Given a fresh module registry
        // When the public API is imported
        await import('../../src/public.js');
        // Then no resource file has been read, so a bundled host can still pass its resource root
        expect(readFileSync.mock.calls.filter(([path]) => path.includes('resources'))).toEqual([]);
        // And the first use of the value banks reads them
        const { packagedBanks } = await import('../../src/semantics/bank-store.js');
        expect(packagedBanks().measurementDimensions.length).toBeGreaterThan(0);
        expect(readFileSync.mock.calls.some(([path]) => path.endsWith('value-banks.v2.json'))).toBe(true);
    });
});
