import { jest } from '@jest/globals';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ApiJson } from '../../../../src/tools/lookup-ui5-documentation/types.js';

// ── Mock node:os homedir so the transitive CACHE_DIR (api-json-cache) points to a temp dir ──
const MOCK_HOME = mkdtempSync(join(tmpdir(), 'fiori-mcp-test-home-'));
jest.unstable_mockModule('node:os', () => ({
    homedir: () => MOCK_HOME,
    tmpdir: () => tmpdir()
}));

// ── Import SUT AFTER mocks ───────────────────────────────────────────────────
const { findControl, resolveControlChain, resolveLibraryForClass } = await import(
    '../../../../src/tools/lookup-ui5-documentation/api-json.js'
);

afterAll(() => {
    rmSync(MOCK_HOME, { recursive: true, force: true });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeApiJson(symbols: ApiJson['symbols']): ApiJson {
    return { symbols };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('findControl', () => {
    test('returns null when symbols is not an array', () => {
        expect(findControl({}, 'sap.m.Table')).toBeNull();
    });

    test('returns null when control not found', () => {
        expect(findControl(makeApiJson([{ name: 'sap.m.Button' }]), 'sap.m.Table')).toBeNull();
    });

    test('returns the matching symbol', () => {
        const sym = { name: 'sap.m.Table' };
        expect(findControl(makeApiJson([sym]), 'sap.m.Table')).toBe(sym);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('resolveLibraryForClass', () => {
    let fetchMock: jest.Mock;

    beforeEach(() => {
        fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    test('finds a class via its first candidate library', async () => {
        // given: unique base+version+fqName key to avoid classLibraryCache collisions
        const base = 'https://lib-a.example.com';
        const version = '1.110.0';
        const fqName = 'sap.lib.a.Widget';
        const data: ApiJson = { symbols: [{ name: fqName }] };
        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => data });
        // when
        const result = await resolveLibraryForClass(fqName, base, version);
        // then
        expect(result).not.toBeNull();
        expect(result!.data).toEqual(data);
    });

    test('returns null when no candidate library contains the class', async () => {
        // given
        const base = 'https://lib-b.example.com';
        const version = '1.111.0';
        const fqName = 'sap.lib.b.missing.Ghost';
        fetchMock.mockResolvedValue({ ok: false, status: 404 });
        // when
        const result = await resolveLibraryForClass(fqName, base, version);
        // then
        expect(result).toBeNull();
    });

    test('memoizes: second call with same key skips the network', async () => {
        // given
        const base = 'https://lib-c.example.com';
        const version = '1.112.0';
        const fqName = 'sap.lib.c.memo.Ctrl';
        const data: ApiJson = { symbols: [{ name: fqName }] };
        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => data });
        const first = await resolveLibraryForClass(fqName, base, version);
        fetchMock.mockReset();
        // when
        const second = await resolveLibraryForClass(fqName, base, version);
        // then
        expect(second).toBe(first);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('does not cache a miss: a later call retries and can succeed', async () => {
        // given: a unique key so neither the in-memory memo nor the disk cache is warm, and every
        // candidate library 404s → the first call is a miss
        const base = 'https://lib-d.example.com';
        const version = '1.113.0';
        const fqName = 'sap.lib.d.transient.Ctrl';
        fetchMock.mockResolvedValue({ ok: false, status: 404 });
        // when
        const miss = await resolveLibraryForClass(fqName, base, version);
        // then
        expect(miss).toBeNull();

        // given: the CDN recovers
        fetchMock.mockReset();
        const data: ApiJson = { symbols: [{ name: fqName }] };
        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => data });
        // when: the same key is resolved again
        const recovered = await resolveLibraryForClass(fqName, base, version);
        // then: the miss was not memoized, so the network is retried and the class resolves
        expect(recovered).not.toBeNull();
        expect(recovered!.data).toEqual(data);
        expect(fetchMock).toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('resolveControlChain', () => {
    let fetchMock: jest.Mock;

    beforeEach(() => {
        fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    test('returns a single-symbol chain when extends is absent', async () => {
        // given
        const sym = { name: 'sap.m.Button' };
        const apiJson: ApiJson = { symbols: [sym] };
        // when
        const chain = await resolveControlChain(sym, apiJson, null, null);
        // then
        expect(chain).toEqual([sym]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('follows extends within the same api.json', async () => {
        // given
        const child = { name: 'sap.m.chain.Table', extends: 'sap.m.chain.ListBase' };
        const parent = { name: 'sap.m.chain.ListBase' };
        const apiJson: ApiJson = { symbols: [child, parent] };
        // when
        const chain = await resolveControlChain(child, apiJson, null, null);
        // then
        expect(chain).toEqual([child, parent]);
    });

    test('returns partial chain when a parent cannot be resolved', async () => {
        // given: parent not in apiJson and fetch fails
        const child = { name: 'sap.m.chain.Child', extends: 'some.unknown.Parent' };
        const apiJson: ApiJson = { symbols: [child] };
        fetchMock.mockResolvedValue({ ok: false, status: 404 });
        // when
        const chain = await resolveControlChain(child, apiJson, null, null);
        // then: stops at child
        expect(chain).toEqual([child]);
    });

    test('stops on a cycle to prevent an infinite loop', async () => {
        // given: A extends B, B extends A
        const a = { name: 'sap.m.chain.A', extends: 'sap.m.chain.B' };
        const b = { name: 'sap.m.chain.B', extends: 'sap.m.chain.A' };
        const apiJson: ApiJson = { symbols: [a, b] };
        // when
        const chain = await resolveControlChain(a, apiJson, null, null);
        // then: [a, b] and stops (not infinite)
        expect(chain).toEqual([a, b]);
    });
});
