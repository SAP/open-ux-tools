import { jest } from '@jest/globals';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ── Mock @sap-ux/project-access: keep real module, replace readUi5Yaml ──────
const actualProjectAccess = await import('@sap-ux/project-access');
const mockReadUi5Yaml = jest.fn<any>();
const mockGetWebappPath = jest.fn<any>();
const mockGetMinimumUI5Version = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    readUi5Yaml: mockReadUi5Yaml,
    getWebappPath: mockGetWebappPath,
    getMinimumUI5Version: mockGetMinimumUI5Version
}));

// ── Import SUT AFTER mocks ───────────────────────────────────────────────────
const { findUi5Yaml, resolveUi5Config } =
    await import('../../../../src/tools/lookup-ui5-documentation/ui5-config-resolver.js');

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
        mockGetWebappPath.mockRejectedValue(new Error('no webapp'));
        // when
        const result = await resolveUi5Config(tmpDir);
        // then: both null because yaml threw and no manifest to fall back to
        expect(result).toEqual({ url: null, version: null });
    });

    test('falls back to manifest minUI5Version when yaml provides no version', async () => {
        // given: yaml present, proxy config has url but no version; no framework version either
        writeFileSync(join(tmpDir, 'ui5.yaml'), '');
        const mockUi5Config = {
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: { ui5: { url: 'https://my.ui5.com' } }
            }),
            getUi5Framework: jest.fn().mockReturnValue(null)
        };
        mockReadUi5Yaml.mockResolvedValue(mockUi5Config);
        // manifest.json version fallback
        const webappPath = join(tmpDir, 'webapp');
        mkdirSync(webappPath, { recursive: true });
        writeFileSync(
            join(webappPath, 'manifest.json'),
            JSON.stringify({ 'sap.ui5': { dependencies: { minUI5Version: '1.115.0' } } })
        );
        mockGetWebappPath.mockResolvedValue(webappPath);
        mockGetMinimumUI5Version.mockReturnValue('1.115.0');
        // when
        const result = await resolveUi5Config(tmpDir);
        // then: version comes from manifest fallback
        expect(result.url).toBe('https://my.ui5.com');
        expect(result.version).toBe('1.115.0');
    });

    test('returns null version when manifest read throws', async () => {
        // given: yaml present, proxy config has no version; getWebappPath throws
        writeFileSync(join(tmpDir, 'ui5.yaml'), '');
        const mockUi5Config = {
            findCustomMiddleware: jest.fn().mockReturnValue(null),
            getUi5Framework: jest.fn().mockReturnValue(null)
        };
        mockReadUi5Yaml.mockResolvedValue(mockUi5Config);
        mockGetWebappPath.mockRejectedValue(new Error('no webapp'));
        // when
        const result = await resolveUi5Config(tmpDir);
        // then: version stays null (manifest fallback swallows the error)
        expect(result.version).toBeNull();
    });
});
