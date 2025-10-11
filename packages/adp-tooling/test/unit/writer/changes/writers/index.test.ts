import type { Editor } from 'mem-fs-editor';

import {
    writeAnnotationChange,
    writeChangeToFolder,
    findChangeWithInboundId,
    writeChangeToFile,
    getChange
} from '../../../../../src/base/change-utils';
import type {
    AnnotationsData,
    ComponentUsagesDataBase,
    ComponentUsagesDataWithLibrary,
    DataSourceData,
    NewModelData,
    InboundData,
    DescriptorVariant
} from '../../../../../src';
import {
    AnnotationsWriter,
    ComponentUsagesWriter,
    DataSourceWriter,
    InboundWriter,
    NewModelWriter
} from '../../../../../src/writer/changes/writers';
import { ChangeType } from '../../../../../src';

jest.mock('../../../../../src/base/change-utils', () => ({
    ...jest.requireActual('../../../../../src/base/change-utils'),
    writeAnnotationChange: jest.fn(),
    writeChangeToFolder: jest.fn(),
    getChange: jest.fn().mockReturnValue({}),
    findChangeWithInboundId: jest.fn(),
    writeChangeToFile: jest.fn()
}));

const writeAnnotationChangeMock = writeAnnotationChange as jest.Mock;
const getChangeMock = getChange as jest.Mock;
const writeChangeToFolderMock = writeChangeToFolder as jest.Mock;
const findChangeWithInboundIdMock = findChangeWithInboundId as jest.Mock;
const writeChangeToFileMock = writeChangeToFile as jest.Mock;

const mockProjectPath = '/mock/project/path';
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

        expect(writeAnnotationChangeMock).toHaveBeenCalledWith(
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

        expect(writeAnnotationChangeMock).toHaveBeenCalledWith(
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

        expect(writeAnnotationChangeMock).toHaveBeenCalledWith(
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

        expect(getChangeMock).toHaveBeenCalledWith(
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

        expect(getChangeMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({ libraries: { mockLibrary: { lazy: false } } }),
            ChangeType.ADD_LIBRARY_REFERENCE
        );

        expect(writeChangeToFolderMock).toHaveBeenCalledTimes(2);
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

        expect(writeChangeToFolderMock).toHaveBeenCalledTimes(1);
        expect(writeChangeToFolderMock).toHaveBeenCalledWith(mockProjectPath, expect.any(Object), expect.any(Object));
    });
});

describe('NewModelWriter', () => {
    let writer: NewModelWriter;

    beforeEach(() => {
        writer = new NewModelWriter({} as Editor, mockProjectPath);
        jest.clearAllMocks();
    });

    it('should correctly construct content and write new model change', async () => {
        const mockData: NewModelData = {
            variant: {} as DescriptorVariant,
            service: {
                name: 'ODataService',
                uri: '/sap/opu/odata/custom',
                modelName: 'ODataModel',
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

        expect(getChangeMock).toHaveBeenCalledWith(
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
                    'ODataModel': {
                        'dataSource': mockData.service.name,
                        'settings': {
                            'someSetting': 'someValue'
                        }
                    }
                }
            },
            ChangeType.ADD_NEW_MODEL
        );

        expect(writeChangeToFolderMock).toHaveBeenCalledWith(mockProjectPath, expect.any(Object), expect.any(Object));
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
        expect(getChangeMock).toHaveBeenCalledWith(
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

        expect(writeChangeToFolder).toHaveBeenCalledWith(mockProjectPath, expect.any(Object), expect.any(Object));
    });

    it('should add annotation change if annotationUri is provided', async () => {
        mockData.service.annotationUri = 'some/path/annotations';

        await writer.write(mockData);

        expect(getChange).toHaveBeenCalledTimes(2);
        expect(writeChangeToFolder).toHaveBeenCalledTimes(2);
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

        findChangeWithInboundIdMock.mockReturnValue({ changeWithInboundId: null, filePath: '' });

        await writer.write(mockData);

        expect(getChangeMock).toHaveBeenCalled();
        expect(writeChangeToFolderMock).toHaveBeenCalled();
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
        findChangeWithInboundIdMock.mockReturnValue({
            changeWithInboundId: { content: existingChangeContent },
            filePath: `${mockProjectPath}/webapp/changes/manifest/inboundChange.change`
        });

        await writer.write(mockData as InboundData);

        expect(writeChangeToFileMock).toHaveBeenCalledWith(
            '/mock/project/path/webapp/changes/manifest/inboundChange.change',
            expect.objectContaining({ content: expect.objectContaining({ inboundId: 'testInboundId' }) }),
            {}
        );
    });
});
