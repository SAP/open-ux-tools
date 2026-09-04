import { jest } from '@jest/globals';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ApiJson } from '../../../../src/tools/lookup-ui5-documentation/types.js';

// ── Mock node:os homedir so module-level CACHE_DIR points to a temp dir ─────
const MOCK_HOME = mkdtempSync(join(tmpdir(), 'fiori-mcp-test-home-'));
jest.unstable_mockModule('node:os', () => ({
    homedir: () => MOCK_HOME,
    tmpdir: () => tmpdir()
}));

// ── Mock @sap-ux/project-access: keep real module, replace readUi5Yaml ──────
const actualProjectAccess = await import('@sap-ux/project-access');
const mockReadUi5Yaml = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    readUi5Yaml: mockReadUi5Yaml
}));

// ── Import SUT AFTER mocks ───────────────────────────────────────────────────
const { findControl, findUi5Yaml, resolveApiJson, resolveControlChain, resolveLibraryForClass, resolveUi5Config } =
    await import('../../../../src/tools/lookup-ui5-documentation/api-json.js');

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
describe('findUi5Yaml', () => {
    let tmpDir: string;
    beforeEach(() => {
        tmpDir = mkdtempSync(join(tmpdir(), 'fiori-mcp-yaml-'));
    });
    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    test('returns null when no ui5.yaml exists in any ancestor', () => {
        // given: a temp dir with no yaml
        expect(findUi5Yaml(tmpDir)).toBeNull();
    });

    test('finds ui5.yaml in the given directory', () => {
        // given
        writeFileSync(join(tmpDir, 'ui5.yaml'), '');
        // when / then
        expect(findUi5Yaml(tmpDir)).toBe(join(tmpDir, 'ui5.yaml'));
    });

    test('finds ui5.yaml in a parent directory', () => {
        // given: yaml in parent, search from child
        writeFileSync(join(tmpDir, 'ui5.yaml'), '');
        const child = join(tmpDir, 'webapp');
        mkdirSync(child);
        // when / then
        expect(findUi5Yaml(child)).toBe(join(tmpDir, 'ui5.yaml'));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('resolveUi5Config', () => {
    let tmpDir: string;
    beforeEach(() => {
        tmpDir = mkdtempSync(join(tmpdir(), 'fiori-mcp-config-'));
        mockReadUi5Yaml.mockReset();
    });
    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    test('returns null/null when no ui5.yaml found', async () => {
        // given: tmpDir has no ui5.yaml
        const result = await resolveUi5Config(tmpDir);
        // then
        expect(result).toEqual({ url: null, version: null });
        expect(mockReadUi5Yaml).not.toHaveBeenCalled();
    });

    test('extracts url and version from fiori-tools-proxy middleware config', async () => {
        // given
        writeFileSync(join(tmpDir, 'ui5.yaml'), '');
        const mockUi5Config = {
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: { ui5: { url: 'https://my.ui5.com', version: '1.120.0' } }
            }),
            getUi5Framework: jest.fn().mockReturnValue(null)
        };
        mockReadUi5Yaml.mockResolvedValue(mockUi5Config);
        // when
        const result = await resolveUi5Config(tmpDir);
        // then
        expect(result).toEqual({ url: 'https://my.ui5.com', version: '1.120.0' });
    });

    test('falls back to framework version when proxy config has no version', async () => {
        // given: proxy ui5 config has url but no version; framework has version
        writeFileSync(join(tmpDir, 'ui5.yaml'), '');
        const mockUi5Config = {
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: { ui5: { url: 'https://my.ui5.com' } }
            }),
            getUi5Framework: jest.fn().mockReturnValue({ version: '1.118.0' })
        };
        mockReadUi5Yaml.mockResolvedValue(mockUi5Config);
        // when
        const result = await resolveUi5Config(tmpDir);
        // then
        expect(result.url).toBe('https://my.ui5.com');
        expect(result.version).toBe('1.118.0');
    });

    test('returns null/null when readUi5Yaml throws', async () => {
        // given: yaml present but parse fails; no manifest.json either
        writeFileSync(join(tmpDir, 'ui5.yaml'), '');
        mockReadUi5Yaml.mockRejectedValue(new Error('parse error'));
        // when
        const result = await resolveUi5Config(tmpDir);
        // then: both null because yaml threw and no manifest to fall back to
        expect(result).toEqual({ url: null, version: null });
    });
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
