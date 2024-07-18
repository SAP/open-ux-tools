import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import { join } from 'path';
import * as abap from '../../../src/base/abap';

jest.mock('fs');
jest.mock('prompts');

const appManifest = jest
    .requireActual('fs')
    .readFileSync(join(__dirname, '../../fixtures/base-app', 'manifest.json'), 'utf-8');

const mockAppInfo = { ExampleApp: { manifestUrl: 'https://sap.example' } };
const abapServicesMock = {
    getAppInfo: jest.fn().mockResolvedValue(mockAppInfo),
    get: jest.fn().mockResolvedValue({ data: appManifest })
};

jest.mock('@sap-ux/system-access', () => {
    return {
        ...jest.requireActual('@sap-ux/system-access'),
        createAbapServiceProvider: () => {
            return {
                getAppIndex: jest.fn().mockReturnValue({
                    getAppInfo: abapServicesMock.getAppInfo
                }),
                get: abapServicesMock.get
            };
        }
    };
});

describe('abap', () => {
    const loggerMock = {
        debug: jest.fn(),
        error: jest.fn()
    } as Partial<ToolsLogger> as ToolsLogger;
    const adpConfig = {
        target: {
            url: 'https://example.com',
            client: '100'
        },
        ignoreCertErrors: true
    };

    describe('getManifest', () => {
        test('should return base application manifest', async () => {
            const manifest = await abap.getManifest('ExampleApp', adpConfig, loggerMock);
            expect(manifest).toEqual(JSON.parse(appManifest));
        });

        test('should fail with manifest URL not found error', async () => {
            abapServicesMock.getAppInfo.mockResolvedValueOnce({ ExampleApp: {} });

            await expect(abap.getManifest('ExampleApp', adpConfig, loggerMock)).rejects.toThrow(
                'Manifest URL not found'
            );
        });

        test('should fail with manifest not found', async () => {
            abapServicesMock.get.mockRejectedValueOnce({
                response: { status: 404 },
                isAxiosError: true
            });

            try {
                await abap.getManifest('ExampleApp', adpConfig, loggerMock);
                fail('Expected error to be thrown');
            } catch (error) {
                expect(error.response.status).toBe(404);
            }
        });

        test('should fail due to corruped manifest content', async () => {
            abapServicesMock.get.mockRejectedValueOnce(new Error('Manifest parsing error'));

            try {
                await abap.getManifest('ExampleApp', adpConfig, loggerMock);
                fail('Expected error to be thrown');
            } catch (error) {
                expect(error.message).toBe('Manifest parsing error');
            }
        });
    });

    describe('getManifestDataSources', () => {
        const mockAdp = {
            target: {
                url: 'https://sap.example',
                client: '100'
            }
        };

        test('should fail when no data sources are found in application manifest', async () => {
            const loggerMock = {
                debug: jest.fn(),
                error: jest.fn()
            } as Partial<ToolsLogger> as ToolsLogger;
            jest.spyOn(abap, 'getManifest').mockResolvedValueOnce({ 'sap.app': {} } as unknown as Manifest);

            await expect(abap.getManifestDataSources('testReference', mockAdp, loggerMock)).rejects.toThrow(
                'No data sources found in the manifest'
            );
        });

        test('should return data sources from application manifest', async () => {
            const loggerMock = {
                debug: jest.fn(),
                error: jest.fn()
            } as Partial<ToolsLogger> as ToolsLogger;
            jest.spyOn(abap, 'getManifest').mockResolvedValueOnce(JSON.parse(appManifest));

            expect(await abap.getManifestDataSources('testReference', mockAdp, loggerMock)).toStrictEqual({
                'annotation': {
                    'settings': { 'localUri': 'localService/annotation.xml' },
                    'type': 'ODataAnnotation',
                    'uri': "/path/to/annotation;v=2/Annotations(TechnicalName='annotation',Version='0001')/$value/?sap-language=EN"
                },
                'service': {
                    'settings': {
                        'annotations': ['annotation'],
                        'localUri': 'localService/mockdata/metadata.xml'
                    },
                    'type': 'OData',
                    'uri': '/path/to/odata/service/'
                }
            });
        });
    });
});
