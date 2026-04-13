import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

// MOCKS - use jest.unstable_mockModule for ESM compatibility
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
jest.unstable_mockModule('node:fs', () => ({
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
    default: {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
        writeFileSync: jest.fn(),
        mkdirSync: jest.fn(),
        readdirSync: jest.fn(),
        statSync: jest.fn()
    }
}));

const mockReadUi5Yaml = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    readUi5Yaml: mockReadUi5Yaml,
    DirName: { Changes: 'changes', Webapp: 'webapp' },
    getWebappPath: jest.fn(),
    FileName: { ManifestAppDescrVar: 'manifest.appdescr_variant', Ui5Yaml: 'ui5.yaml' },
    filterDataSourcesByType: jest.fn()
}));

const { isCFEnvironment } = await import('../../../src/base/cf');

describe('isCFEnvironment', () => {
    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return true when config.json exists and environment is CF', async () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('{ "environment": "CF" }');

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(true);
        expect(mockExistsSync).toHaveBeenCalledWith(join(basePath, '.adp', 'config.json'));
        expect(mockReadFileSync).toHaveBeenCalledWith(join(basePath, '.adp', 'config.json'), 'utf-8');
    });

    test('should return false when config.json exists but environment is not CF', async () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('{ "environment": "TST" }');

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(false);
    });

    test('should return true when config.json does not exist but ui5.yaml has fiori-tools-preview with cfBuildPath dist', async () => {
        mockExistsSync.mockReturnValue(false);
        mockReadUi5Yaml.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValueOnce({
                configuration: {
                    adp: {
                        cfBuildPath: 'dist'
                    }
                }
            })
        } as any);

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(true);
        expect(mockReadUi5Yaml).toHaveBeenCalledWith(basePath, 'ui5.yaml');
    });

    test('should return true when config.json does not exist but ui5.yaml has preview-middleware with cfBuildPath dist', async () => {
        mockExistsSync.mockReturnValue(false);
        mockReadUi5Yaml.mockResolvedValue({
            findCustomMiddleware: jest
                .fn()
                .mockReturnValueOnce(undefined)
                .mockReturnValueOnce({
                    configuration: {
                        adp: {
                            cfBuildPath: 'dist'
                        }
                    }
                })
        } as any);

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(true);
    });

    test('should return false when config.json does not exist and ui5.yaml has cfBuildPath but not dist', async () => {
        mockExistsSync.mockReturnValue(false);
        mockReadUi5Yaml.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValueOnce({
                configuration: {
                    adp: {
                        cfBuildPath: 'other-path'
                    }
                }
            })
        } as any);

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(false);
    });

    test('should return false when config.json does not exist and ui5.yaml has no adp configuration', async () => {
        mockExistsSync.mockReturnValue(false);
        mockReadUi5Yaml.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: {}
            })
        } as any);

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(false);
    });

    test('should return false when config.json does not exist and ui5.yaml has no custom middleware', async () => {
        mockExistsSync.mockReturnValue(false);
        mockReadUi5Yaml.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue(undefined)
        } as any);

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(false);
    });

    test('should return false when config.json does not exist and readUi5Yaml throws error', async () => {
        mockExistsSync.mockReturnValue(false);
        mockReadUi5Yaml.mockRejectedValue(new Error('Failed to read ui5.yaml'));

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(false);
    });
});
