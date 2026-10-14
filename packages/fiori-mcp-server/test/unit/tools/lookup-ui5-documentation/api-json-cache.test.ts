import { jest } from '@jest/globals';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ApiJson } from '../../../../src/tools/lookup-ui5-documentation/types.js';

// ── Mock node:os homedir so module-level CACHE_DIR points to a temp dir ─────
const MOCK_HOME = mkdtempSync(join(tmpdir(), 'fiori-mcp-test-home-'));
jest.unstable_mockModule('node:os', () => ({
    homedir: () => MOCK_HOME,
    tmpdir: () => tmpdir()
}));

// ── Import SUT AFTER mocks ───────────────────────────────────────────────────
const { resolveApiJson } = await import('../../../../src/tools/lookup-ui5-documentation/api-json-cache.js');

afterAll(() => {
    rmSync(MOCK_HOME, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('resolveApiJson', () => {
    const LIB = 'sap.m';
    let fetchMock: jest.Mock;

    beforeEach(() => {
        fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    test('returns result on successful fetch from configured base+version', async () => {
        // given: unique base to avoid cache collision
        const base = 'https://resolve-a.example.com';
        const version = '1.100.0';
        const data: ApiJson = { symbols: [{ name: 'sap.m.Button' }] };
        const expectedUrl = `${base}/${version}/test-resources/sap/m/designtime/api.json`;
        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => data });
        // when
        const result = await resolveApiJson(base, version, LIB);
        // then
        expect(result).not.toBeNull();
        expect(result!.data).toEqual(data);
        expect(result!.base).toBe(base);
        expect(result!.version).toBe(version);
        expect(result!.source).toBe('network');
        expect(fetchMock).toHaveBeenCalledWith(expectedUrl);
    });

    test('returns cached result on second call without hitting the network', async () => {
        // given: unique base so first call populates cache, second hits it
        const base = 'https://resolve-b.example.com';
        const version = '1.101.0';
        const data: ApiJson = { symbols: [] };
        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => data });
        await resolveApiJson(base, version, LIB); // primes the disk cache
        fetchMock.mockReset();
        // when
        const result = await resolveApiJson(base, version, LIB);
        // then
        expect(result!.source).toBe('cache');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('falls through to public fallback when configured base returns 404', async () => {
        // given: 3 attempts fail before fallback base+version succeeds
        const configured = 'https://resolve-c.example.com';
        const version = '1.102.0';
        const data: ApiJson = { symbols: [] };
        fetchMock
            .mockResolvedValueOnce({ ok: false, status: 404 }) // configured + version
            .mockResolvedValueOnce({ ok: false, status: 404 }) // configured + null
            .mockResolvedValueOnce({ ok: true, json: async () => data }); // fallback + version
        // when
        const result = await resolveApiJson(configured, version, LIB);
        // then
        expect(result!.base).toBe('https://ui5.sap.com');
        expect(result!.version).toBe(version);
    });

    test('returns null when all fetch attempts fail', async () => {
        // given
        const base = 'https://resolve-d.example.com';
        fetchMock.mockResolvedValue({ ok: false, status: 404 });
        // when
        const result = await resolveApiJson(base, '1.103.0', LIB);
        // then
        expect(result).toBeNull();
    });

    test('deduplicates attempts when configuredBase equals the public fallback', async () => {
        // given: configuredBase IS the fallback — (fallback+version) and (fallback+null) only
        const base = 'https://ui5.sap.com';
        const data: ApiJson = { symbols: [] };
        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => data });
        // when
        await resolveApiJson(base, '1.104.0', LIB);
        // then: dedupe means at most 2 distinct fetch calls, not 3+
        expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2);
    });
});
