import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { ManifestServiceCF } from '../../../../src/cf/services/manifest';
import { getAppParamsFromUI5Yaml } from '../../../../src/cf/project/yaml';
import { downloadAppContent } from '../../../../src/cf/app/html5-repo';
import { initI18n, t } from '../../../../src/i18n';

jest.mock('../../../../src/cf/project/yaml', () => ({
    getAppParamsFromUI5Yaml: jest.fn()
}));

jest.mock('../../../../src/cf/app/html5-repo', () => ({
    downloadAppContent: jest.fn()
}));

const mockGetAppParams = getAppParamsFromUI5Yaml as jest.MockedFunction<typeof getAppParamsFromUI5Yaml>;
const mockDownloadAppContent = downloadAppContent as jest.MockedFunction<typeof downloadAppContent>;

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

const appParams = {
    appHostId: 'host-123',
    appName: 'my.app',
    appVersion: '1.0.0',
    spaceGuid: 'space-guid-abc'
};

describe('ManifestServiceCF', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAppParams.mockReturnValue(appParams);
    });

    describe('init', () => {
        it('should create an instance and download manifest from HTML5 repository', async () => {
            mockDownloadAppContent.mockResolvedValue({
                entries: [],
                serviceInstanceGuid: 'guid-123',
                manifest
            });

            const service = await ManifestServiceCF.init('/project/path', mockLogger);

            expect(mockGetAppParams).toHaveBeenCalledWith('/project/path');
            expect(mockDownloadAppContent).toHaveBeenCalledWith('space-guid-abc', appParams, mockLogger);
            expect(service.getManifest()).toBe(manifest);
        });

        it('should propagate errors when download fails', async () => {
            mockDownloadAppContent.mockRejectedValue(new Error('Download failed'));

            await expect(ManifestServiceCF.init('/project/path', mockLogger)).rejects.toThrow('Download failed');
        });
    });

    describe('getManifest', () => {
        it('should return the manifest fetched during initialization', async () => {
            mockDownloadAppContent.mockResolvedValue({
                entries: [],
                serviceInstanceGuid: 'guid-123',
                manifest
            });

            const service = await ManifestServiceCF.init('/project/path', mockLogger);

            expect(service.getManifest()).toBe(manifest);
        });
    });

    describe('getManifestDataSources', () => {
        it('should return data sources from the manifest', async () => {
            mockDownloadAppContent.mockResolvedValue({
                entries: [],
                serviceInstanceGuid: 'guid-123',
                manifest
            });

            const service = await ManifestServiceCF.init('/project/path', mockLogger);
            const dataSources = service.getManifestDataSources();

            expect(dataSources).toEqual(manifest['sap.app'].dataSources);
            expect(dataSources['mainService']).toBeDefined();
            expect(dataSources['annotation']).toBeDefined();
        });

        it('should throw when no data sources are found in the manifest', async () => {
            mockDownloadAppContent.mockResolvedValue({
                entries: [],
                serviceInstanceGuid: 'guid-123',
                manifest: manifestWithoutDataSources
            });

            const service = await ManifestServiceCF.init('/project/path', mockLogger);

            expect(() => service.getManifestDataSources()).toThrow('No data sources found in the manifest');
        });
    });

    describe('getDataSourceMetadata', () => {
        it('should throw indicating metadata fetching is not supported for CF', async () => {
            mockDownloadAppContent.mockResolvedValue({
                entries: [],
                serviceInstanceGuid: 'guid-123',
                manifest
            });

            const service = await ManifestServiceCF.init('/project/path', mockLogger);

            await expect(service.getDataSourceMetadata('mainService')).rejects.toThrow(
                t('error.metadataFetchingNotSupportedForCF')
            );
        });
    });
});
