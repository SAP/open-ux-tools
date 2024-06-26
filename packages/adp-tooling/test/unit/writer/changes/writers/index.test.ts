import type { Editor } from 'mem-fs-editor';

import {
    writeAnnotationChange,
    writeChangeToFolder,
    findChangeWithInboundId,
    writeChangeToFile,
    getChange
} from '../../../../../src/base/change-utils';
import type {
    AdpProjectData,
    AnnotationsData,
    ComponentUsagesData,
    DataSourceData,
    InboundData
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

describe('AnnotationsWriter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should correctly construct content and write annotation change', async () => {
        const mockData: AnnotationsData = {
            annotation: {
                dataSource: '/sap/opu/odata/source',
                filePath: '/mock/path/to/annotation/file.xml',
                fileName: 'mockAnnotation.xml'
            },
            projectData: { namespace: 'apps/mock', layer: 'VENDOR', id: 'mockId' } as AdpProjectData,
            timestamp: Date.now(),
            isInternalUsage: false
        };

        const writer = new AnnotationsWriter({} as Editor, mockProjectPath);

        await writer.write(mockData);

        expect(writeAnnotationChangeMock).toHaveBeenCalledWith(mockProjectPath, mockData, expect.any(Object), {});
    });
});

describe('ComponentUsagesWriter', () => {
    const mockData = {
        projectData: { namespace: 'apps/mock', layer: 'VENDOR', reference: 'reference' } as AdpProjectData,
        component: {
            usageId: 'mockID',
            name: 'mockName',
            isLazy: 'true',
            settings: '"key": "value"',
            data: '"key": "value"'
        },
        library: {
            reference: 'mockLibrary',
            referenceIsLazy: 'false'
        },
        timestamp: 1234567890
    };

    let writer: ComponentUsagesWriter;

    beforeEach(() => {
        writer = new ComponentUsagesWriter({} as Editor, mockProjectPath);
        jest.clearAllMocks();
    });

    it('should write component usages and library reference changes when required', async () => {
        await writer.write(mockData as ComponentUsagesData);

        expect(getChangeMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({
                componentUsages: {
                    [mockData.component.usageId]: {
                        name: mockData.component.name,
                        lazy: true,
                        settings: { key: 'value' },
                        data: { key: 'value' }
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
        mockData.library.reference = '';

        await writer.write(mockData as ComponentUsagesData);

        expect(writeChangeToFolderMock).toHaveBeenCalledTimes(1);
        expect(writeChangeToFolderMock).toHaveBeenCalledWith(
            mockProjectPath,
            expect.any(Object),
            'id_1234567891_addComponentUsages.change',
            {},
            'manifest'
        );
    });
});

describe('NewModelWriter', () => {
    let writer: NewModelWriter;

    beforeEach(() => {
        writer = new NewModelWriter({} as Editor, mockProjectPath);
        jest.clearAllMocks();
    });

    it('should correctly construct content and write new model change', async () => {
        const mockData = {
            projectData: {} as AdpProjectData,
            service: {
                name: 'ODataService',
                uri: '/sap/opu/odata/custom',
                version: '4.0',
                modelName: 'ODataModel',
                modelSettings: '"someSetting": "someValue"'
            },
            annotation: {
                dataSourceName: 'ODataAnnotations',
                dataSourceURI: 'some/path/annotations.xml',
                settings: '"anotherSetting": "anotherValue"'
            },
            addAnnotationMode: true,
            timestamp: 1234567890
        };

        await writer.write(mockData);

        expect(getChangeMock).toHaveBeenCalledWith(
            expect.anything(),
            mockData.timestamp,
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

        expect(writeChangeToFolderMock).toHaveBeenCalledWith(
            mockProjectPath,
            expect.any(Object),
            `id_${mockData.timestamp}_addNewModel.change`,
            {},
            'manifest'
        );
    });
});

describe('DataSourceWriter', () => {
    const mockData: DataSourceData = {
        answers: {
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
                dataSourceId: mockData.answers.id,
                entityPropertyChange: expect.arrayContaining([
                    expect.objectContaining({
                        propertyPath: 'uri',
                        operation: 'UPDATE',
                        propertyValue: mockData.answers.uri
                    }),
                    expect.objectContaining({
                        propertyPath: 'settings/maxAge',
                        operation: 'UPSERT',
                        propertyValue: mockData.answers.maxAge
                    })
                ])
            }),
            expect.anything()
        );

        expect(writeChangeToFolder).toHaveBeenCalledWith(
            mockProjectPath,
            expect.any(Object),
            `id_${systemTime.getTime()}_changeDataSource.change`,
            {},
            'manifest'
        );
    });

    it('should add annotation change if annotationUri is provided', async () => {
        mockData.answers.annotationUri = 'some/path/annotations';

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
        const mockData = {
            inboundId: 'testInboundId',
            timestamp: 1234567890,
            flp: {
                title: 'Test Title',
                subTitle: 'Test SubTitle',
                icon: 'Test Icon'
            }
        };

        findChangeWithInboundIdMock.mockReturnValue({ changeWithInboundId: null, filePath: '' });

        await writer.write(mockData as InboundData);

        expect(getChangeMock).toHaveBeenCalled();
        expect(writeChangeToFolderMock).toHaveBeenCalled();
    });

    it('should enhance existing inbound change content when found', async () => {
        const mockData = {
            inboundId: 'testInboundId',
            timestamp: 1234567890,
            flp: {
                title: 'New Title',
                subTitle: 'New SubTitle',
                icon: 'New Icon'
            }
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
