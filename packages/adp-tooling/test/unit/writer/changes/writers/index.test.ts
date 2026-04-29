import { jest } from '@jest/globals';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';

const mockWriteAnnotationChange = jest.fn();
const mockWriteChangeToFolder = jest.fn();
const mockFindChangeWithInboundId = jest.fn();
const mockWriteChangeToFile = jest.fn();
const mockGetChange = jest.fn().mockReturnValue({});
const mockAddConnectivityServiceToMta = jest.fn();

const realChangeUtils = await import('../../../../../src/base/change-utils');

jest.unstable_mockModule('../../../../../src/base/change-utils', () => ({
    ...realChangeUtils,
    writeAnnotationChange: mockWriteAnnotationChange,
    writeChangeToFolder: mockWriteChangeToFolder,
    getChange: mockGetChange,
    findChangeWithInboundId: mockFindChangeWithInboundId,
    writeChangeToFile: mockWriteChangeToFile
}));

const realYaml = await import('../../../../../src/cf/project/yaml');

jest.unstable_mockModule('../../../../../src/cf/project/yaml', () => ({
    ...realYaml,
    addConnectivityServiceToMta: mockAddConnectivityServiceToMta
}));

jest.unstable_mockModule('../../../../../src/cf/services/ssh', () => ({
    ensureTunnelAppExists: jest.fn().mockResolvedValue(undefined),
    DEFAULT_TUNNEL_APP_NAME: 'adp-ssh-tunnel-app'
}));

const { AnnotationsWriter, ComponentUsagesWriter, DataSourceWriter, InboundWriter, NewModelWriter } =
    await import('../../../../../src/writer/changes/writers');
const { ChangeType, ServiceType } = await import('../../../../../src');
import type {
    AnnotationsData,
    ComponentUsagesDataBase,
    ComponentUsagesDataWithLibrary,
    DataSourceData,
    NewModelData,
    NewModelDataWithAnnotations,
    InboundData,
    DescriptorVariant
} from '../../../../../src/index.js';

const mockProjectPath = join('mock', 'project', 'path');
const mockTemplatePath = '/mock/template/path';

describe('AnnotationsWriter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should correctly construct content and write annotation change', async () => {
        const mockData: AnnotationsData = {
            variant: {
                layer: 'CUSTOMER_BASE',
                reference: 'mock.reference',
                id: 'adp.mock.variant',
                namespace: 'apps/adp.mock.variant'
            } as DescriptorVariant,
            annotation: {
                fileName: '',
                dataSource: '/sap/opu/odata/source',
                filePath: '/mock/path/to/annotation/file.xml'
            },
            isCommand: true
        };

        const writer = new AnnotationsWriter({} as Editor, mockProjectPath);

        await writer.write(mockData);

        expect(mockWriteAnnotationChange).toHaveBeenCalledWith(
            mockProjectPath,
            expect.any(Number),
            mockData.annotation,
            expect.any(Object),
            {},
            undefined
        );
    });

    it('should correctly construct content without filePath', async () => {
        const mockData: AnnotationsData = {
            variant: {
                layer: 'CUSTOMER_BASE',
                reference: 'mock.reference',
                id: 'adp.mock.variant',
                namespace: 'apps/adp.mock.variant'
            } as DescriptorVariant,
            annotation: {
                fileName: '',
                dataSource: '/sap/opu/odata/source',
                filePath: ''
            },
            isCommand: true
        };

        const writer = new AnnotationsWriter({} as Editor, mockProjectPath, mockTemplatePath);

        await writer.write(mockData);

        expect(mockWriteAnnotationChange).toHaveBeenCalledWith(
            mockProjectPath,
            expect.any(Number),
            mockData.annotation,
            expect.any(Object),
            {},
            mockTemplatePath
        );
    });

    it('should correctly construct content with relative path', async () => {
        const mockData: AnnotationsData = {
            variant: {
                layer: 'CUSTOMER_BASE',
                reference: 'mock.reference',
                id: 'adp.mock.variant',
                namespace: 'apps/adp.mock.variant'
            } as DescriptorVariant,
            annotation: {
                fileName: '',
                dataSource: '/sap/opu/odata/source',
                filePath: 'file.xml'
            },
            isCommand: true
        };

        const writer = new AnnotationsWriter({} as Editor, mockProjectPath);

        await writer.write(mockData);

        expect(mockWriteAnnotationChange).toHaveBeenCalledWith(
            mockProjectPath,
            expect.any(Number),
            mockData.annotation,
            expect.any(Object),
            {},
            undefined
        );
    });
});

describe('ComponentUsagesWriter', () => {
    const mockData = {
        variant: {
            layer: 'CUSTOMER_BASE',
            reference: 'mock.reference',
            id: 'adp.mock.variant',
            namespace: 'apps/adp.mock.variant'
        } as DescriptorVariant,
        component: {
            isLazy: 'true',
            usageId: 'mockID',
            name: 'mockName',
            data: '"key": "value"',
            settings: '"key": "value"'
        },
        library: {
            reference: 'mockLibrary',
            referenceIsLazy: 'false'
        }
    } as ComponentUsagesDataWithLibrary;

    let writer: ComponentUsagesWriter;

    beforeEach(() => {
        writer = new ComponentUsagesWriter({} as Editor, mockProjectPath);
        jest.clearAllMocks();
    });

    it('should write component usages and library reference changes when required', async () => {
        await writer.write(mockData);

        expect(mockGetChange).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({
                componentUsages: {
                    [mockData.component.usageId]: {
                        name: mockData.component.name,
                        lazy: true,
                        settings: { key: 'value' },
                        componentData: { key: 'value' }
                    }
                }
            }),
            ChangeType.ADD_COMPONENT_USAGES
        );

        expect(mockGetChange).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({ libraries: { mockLibrary: { lazy: false } } }),
            ChangeType.ADD_LIBRARY_REFERENCE
        );

        expect(mockWriteChangeToFolder).toHaveBeenCalledTimes(2);
    });

    it('should only write component usages changes when library reference is not required', async () => {
        const mockDataWithoutLibrary = {
            variant: mockData.variant,
            component: mockData.component
        } as ComponentUsagesDataBase;

        const systemTime = new Date('2024-03-10');
        jest.useFakeTimers().setSystemTime(systemTime);

        await writer.write(mockDataWithoutLibrary);

        jest.useRealTimers();

        expect(mockWriteChangeToFolder).toHaveBeenCalledTimes(1);
        expect(mockWriteChangeToFolder).toHaveBeenCalledWith(mockProjectPath, expect.any(Object), expect.any(Object));
    });
});

describe('NewModelWriter', () => {
    let writer: NewModelWriter;
    const readJSONMock = jest.fn();
    const writeJSONMock = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        readJSONMock.mockReturnValue({ routes: [] });
        mockAddConnectivityServiceToMta.mockResolvedValue(undefined);
        writer = new NewModelWriter(
            { readJSON: readJSONMock, writeJSON: writeJSONMock } as unknown as Editor,
            mockProjectPath
        );
    });

    it('should correctly construct content and write new model change', async () => {
        const mockData: NewModelDataWithAnnotations = {
            variant: {} as DescriptorVariant,
            serviceType: ServiceType.ODATA_V4,
            service: {
                name: 'ODataService',
                uri: '/sap/opu/odata/custom',
                modelName: 'ODataService',
                version: '4.0',
                modelSettings: '"someSetting": "someValue"'
            },
            annotation: {
                dataSourceName: 'ODataAnnotations',
                dataSourceURI: 'some/path/annotations.xml',
                settings: '"anotherSetting": "anotherValue"'
            }
        };

        await writer.write(mockData);

        expect(mockGetChange).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            {
                'dataSource': {
                    'ODataService': {
                        'uri': mockData.service.uri,
                        'type': 'OData',
                        'settings': {
                            'odataVersion': mockData.service.version,
                            'annotations': [mockData.annotation.dataSourceName]
                        }
                    },
                    'ODataAnnotations': {
                        'uri': mockData.annotation.dataSourceURI,
                        'type': 'ODataAnnotation',
                        'settings': {
                            'anotherSetting': 'anotherValue'
                        }
                    }
                },
                'model': {
                    'ODataService': {
                        'dataSource': mockData.service.name,
                        'settings': {
                            'someSetting': 'someValue'
                        }
                    }
                }
            },
            ChangeType.ADD_NEW_MODEL
        );

        expect(mockWriteChangeToFolder).toHaveBeenCalledWith(mockProjectPath, expect.any(Object), expect.any(Object));
    });

    it('should omit the model block in HTTP service type scenario', async () => {
        const mockData: NewModelData = {
            variant: {} as DescriptorVariant,
            serviceType: ServiceType.HTTP,
            service: {
                name: 'HttpService',
                uri: '/api/http/service/',
                modelName: undefined,
                version: undefined
            }
        };

        await writer.write(mockData);

        expect(mockGetChange).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            {
                'dataSource': {
                    'HttpService': {
                        'uri': mockData.service.uri,
                        'type': 'http',
                        'settings': {}
                    }
                }
            },
            ChangeType.ADD_NEW_DATA_SOURCE
        );
    });

    it('should construct CF change content with derived URI', async () => {
        const mockData: NewModelData = {
            variant: {} as DescriptorVariant,
            serviceType: ServiceType.ODATA_V4,
            isCloudFoundry: true,
            destinationName: 'MY_CF_DEST',
            service: {
                name: 'customer.MyService',
                uri: '/sap/opu/odata/v4/',
                modelName: 'customer.MyService',
                version: '4.0'
            }
        };

        await writer.write(mockData);

        expect(mockGetChange).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            {
                'dataSource': {
                    'customer.MyService': {
                        'uri': 'customer/MyService/sap/opu/odata/v4/',
                        'type': 'OData',
                        'settings': {
                            'odataVersion': '4.0'
                        }
                    }
                },
                'model': {
                    'customer.MyService': {
                        'dataSource': 'customer.MyService'
                    }
                }
            },
            ChangeType.ADD_NEW_MODEL
        );
    });

    it('should apply user modelSettings for CF project', async () => {
        const mockData: NewModelData = {
            variant: {} as DescriptorVariant,
            serviceType: ServiceType.ODATA_V4,
            isCloudFoundry: true,
            destinationName: 'MY_CF_DEST',
            service: {
                name: 'customer.MyService',
                uri: '/sap/opu/odata/v4/',
                modelName: 'customer.MyService',
                version: '4.0',
                modelSettings: '"operationMode": "Server"'
            }
        };

        await writer.write(mockData);

        expect(mockGetChange).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({
                'model': {
                    'customer.MyService': {
                        'dataSource': 'customer.MyService',
                        'settings': { 'operationMode': 'Server' }
                    }
                }
            }),
            ChangeType.ADD_NEW_MODEL
        );
    });

    it('should create xs-app.json with a new route for a CF project when xs-app.json does not exist', async () => {
        const mockData: NewModelData = {
            variant: {} as DescriptorVariant,
            serviceType: ServiceType.ODATA_V4,
            isCloudFoundry: true,
            destinationName: 'MY_CF_DEST',
            service: {
                name: 'customer.MyService',
                uri: '/sap/opu/odata/v4/',
                modelName: 'customer.MyService',
                version: '4.0'
            }
        };

        await writer.write(mockData);

        expect(readJSONMock).toHaveBeenCalledWith(join(mockProjectPath, 'webapp', 'xs-app.json'), { routes: [] });
        expect(writeJSONMock).toHaveBeenCalledWith(join(mockProjectPath, 'webapp', 'xs-app.json'), {
            routes: [
                {
                    source: '^/customer/MyService/sap/opu/odata/v4/(.*)',
                    target: '/sap/opu/odata/v4/$1',
                    destination: 'MY_CF_DEST'
                }
            ]
        });
    });

    it('should append a route to existing xs-app.json routes for a CF project', async () => {
        readJSONMock.mockReturnValue({
            routes: [{ source: '^existing/route/(.*)', target: '/existing/$1', destination: 'OTHER_DEST' }]
        });

        const mockData: NewModelData = {
            variant: {} as DescriptorVariant,
            serviceType: ServiceType.ODATA_V2,
            isCloudFoundry: true,
            destinationName: 'MY_CF_DEST',
            service: {
                name: 'customer.NewService',
                uri: '/sap/opu/odata/v2/',
                modelName: 'customer.NewService',
                version: '2.0'
            }
        };

        await writer.write(mockData);

        expect(writeJSONMock).toHaveBeenCalledWith(join(mockProjectPath, 'webapp', 'xs-app.json'), {
            routes: [
                { source: '^existing/route/(.*)', target: '/existing/$1', destination: 'OTHER_DEST' },
                {
                    source: '^/customer/NewService/sap/opu/odata/v2/(.*)',
                    target: '/sap/opu/odata/v2/$1',
                    destination: 'MY_CF_DEST'
                }
            ]
        });
    });

    it('should not write xs-app.json for a non-CF project', async () => {
        const mockData: NewModelData = {
            variant: {} as DescriptorVariant,
            serviceType: ServiceType.ODATA_V2,
            service: {
                name: 'ODataService',
                uri: '/sap/opu/odata/custom/',
                modelName: 'ODataService',
                version: '2.0'
            }
        };

        await writer.write(mockData);

        expect(readJSONMock).not.toHaveBeenCalled();
        expect(writeJSONMock).not.toHaveBeenCalled();
    });

    it('should call addConnectivityServiceToMta when isCloudFoundry and isOnPremiseDestination', async () => {
        const mockData: NewModelData = {
            variant: {} as DescriptorVariant,
            serviceType: ServiceType.ODATA_V2,
            isCloudFoundry: true,
            isOnPremiseDestination: true,
            destinationName: 'MY_CF_DEST',
            service: {
                name: 'customer.MyService',
                uri: '/sap/opu/odata/v2/',
                modelName: 'customer.MyService',
                version: '2.0'
            }
        };

        await writer.write(mockData);

        expect(mockAddConnectivityServiceToMta).toHaveBeenCalledWith(join('mock', 'project'), expect.any(Object));
    });

    it('should not call addConnectivityServiceToMta when not in CF', async () => {
        const mockData: NewModelData = {
            variant: {} as DescriptorVariant,
            serviceType: ServiceType.ODATA_V2,
            isCloudFoundry: false,
            service: {
                name: 'ODataService',
                uri: '/sap/opu/odata/v2/',
                modelName: 'ODataService',
                version: '2.0'
            }
        };

        await writer.write(mockData);

        expect(mockAddConnectivityServiceToMta).not.toHaveBeenCalled();
    });

    it('should not call addConnectivityServiceToMta when isOnPremiseDestination is false', async () => {
        const mockData: NewModelData = {
            variant: {} as DescriptorVariant,
            serviceType: ServiceType.ODATA_V2,
            isCloudFoundry: true,
            isOnPremiseDestination: false,
            destinationName: 'MY_CF_DEST',
            service: {
                name: 'customer.MyService',
                uri: '/sap/opu/odata/v2/',
                modelName: 'customer.MyService',
                version: '2.0'
            }
        };

        await writer.write(mockData);

        expect(mockAddConnectivityServiceToMta).not.toHaveBeenCalled();
    });
});

describe('DataSourceWriter', () => {
    const mockData: DataSourceData = {
        service: {
            id: 'CustomOData',
            uri: '/sap/opu/odata/custom',
            annotationUri: '',
            maxAge: 60
        },
        dataSources: {
            'CustomOData': {
                settings: {
                    annotations: ['CustomAnnotation']
                },
                uri: '/datasource/uri'
            }
        },
        variant: {
            layer: 'VENDOR',
            reference: '',
            id: '',
            namespace: '',
            content: []
        }
    };

    let writer: DataSourceWriter;

    beforeEach(() => {
        writer = new DataSourceWriter({} as Editor, mockProjectPath);
        jest.clearAllMocks();
    });

    it('should write data source change with provided data', async () => {
        const systemTime = new Date('2024-03-10');
        jest.useFakeTimers().setSystemTime(systemTime);
        await writer.write(mockData);
        jest.useRealTimers();
        expect(mockGetChange).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({
                dataSourceId: mockData.service.id,
                entityPropertyChange: expect.arrayContaining([
                    expect.objectContaining({
                        propertyPath: 'uri',
                        operation: 'UPDATE',
                        propertyValue: mockData.service.uri
                    }),
                    expect.objectContaining({
                        propertyPath: 'settings/maxAge',
                        operation: 'UPSERT',
                        propertyValue: mockData.service.maxAge
                    })
                ])
            }),
            expect.anything()
        );

        expect(mockWriteChangeToFolder).toHaveBeenCalledWith(mockProjectPath, expect.any(Object), expect.any(Object));
    });

    it('should add annotation change if annotationUri is provided', async () => {
        mockData.service.annotationUri = 'some/path/annotations';

        await writer.write(mockData);

        expect(mockGetChange).toHaveBeenCalledTimes(2);
        expect(mockWriteChangeToFolder).toHaveBeenCalledTimes(2);
    });
});

describe('InboundWriter', () => {
    const mockProjectPath = '/mock/project/path';
    let writer: InboundWriter;

    beforeEach(() => {
        writer = new InboundWriter({} as Editor, mockProjectPath);
        jest.clearAllMocks();
    });

    it('should create a new inbound change when no existing change is found', async () => {
        const mockData: InboundData = {
            inboundId: 'testInboundId',
            flp: {
                title: 'Test Title',
                subtitle: 'Test SubTitle',
                icon: 'Test Icon'
            },
            variant: {} as DescriptorVariant
        };

        mockFindChangeWithInboundId.mockResolvedValue({ changeWithInboundId: null, filePath: '' });

        await writer.write(mockData);

        expect(mockGetChange).toHaveBeenCalled();
        expect(mockWriteChangeToFolder).toHaveBeenCalled();
    });

    it('should enhance existing inbound change content when found', async () => {
        const mockData = {
            inboundId: 'testInboundId',
            flp: {
                title: 'New Title',
                subtitle: 'New SubTitle',
                icon: 'New Icon'
            },
            variant: {} as DescriptorVariant
        };

        const existingChangeContent = { inboundId: 'testInboundId', entityPropertyChange: [] };
        mockFindChangeWithInboundId.mockResolvedValue({
            changeWithInboundId: { content: existingChangeContent },
            filePath: `${mockProjectPath}/webapp/changes/manifest/inboundChange.change`
        });

        await writer.write(mockData as InboundData);

        expect(mockWriteChangeToFile).toHaveBeenCalledWith(
            '/mock/project/path/webapp/changes/manifest/inboundChange.change',
            expect.objectContaining({ content: expect.objectContaining({ inboundId: 'testInboundId' }) }),
            {}
        );
    });
});
