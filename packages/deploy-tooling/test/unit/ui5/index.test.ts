import { jest } from '@jest/globals';
import { LogLevel } from '@sap-ux/logger';
import type { AbapDeployConfig } from '../../../src/types/index.js';
import { mockedUi5RepoService } from '../../__mocks__/index.js';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const __testdirname = dirname(fileURLToPath(import.meta.url));

const mockDotenvConfig = jest.fn() as jest.Mock;

jest.unstable_mockModule('dotenv', () => ({
    config: mockDotenvConfig
}));

// Mockable readFile for node:fs/promises
const mockReadFile = jest.fn() as jest.Mock;
const realFsPromises = await import('node:fs/promises');
jest.unstable_mockModule('node:fs/promises', () => ({
    ...realFsPromises,
    readFile: mockReadFile
}));

// Mockable UI5Config for @sap-ux/ui5-config
const mockGetBuilderResourceExcludes = jest.fn().mockReturnValue([]) as jest.Mock;
const mockUi5ConfigNewInstance = jest.fn().mockResolvedValue({
    getBuilderResourceExcludes: mockGetBuilderResourceExcludes
}) as jest.Mock;
jest.unstable_mockModule('@sap-ux/ui5-config', () => ({
    UI5Config: { newInstance: mockUi5ConfigNewInstance },
    replaceEnvVariables: jest.fn()
}));

const mockCreateUi5Archive = jest.fn().mockResolvedValue(Buffer.from('')) as jest.Mock;
jest.unstable_mockModule('../../../src/ui5/archive.js', () => ({
    createUi5Archive: mockCreateUi5Archive
}));

const ui5TaskModule = await import('../../../src/ui5/index.js');
const ui5Task = ui5TaskModule.default;
const { task } = await import('../../../src/index.js');

describe('ui5', () => {
    const configuration: AbapDeployConfig = {
        app: {
            name: '~name',
            description: '~description',
            package: '~package',
            transport: '~transport'
        },
        target: {
            url: 'http://target.example',
            client: '001'
        },
        log: LogLevel.Debug
    };
    const projectName = '~test';
    const workspace = {
        byGlob: jest.fn().mockReturnValue(
            readdirSync(join(__testdirname, '../../fixtures/simple-app/webapp')).map((file) => ({
                getPath: () => `/resources/${projectName}/${file}`,
                getBuffer: () => Promise.resolve(Buffer.from(''))
            }))
        )
    };
    const options = { projectName, configuration };

    beforeEach(() => {
        // By default, readFile rejects so builder excludes fall back to []
        mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));
        mockGetBuilderResourceExcludes.mockReturnValue([]);
        mockUi5ConfigNewInstance.mockResolvedValue({
            getBuilderResourceExcludes: mockGetBuilderResourceExcludes
        });
        mockCreateUi5Archive.mockResolvedValue(Buffer.from(''));
    });

    test('no errors', async () => {
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);
        await task({ workspace, options } as any);
        expect(mockDotenvConfig).toHaveBeenCalledTimes(1);
    });

    test('verify correct export', () => {
        expect(ui5Task).toBe(task);
    });

    test('lowercase package in configuration is normalized to uppercase', async () => {
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);
        const configWithLowercase: AbapDeployConfig = {
            ...configuration,
            app: { ...configuration.app, package: '$tmp' }
        };
        await task({ workspace, options: { projectName, configuration: configWithLowercase } } as any);
        expect(configWithLowercase.app.package).toBe('$TMP');
    });

    test('string log level "verbose" in configuration does not throw', async () => {
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);
        const configWithStringLog = { ...configuration, log: 'verbose' as unknown as LogLevel };
        await expect(
            task({ workspace, options: { projectName, configuration: configWithStringLog } } as any)
        ).resolves.not.toThrow();
    });

    test('string log level "debug" in configuration does not throw', async () => {
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);
        const configWithStringLog = { ...configuration, log: 'debug' as unknown as LogLevel };
        await expect(
            task({ workspace, options: { projectName, configuration: configWithStringLog } } as any)
        ).resolves.not.toThrow();
    });

    test('unrecognised string log level falls back to Info without throwing', async () => {
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);
        const configWithStringLog = { ...configuration, log: 'unknown' as unknown as LogLevel };
        await expect(
            task({ workspace, options: { projectName, configuration: configWithStringLog } } as any)
        ).resolves.not.toThrow();
    });

    describe('exclude handling', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            // Reset workspace mock after clearAllMocks
            (workspace.byGlob as jest.Mock).mockReturnValue(
                readdirSync(join(__testdirname, '../../fixtures/simple-app/webapp')).map((file) => ({
                    getPath: () => `/resources/${projectName}/${file}`,
                    getBuffer: () => Promise.resolve(Buffer.from(''))
                }))
            );
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            mockCreateUi5Archive.mockResolvedValue(Buffer.from(''));
        });

        test('reads builder.resources.excludes from ui5-deploy.yaml when configuration.exclude is absent', async () => {
            // Setup: yaml file exists with builder excludes
            mockReadFile.mockResolvedValue(
                'builder:\n  resources:\n    excludes:\n      - /test/**\n      - /localService/**\n'
            );
            mockGetBuilderResourceExcludes.mockReturnValue(['/test/**', '/localService/**']);
            mockUi5ConfigNewInstance.mockResolvedValue({
                getBuilderResourceExcludes: mockGetBuilderResourceExcludes
            });

            const configWithoutExclude: AbapDeployConfig = { ...configuration };
            delete (configWithoutExclude as any).exclude;

            await expect(
                task({ workspace, options: { projectName, configuration: configWithoutExclude } } as any)
            ).resolves.not.toThrow();

            // Implementation must call UI5Config.newInstance to parse the yaml
            expect(mockUi5ConfigNewInstance).toHaveBeenCalled();
            // Builder excludes (glob-stripped) must reach createUi5Archive as 4th argument
            expect(mockCreateUi5Archive).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.arrayContaining(['/test/', '/localService/'])
            );
        });

        test('falls back gracefully when ui5-deploy.yaml cannot be read', async () => {
            // readFile throws (file not found) — should fall back to empty builder excludes
            mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));

            const configWithExclude: AbapDeployConfig = { ...configuration, exclude: ['/test/', '/localService/'] };
            await expect(
                task({ workspace, options: { projectName, configuration: configWithExclude } } as any)
            ).resolves.not.toThrow();

            // config.exclude alone must reach createUi5Archive when yaml is unreadable
            expect(mockCreateUi5Archive).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), [
                '/test/',
                '/localService/'
            ]);
        });

        test('merges configuration.exclude with builder.resources.excludes when both present', async () => {
            // Setup: yaml has /localService/** but config already has /test/
            mockReadFile.mockResolvedValue('builder:\n  resources:\n    excludes:\n      - /localService/**\n');
            mockGetBuilderResourceExcludes.mockReturnValue(['/localService/**']);
            mockUi5ConfigNewInstance.mockResolvedValue({
                getBuilderResourceExcludes: mockGetBuilderResourceExcludes
            });

            const configWithExclude: AbapDeployConfig = { ...configuration, exclude: ['/test/'] };
            await expect(
                task({ workspace, options: { projectName, configuration: configWithExclude } } as any)
            ).resolves.not.toThrow();

            // Implementation must call UI5Config.newInstance to parse the yaml
            expect(mockUi5ConfigNewInstance).toHaveBeenCalled();
            // Merged array must contain both sources
            expect(mockCreateUi5Archive).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.arrayContaining(['/test/', '/localService/'])
            );
        });

        test('deduplicates overlapping entries from both sources', async () => {
            // Same pattern appears in both config.exclude and builder excludes (after globToPrefix)
            mockReadFile.mockResolvedValue('builder:\n  resources:\n    excludes:\n      - /test/**\n');
            mockGetBuilderResourceExcludes.mockReturnValue(['/test/**']);
            mockUi5ConfigNewInstance.mockResolvedValue({
                getBuilderResourceExcludes: mockGetBuilderResourceExcludes
            });

            // config.exclude uses the already-stripped prefix form
            const configWithExclude: AbapDeployConfig = { ...configuration, exclude: ['/test/'] };
            await expect(
                task({ workspace, options: { projectName, configuration: configWithExclude } } as any)
            ).resolves.not.toThrow();

            // Dedup: /test/ appears once only
            expect(mockCreateUi5Archive).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), [
                '/test/'
            ]);
        });
    });
});
