import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { ManifestServiceCF } from '../../../../src/cf/services/manifest';
import { runBuild } from '../../../../src/base/project-builder';
import { initI18n, t } from '../../../../src/i18n';

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    readFileSync: jest.fn()
}));

jest.mock('../../../../src/base/project-builder', () => ({
    runBuild: jest.fn()
}));

const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockRunBuild = runBuild as jest.MockedFunction<typeof runBuild>;

const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
} as unknown as ToolsLogger;

const manifest = {
    'sap.app': {
        dataSources: {
            mainService: { uri: '/sap/opu/odata/sap/Z_SRV', type: 'OData', settings: {} },
            annotation: { uri: '/annotations', type: 'ODataAnnotation', settings: {} }
        }
    }
} as unknown as Manifest;

const manifestWithoutDataSources = {
    'sap.app': {}
} as unknown as Manifest;

describe('ManifestServiceCF', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockRunBuild.mockResolvedValue(undefined);
    });

    describe('init', () => {
        it('should build the project and read manifest from dist folder', async () => {
            mockReadFileSync.mockReturnValue(JSON.stringify(manifest));

            const service = await ManifestServiceCF.init('/project/path', mockLogger);

            expect(mockRunBuild).toHaveBeenCalledWith('/project/path');
            expect(mockReadFileSync).toHaveBeenCalledWith(join('/project/path', 'dist', 'manifest.json'), 'utf-8');
            expect(service.getManifest()).toEqual(manifest);
        });

        it('should propagate errors when build fails', async () => {
            mockRunBuild.mockRejectedValue(new Error('Build failed'));

            await expect(ManifestServiceCF.init('/project/path', mockLogger)).rejects.toThrow('Build failed');
        });

        it('should propagate errors when manifest file is missing', async () => {
            mockReadFileSync.mockImplementation(() => {
                throw new Error('ENOENT: no such file or directory');
            });

            await expect(ManifestServiceCF.init('/project/path', mockLogger)).rejects.toThrow('ENOENT');
        });

        it('should propagate errors when manifest JSON is invalid', async () => {
            mockReadFileSync.mockReturnValue('not valid json');

            await expect(ManifestServiceCF.init('/project/path', mockLogger)).rejects.toThrow();
        });
    });

    describe('getManifest', () => {
        it('should return the manifest read during initialization', async () => {
            mockReadFileSync.mockReturnValue(JSON.stringify(manifest));

            const service = await ManifestServiceCF.init('/project/path', mockLogger);

            expect(service.getManifest()).toEqual(manifest);
        });
    });

    describe('getManifestDataSources', () => {
        it('should return data sources from the manifest', async () => {
            mockReadFileSync.mockReturnValue(JSON.stringify(manifest));

            const service = await ManifestServiceCF.init('/project/path', mockLogger);
            const dataSources = service.getManifestDataSources();

            expect(dataSources).toEqual(manifest['sap.app'].dataSources);
            expect(dataSources['mainService']).toBeDefined();
            expect(dataSources['annotation']).toBeDefined();
        });

        it('should throw when no data sources are found in the manifest', async () => {
            mockReadFileSync.mockReturnValue(JSON.stringify(manifestWithoutDataSources));

            const service = await ManifestServiceCF.init('/project/path', mockLogger);

            expect(() => service.getManifestDataSources()).toThrow('No data sources found in the manifest');
        });
    });

    describe('getDataSourceMetadata', () => {
        it('should throw indicating metadata fetching is not supported for CF', async () => {
            mockReadFileSync.mockReturnValue(JSON.stringify(manifest));

            const service = await ManifestServiceCF.init('/project/path', mockLogger);

            await expect(service.getDataSourceMetadata('mainService')).rejects.toThrow(
                t('error.metadataFetchingNotSupportedForCF')
            );
        });
    });
});
