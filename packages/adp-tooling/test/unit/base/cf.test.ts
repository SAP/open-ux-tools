import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { readUi5Yaml } from '@sap-ux/project-access';

import { isCFEnvironment } from '../../../src/base/cf';

jest.mock('fs', () => {
    return {
        ...jest.requireActual('fs'),
        existsSync: jest.fn(),
        readFileSync: jest.fn()
    };
});

jest.mock('@sap-ux/project-access');

const existsSyncMock = existsSync as jest.Mock;
const readFileSyncMock = readFileSync as jest.Mock;
const readUi5YamlMock = readUi5Yaml as jest.MockedFunction<typeof readUi5Yaml>;

describe('isCFEnvironment', () => {
    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return true when config.json exists and environment is CF', async () => {
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockReturnValue('{ "environment": "CF" }');

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(true);
        expect(existsSyncMock).toHaveBeenCalledWith(join(basePath, '.adp', 'config.json'));
        expect(readFileSyncMock).toHaveBeenCalledWith(join(basePath, '.adp', 'config.json'), 'utf-8');
    });

    test('should return false when config.json exists but environment is not CF', async () => {
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockReturnValue('{ "environment": "TST" }');

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(false);
    });

    test('should return true when config.json does not exist but ui5.yaml has fiori-tools-preview with cfBuildPath dist', async () => {
        existsSyncMock.mockReturnValue(false);
        readUi5YamlMock.mockResolvedValue({
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
        expect(readUi5YamlMock).toHaveBeenCalledWith(basePath, 'ui5.yaml');
    });

    test('should return true when config.json does not exist but ui5.yaml has preview-middleware with cfBuildPath dist', async () => {
        existsSyncMock.mockReturnValue(false);
        readUi5YamlMock.mockResolvedValue({
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
        existsSyncMock.mockReturnValue(false);
        readUi5YamlMock.mockResolvedValue({
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
        existsSyncMock.mockReturnValue(false);
        readUi5YamlMock.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: {}
            })
        } as any);

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(false);
    });

    test('should return false when config.json does not exist and ui5.yaml has no custom middleware', async () => {
        existsSyncMock.mockReturnValue(false);
        readUi5YamlMock.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue(undefined)
        } as any);

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(false);
    });

    test('should return false when config.json does not exist and readUi5Yaml throws error', async () => {
        existsSyncMock.mockReturnValue(false);
        readUi5YamlMock.mockRejectedValue(new Error('Failed to read ui5.yaml'));

        const result = await isCFEnvironment(basePath);

        expect(result).toBe(false);
    });
});
