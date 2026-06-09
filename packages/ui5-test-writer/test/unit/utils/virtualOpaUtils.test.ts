import { jest } from '@jest/globals';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type * as VirtualOpaUtils from '../../../src/utils/virtualOpaUtils.js';
import type * as ProjectAccess from '@sap-ux/project-access';

const actualProjectAccess = await import('@sap-ux/project-access');
const getAllUi5YamlFileNamesMock = jest.fn<typeof ProjectAccess.getAllUi5YamlFileNames>();
const readUi5YamlMock = jest.fn<typeof ProjectAccess.readUi5Yaml>();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    getAllUi5YamlFileNames: getAllUi5YamlFileNamesMock,
    readUi5Yaml: readUi5YamlMock
}));

const { hasVirtualOPA5 } = await import('../../../src/utils/virtualOpaUtils.js');

describe('hasVirtualOPA5()', () => {
    const basePath = join('/', 'project');

    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('returns true when a yaml file has a fiori-tools-preview middleware with OPA5 framework', async () => {
        getAllUi5YamlFileNamesMock.mockResolvedValue(['ui5.yaml']);
        readUi5YamlMock.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: { test: [{ framework: 'OPA5', path: '/test/opaTests.qunit.html' }] }
            })
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(true);
    });

    test('returns false when no yaml file has OPA5 configured', async () => {
        getAllUi5YamlFileNamesMock.mockResolvedValue(['ui5.yaml']);
        readUi5YamlMock.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: { test: [{ framework: 'KARMA', path: '/test/karma.html' }] }
            })
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(false);
    });

    test('returns false when fiori-tools-preview middleware has no test array', async () => {
        getAllUi5YamlFileNamesMock.mockResolvedValue(['ui5.yaml']);
        readUi5YamlMock.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({ configuration: {} })
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(false);
    });

    test('returns false when fiori-tools-preview middleware is not present', async () => {
        getAllUi5YamlFileNamesMock.mockResolvedValue(['ui5.yaml']);
        readUi5YamlMock.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue(undefined)
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(false);
    });

    test('returns false when no yaml files are found', async () => {
        getAllUi5YamlFileNamesMock.mockResolvedValue([]);

        expect(await hasVirtualOPA5(basePath)).toBe(false);
    });

    test('skips yaml files that throw and continues checking remaining files', async () => {
        getAllUi5YamlFileNamesMock.mockResolvedValue(['ui5-bad.yaml', 'ui5.yaml']);
        readUi5YamlMock.mockRejectedValueOnce(new Error('Cannot parse')).mockResolvedValueOnce({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: { test: [{ framework: 'OPA5' }] }
            })
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(true);
    });

    test('returns true when OPA5 is in a test array alongside other frameworks', async () => {
        getAllUi5YamlFileNamesMock.mockResolvedValue(['ui5.yaml']);
        readUi5YamlMock.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: {
                    test: [{ framework: 'KARMA' }, { framework: 'OPA5' }, { framework: 'QUnit' }]
                }
            })
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(true);
    });

    test('returns true on the first yaml that has OPA5 without reading further files', async () => {
        getAllUi5YamlFileNamesMock.mockResolvedValue(['ui5.yaml', 'ui5-mock.yaml']);
        readUi5YamlMock.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: { test: [{ framework: 'OPA5' }] }
            })
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(true);
        expect(readUi5YamlMock).toHaveBeenCalledTimes(1);
    });
});

describe('addVirtualTestConfig', () => {
    const previewYaml = `specVersion: '4.0'
server:
  customMiddleware:
    - name: fiori-tools-preview
      afterMiddleware: fiori-tools-appreload
      configuration:
        flp:
          theme: sap_fiori_3
`;
    const mockYaml = `specVersion: '4.0'
server:
  customMiddleware:
    - name: fiori-tools-preview
      afterMiddleware: fiori-tools-appreload
      configuration:
        flp:
          theme: sap_fiori_3
    - name: sap-fe-mockserver
      beforeMiddleware: csp
      configuration:
        mountPath: /
`;
    const noPreviewYaml = `specVersion: '4.0'
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        ignoreCertErrors: false
`;
    let addVirtualTestConfigReal: typeof VirtualOpaUtils.addVirtualTestConfig;

    beforeAll(async () => {
        // These tests need the real @sap-ux/project-access for the yaml round-trip.
        jest.unstable_unmockModule('@sap-ux/project-access');
        jest.resetModules();
        ({ addVirtualTestConfig: addVirtualTestConfigReal } = await import('../../../src/utils/virtualOpaUtils.js'));
    });

    it('adds test entries to ui5-mock.yaml', async () => {
        const fs = create(createStorage());
        const basePath = '/test/project';
        fs.write(join(basePath, 'ui5.yaml'), previewYaml);
        fs.write(join(basePath, 'ui5-local.yaml'), previewYaml);
        fs.write(join(basePath, 'ui5-mock.yaml'), mockYaml);

        const testFrameworks = [{ framework: 'OPA5' as const, path: '/test/integration/opaTests.qunit.html' }];
        await addVirtualTestConfigReal(basePath, testFrameworks, fs);

        expect(fs.read(join(basePath, 'ui5-mock.yaml'))).toContain('framework: OPA5');
    });

    it('skips when ui5-mock.yaml does not exist', async () => {
        const fs = create(createStorage());
        const basePath = '/test/project-no-mock';
        fs.write(join(basePath, 'ui5.yaml'), previewYaml);
        fs.write(join(basePath, 'ui5-local.yaml'), previewYaml);

        await expect(addVirtualTestConfigReal(basePath, [{ framework: 'OPA5' }], fs)).resolves.not.toThrow();
        expect(fs.exists(join(basePath, 'ui5-mock.yaml'))).toBe(false);
    });

    it('skips middleware update when fiori-tools-preview is not present', async () => {
        const fs = create(createStorage());
        const basePath = '/test/project-no-preview';
        fs.write(join(basePath, 'ui5.yaml'), noPreviewYaml);
        fs.write(join(basePath, 'ui5-local.yaml'), noPreviewYaml);
        fs.write(join(basePath, 'ui5-mock.yaml'), noPreviewYaml);

        await addVirtualTestConfigReal(basePath, [{ framework: 'OPA5' }], fs);
        expect(fs.read(join(basePath, 'ui5-mock.yaml'))).not.toContain('framework: OPA5');
    });
});
