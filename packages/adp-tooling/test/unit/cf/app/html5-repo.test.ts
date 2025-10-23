import axios from 'axios';
import AdmZip from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { initI18n, t } from '../../../../src/i18n';
import type { CfAppParams, ServiceKeys, Uaa } from '../../../../src/types';
import { getServiceNameByTags, createServiceInstance, getServiceInstanceKeys } from '../../../../src/cf/services/api';
import { downloadAppContent, downloadZip, getHtml5RepoCredentials, getToken } from '../../../../src/cf/app/html5-repo';

jest.mock('axios');
jest.mock('adm-zip');
jest.mock('../../../../src/cf/services/api', () => ({
    ...jest.requireActual('../../../../src/cf/services/api'),
    getServiceNameByTags: jest.fn(),
    createServiceInstance: jest.fn(),
    getServiceInstanceKeys: jest.fn()
}));

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockAdmZip = AdmZip as jest.MockedClass<typeof AdmZip>;
const mockGetServiceNameByTags = getServiceNameByTags as jest.MockedFunction<typeof getServiceNameByTags>;
const mockCreateServiceInstance = createServiceInstance as jest.MockedFunction<typeof createServiceInstance>;
const mockGetServiceInstanceKeys = getServiceInstanceKeys as jest.MockedFunction<typeof getServiceInstanceKeys>;

describe('HTML5 Repository', () => {
    const mockLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    } as unknown as ToolsLogger;

    const mockUaa: Uaa = {
        clientid: 'test-client-id',
        clientsecret: 'test-client-secret',
        url: '/test-uaa'
    };

    const mockServiceKeys: ServiceKeys = {
        credentials: [
            {
                uaa: mockUaa,
                uri: '/test-html5-repo',
                endpoints: {}
            }
        ],
        serviceInstance: {
            guid: 'test-service-guid',
            name: 'test-service'
        }
    };

    const mockManifest: Manifest = {
        'sap.app': {
            id: 'test-app',
            title: 'Test App'
        }
    } as Manifest;

    const mockZipEntry = {
        entryName: 'manifest.json',
        getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockManifest)))
    };

    const mockZipEntries = [
        mockZipEntry,
        {
            entryName: 'xs-app.json',
            getData: jest.fn().mockReturnValue(Buffer.from('{}'))
        }
    ];

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getToken', () => {
        test('should successfully get OAuth token', async () => {
            const mockResponse = {
                data: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    access_token: 'test-access-token'
                }
            };
            mockAxios.get.mockResolvedValue(mockResponse);

            const result = await getToken(mockUaa);

            expect(result).toBe('test-access-token');
            expect(mockAxios.get).toHaveBeenCalledWith('/test-uaa/oauth/token?grant_type=client_credentials', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + Buffer.from('test-client-id:test-client-secret').toString('base64')
                }
            });
        });

        test('should throw error when token request fails', async () => {
            const error = new Error('Network error');
            mockAxios.get.mockRejectedValue(error);

            await expect(getToken(mockUaa)).rejects.toThrow(t('error.failedToGetAuthKey', { error: 'Network error' }));
        });

        test('should handle missing access_token in response', async () => {
            const mockResponse = {
                data: {}
            };
            mockAxios.get.mockResolvedValue(mockResponse);

            const result = await getToken(mockUaa);

            expect(result).toBeUndefined();
        });
    });

    describe('downloadZip', () => {
        test('should successfully download zip file', async () => {
            const mockBuffer = Buffer.from('test-zip-content');
            const mockResponse = {
                data: mockBuffer
            };
            mockAxios.get.mockResolvedValue(mockResponse);

            const result = await downloadZip('test-token', 'test-app-host-id', '/test-uri');

            expect(result).toBe(mockBuffer);
            expect(mockAxios.get).toHaveBeenCalledWith('/test-uri', {
                responseType: 'arraybuffer',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token',
                    'x-app-host-id': 'test-app-host-id'
                }
            });
        });

        test('should throw error when download fails', async () => {
            const error = new Error('Download failed');
            mockAxios.get.mockRejectedValue(error);

            await expect(downloadZip('test-token', 'test-app-host-id', '/test-uri')).rejects.toThrow(
                t('error.failedToDownloadZipFromHtml5Repo', { error: 'Download failed' })
            );
        });
    });

    describe('getHtml5RepoCredentials', () => {
        test('should return existing service keys', async () => {
            mockGetServiceInstanceKeys.mockResolvedValue(mockServiceKeys);

            const result = await getHtml5RepoCredentials('test-space-guid', mockLogger);

            expect(result).toBe(mockServiceKeys);
            expect(mockGetServiceInstanceKeys).toHaveBeenCalledWith(
                {
                    spaceGuids: ['test-space-guid'],
                    planNames: ['app-runtime'],
                    names: ['html5-apps-repo-runtime']
                },
                mockLogger
            );
            expect(mockGetServiceNameByTags).not.toHaveBeenCalled();
            expect(mockCreateServiceInstance).not.toHaveBeenCalled();
        });

        test('should create service when no credentials found', async () => {
            mockGetServiceInstanceKeys
                .mockResolvedValueOnce({ credentials: [], serviceInstance: { guid: '', name: '' } })
                .mockResolvedValueOnce(mockServiceKeys);
            mockGetServiceNameByTags.mockResolvedValue('html5-apps-repo-rt');
            mockCreateServiceInstance.mockResolvedValue(undefined);

            const result = await getHtml5RepoCredentials('test-space-guid', mockLogger);

            expect(result).toBe(mockServiceKeys);
            expect(mockGetServiceNameByTags).toHaveBeenCalledWith('test-space-guid', ['html5-apps-repo-rt']);
            expect(mockCreateServiceInstance).toHaveBeenCalledWith(
                'app-runtime',
                'html5-apps-repo-runtime',
                'html5-apps-repo-rt',
                {
                    logger: mockLogger
                }
            );
            expect(mockGetServiceInstanceKeys).toHaveBeenCalledTimes(2);
        });

        test('should throw error when service creation fails', async () => {
            mockGetServiceInstanceKeys
                .mockResolvedValueOnce({ credentials: [], serviceInstance: { guid: '', name: '' } })
                .mockResolvedValueOnce({ credentials: [], serviceInstance: { guid: '', name: '' } });
            mockGetServiceNameByTags.mockResolvedValue('html5-apps-repo-rt');
            mockCreateServiceInstance.mockResolvedValue(undefined);

            await expect(getHtml5RepoCredentials('test-space-guid', mockLogger)).rejects.toThrow(
                t('error.cannotFindHtml5RepoRuntime')
            );
        });

        test('should throw error when getServiceInstanceKeys fails', async () => {
            const error = new Error('Service error');
            mockGetServiceInstanceKeys.mockRejectedValue(error);

            await expect(getHtml5RepoCredentials('test-space-guid', mockLogger)).rejects.toThrow(
                t('error.failedToGetCredentialsFromHtml5Repo', { error: 'Service error' })
            );
        });
    });

    describe('downloadAppContent', () => {
        const mockParameters: CfAppParams = {
            appName: 'test-app',
            appVersion: '1.0.0',
            appHostId: 'test-app-host-id'
        };

        beforeEach(() => {
            mockGetServiceInstanceKeys.mockResolvedValue(mockServiceKeys);
            mockAxios.get
                .mockResolvedValueOnce({
                    data: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        access_token: 'test-token'
                    }
                })
                .mockResolvedValueOnce({
                    data: Buffer.from('test-zip-content')
                });

            const mockAdmZipInstance = {
                getEntries: jest.fn().mockReturnValue(mockZipEntries)
            };
            mockAdmZip.mockImplementation(() => mockAdmZipInstance as unknown as AdmZip);
        });

        test('should successfully download app content', async () => {
            const result = await downloadAppContent('test-space-guid', mockParameters, mockLogger);

            expect(result).toEqual({
                entries: mockZipEntries,
                serviceInstanceGuid: 'test-service-guid',
                manifest: mockManifest
            });
        });

        test('should throw error when no credentials found', async () => {
            jest.clearAllMocks();
            mockGetServiceInstanceKeys.mockResolvedValue({
                credentials: [],
                serviceInstance: { guid: '', name: '' }
            });

            await expect(downloadAppContent('test-space-guid', mockParameters, mockLogger)).rejects.toThrow(
                t('error.failedToDownloadAppContent', {
                    spaceGuid: 'test-space-guid',
                    appName: 'test-app',
                    appHostId: 'test-app-host-id',
                    error: t('error.failedToGetCredentialsFromHtml5Repo', {
                        error: t('error.cannotFindHtml5RepoRuntime')
                    })
                })
            );
        });

        test('should throw error when zip parsing fails', async () => {
            jest.clearAllMocks();
            mockGetServiceInstanceKeys.mockResolvedValue(mockServiceKeys);
            mockAxios.get.mockResolvedValueOnce({
                data: {
                    access_token: 'test-token'
                }
            });
            mockAxios.get.mockResolvedValueOnce({
                data: Buffer.from('test-zip-content')
            });
            mockAdmZip.mockImplementation(() => {
                throw new Error('Invalid zip');
            });

            await expect(downloadAppContent('test-space-guid', mockParameters, mockLogger)).rejects.toThrow(
                t('error.failedToDownloadAppContent', {
                    spaceGuid: 'test-space-guid',
                    appName: 'test-app',
                    appHostId: 'test-app-host-id',
                    error: t('error.failedToParseZipContent', { error: 'Invalid zip' })
                })
            );
        });

        test('should throw error when zip has no entries', async () => {
            jest.clearAllMocks();
            mockGetServiceInstanceKeys.mockResolvedValue(mockServiceKeys);
            mockAxios.get.mockResolvedValueOnce({
                data: {
                    access_token: 'test-token'
                }
            });
            mockAxios.get.mockResolvedValueOnce({
                data: Buffer.from('test-zip-content')
            });
            const mockAdmZipInstance = {
                getEntries: jest.fn().mockReturnValue([])
            };
            mockAdmZip.mockImplementation(() => mockAdmZipInstance as unknown as AdmZip);

            await expect(downloadAppContent('test-space-guid', mockParameters, mockLogger)).rejects.toThrow(
                t('error.failedToDownloadAppContent', {
                    spaceGuid: 'test-space-guid',
                    appName: 'test-app',
                    appHostId: 'test-app-host-id',
                    error: t('error.noZipContentParsed')
                })
            );
        });

        test('should throw error when manifest.json not found', async () => {
            jest.clearAllMocks();
            mockGetServiceInstanceKeys.mockResolvedValue(mockServiceKeys);
            mockAxios.get.mockResolvedValueOnce({
                data: {
                    access_token: 'test-token'
                }
            });
            mockAxios.get.mockResolvedValueOnce({
                data: Buffer.from('test-zip-content')
            });
            const mockAdmZipInstance = {
                getEntries: jest.fn().mockReturnValue([
                    {
                        entryName: 'xs-app.json',
                        getData: jest.fn().mockReturnValue(Buffer.from('{}'))
                    }
                ])
            };
            mockAdmZip.mockImplementation(() => mockAdmZipInstance as unknown as AdmZip);

            await expect(downloadAppContent('test-space-guid', mockParameters, mockLogger)).rejects.toThrow(
                t('error.failedToDownloadAppContent', {
                    spaceGuid: 'test-space-guid',
                    appName: 'test-app',
                    appHostId: 'test-app-host-id',
                    error: t('error.failedToFindManifestJsonInHtml5Repo')
                })
            );
        });

        test('should throw error when manifest.json parsing fails', async () => {
            jest.clearAllMocks();
            mockGetServiceInstanceKeys.mockResolvedValue(mockServiceKeys);
            mockAxios.get.mockResolvedValueOnce({
                data: {
                    access_token: 'test-token'
                }
            });
            mockAxios.get.mockResolvedValueOnce({
                data: Buffer.from('test-zip-content')
            });
            const mockInvalidZipEntry = {
                entryName: 'manifest.json',
                getData: jest.fn().mockReturnValue(Buffer.from('invalid-json'))
            };
            const mockAdmZipInstance = {
                getEntries: jest.fn().mockReturnValue([mockInvalidZipEntry])
            };
            mockAdmZip.mockImplementation(() => mockAdmZipInstance as unknown as AdmZip);

            await expect(downloadAppContent('test-space-guid', mockParameters, mockLogger)).rejects.toThrow(
                t('error.failedToDownloadAppContent', {
                    spaceGuid: 'test-space-guid',
                    appName: 'test-app',
                    appHostId: 'test-app-host-id',
                    error: t('error.failedToParseManifestJson', {
                        error: 'Unexpected token \'i\', "invalid-json" is not valid JSON'
                    })
                })
            );
        });

        test('should construct correct URI for app content', async () => {
            await downloadAppContent('test-space-guid', mockParameters, mockLogger);

            expect(mockAxios.get).toHaveBeenCalledWith(
                '/test-html5-repo/applications/content/test-app-1.0.0?pathSuffixFilter=manifest.json,xs-app.json',
                expect.objectContaining({
                    responseType: 'arraybuffer',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token',
                        'x-app-host-id': 'test-app-host-id'
                    })
                })
            );
        });
    });
});
