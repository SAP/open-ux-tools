import { jest } from '@jest/globals';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import { PromptState } from '../src/prompts/prompt-state.js';
import { AppDownloadType, type AppInfo } from '../src/app/types.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Editor } from 'mem-fs-editor';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockResolveTransportRequest = jest.fn();

jest.unstable_mockModule('../src/utils/logger', () => {
    const mock = {
        logger: {
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        },
        configureLogging: jest.fn()
    };
    return { default: mock, ...mock };
});

jest.unstable_mockModule('../src/utils/download-utils', () => ({
    resolveTransportRequest: mockResolveTransportRequest
}));

const { getAbapRepoAppConfig, getAbapRepoDeployConfig } = await import('../src/app/app-config-abap-repo.js');
const RepoAppDownloadLogger = (await import('../src/utils/logger.js')).default;
const { resolveTransportRequest } = await import('../src/utils/download-utils.js');

const fixtureWebappPath = join(__dirname, 'fixtures', 'abap-repository-app', 'webapp');

const mockAppInfo: AppInfo = {
    appId: 'abapRepositoryTestApp',
    title: 'ABAP Repo App',
    description: 'Test ABAP Repository App',
    repoName: 'ABAP_REPO_NAME',
    url: 'https://test-system.example.com'
};

describe('getAbapRepoAppConfig', () => {
    let mockFs: jest.Mocked<Pick<Editor, 'readJSON' | 'exists'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        PromptState.systemSelection = {
            connectedSystem: {
                backendSystem: {
                    url: 'https://test-system.example.com',
                    systemType: 'ABAP',
                    connectionType: 'Direct'
                } as any,
                serviceProvider: {} as any
            }
        } as any;
        mockFs = {
            readJSON: jest.fn(),
            exists: jest.fn().mockReturnValue(true)
        };
    });

    it('should build config from manifest when manifest has all fields', () => {
        mockFs.readJSON.mockReturnValue({
            'sap.app': {
                id: 'abapRepositoryTestApp',
                title: 'App From Manifest',
                dataSources: {
                    mainService: {
                        settings: { odataVersion: '4.01' }
                    }
                }
            },
            'sap.ui5': {
                dependencies: { minUI5Version: '1.145.2' }
            }
        } as any);

        const result = getAbapRepoAppConfig(fixtureWebappPath, mockAppInfo, mockFs as unknown as Editor);

        expect(result).toEqual({
            app: {
                id: 'abapRepositoryTestApp',
                title: 'App From Manifest',
                flpAppId: 'abapRepositoryTestApp-tile'
            },
            service: {
                url: 'https://test-system.example.com',
                version: OdataVersion.v4
            },
            ui5: {
                version: '1.145.2'
            }
        });
    });

    it('should fall back to appInfo values when manifest fields are missing', () => {
        mockFs.readJSON.mockReturnValue({
            'sap.app': {
                dataSources: {
                    mainService: {
                        settings: { odataVersion: '2.0' }
                    }
                }
            },
            'sap.ui5': {}
        } as any);

        const result = getAbapRepoAppConfig(fixtureWebappPath, mockAppInfo, mockFs as unknown as Editor);

        expect(result.app.id).toBe(mockAppInfo.appId);
        expect(result.app.title).toBe(mockAppInfo.title);
        expect(result.service.version).toBe(OdataVersion.v2);
        expect(result.ui5.version).toBe('');
    });

    it('should use OdataVersion.v2 when odataVersion does not start with "4"', () => {
        mockFs.readJSON.mockReturnValue({
            'sap.app': {
                id: 'testApp',
                dataSources: {
                    mainService: {
                        settings: { odataVersion: '2.0' }
                    }
                }
            }
        } as any);

        const result = getAbapRepoAppConfig(fixtureWebappPath, mockAppInfo, mockFs as unknown as Editor);

        expect(result.service.version).toBe(OdataVersion.v2);
    });

    it('should handle array minUI5Version by taking the first element', () => {
        mockFs.readJSON.mockReturnValue({
            'sap.app': { id: 'testApp' },
            'sap.ui5': {
                dependencies: { minUI5Version: ['1.120.0', '1.110.0'] }
            }
        } as any);

        const result = getAbapRepoAppConfig(fixtureWebappPath, mockAppInfo, mockFs as unknown as Editor);

        expect(result.ui5.version).toBe('1.120.0');
    });

    it('should sanitize special characters from appId when building flpAppId', () => {
        mockFs.readJSON.mockReturnValue({
            'sap.app': {
                id: 'my-app.id_123#test',
                dataSources: { mainService: { settings: { odataVersion: '4.0' } } }
            }
        } as any);

        const result = getAbapRepoAppConfig(fixtureWebappPath, mockAppInfo, mockFs as unknown as Editor);

        expect(result.app.flpAppId).toBe('myappid123test-tile');
    });
});

describe('getAbapRepoDeployConfig', () => {
    const mockTransport = 'TR000123';

    beforeEach(() => {
        jest.clearAllMocks();
        PromptState.systemSelection = {
            connectedSystem: {
                backendSystem: {
                    url: 'https://test-system.example.com',
                    systemType: 'ABAP',
                    connectionType: 'Direct'
                },
                serviceProvider: {}
            }
        } as any;
        mockResolveTransportRequest.mockResolvedValue(mockTransport);
    });

    it('should build deploy config from repo info when service provider is available', async () => {
        const mockGetInfo = (jest.fn() as jest.Mock).mockResolvedValue({
            Package: 'MY_PACKAGE',
            Description: 'My app description'
        });
        const mockServiceProvider = {
            getUi5AbapRepository: (jest.fn() as jest.Mock).mockReturnValue({ getInfo: mockGetInfo })
        } as unknown as AbapServiceProvider;

        const context = {
            serviceProvider: mockServiceProvider,
            appDownloadType: AppDownloadType.AbapRepository
        };

        const result = await getAbapRepoDeployConfig(mockAppInfo, context);

        expect(mockGetInfo).toHaveBeenCalledWith(mockAppInfo.repoName);
        expect(result.app).toEqual({
            name: mockAppInfo.repoName,
            package: 'MY_PACKAGE',
            description: 'My app description',
            transport: mockTransport
        });
    });

    it('should fall back to appInfo description when repo has no description', async () => {
        const mockGetInfo = (jest.fn() as jest.Mock).mockResolvedValue({
            Package: 'MY_PACKAGE',
            Description: ''
        });
        const mockServiceProvider = {
            getUi5AbapRepository: (jest.fn() as jest.Mock).mockReturnValue({ getInfo: mockGetInfo })
        } as unknown as AbapServiceProvider;

        const context = {
            serviceProvider: mockServiceProvider,
            appDownloadType: AppDownloadType.AbapRepository
        };

        const result = await getAbapRepoDeployConfig(mockAppInfo, context);

        expect(result.app.description).toBe(mockAppInfo.description);
    });

    it('should warn and continue when getInfo throws', async () => {
        const fetchError = new Error('Service unavailable');
        const mockServiceProvider = {
            getUi5AbapRepository: jest.fn().mockReturnValue({
                getInfo: jest.fn().mockRejectedValue(fetchError)
            })
        } as unknown as AbapServiceProvider;

        const context = {
            serviceProvider: mockServiceProvider,
            appDownloadType: AppDownloadType.AbapRepository
        };

        const result = await getAbapRepoDeployConfig(mockAppInfo, context);

        expect(RepoAppDownloadLogger.logger?.warn).toHaveBeenCalled();
        expect(result.app.package).toBe('');
        expect(result.app.description).toBe(mockAppInfo.description);
        expect(resolveTransportRequest).toHaveBeenCalledWith(context.serviceProvider, '', mockAppInfo.repoName);
    });

    it('should use empty package and call resolveTransportRequest when serviceProvider is undefined', async () => {
        const context = {
            serviceProvider: undefined,
            appDownloadType: AppDownloadType.AbapRepository
        };

        const result = await getAbapRepoDeployConfig(mockAppInfo, context);

        expect(resolveTransportRequest).toHaveBeenCalledWith(context.serviceProvider, '', mockAppInfo.repoName);
        expect(result.app.package).toBe('');
    });
});
