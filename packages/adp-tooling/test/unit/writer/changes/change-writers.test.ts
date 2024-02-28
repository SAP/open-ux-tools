import type { Editor } from 'mem-fs-editor';

import {
    writeAnnotationChange,
    writeChangeToFolder,
    getGenericChange,
    findChangeWithInboundId,
    writeChangeToFile
} from '../../../../src/base/change-utils';
import type {
    AdpProjectData,
    AnnotationsData,
    ComponentUsagesData,
    DataSourceData,
    InboundData,
    NewModelData
} from '../../../../src';
import {
    AnnotationsWriter,
    ComponentUsagesWriter,
    DataSourceWriter,
    InboundWriter,
    NewModelWriter
} from '../../../../src/writer/changes/change-writers';
import { AnnotationFileSelectType, ChangeTypes } from '../../../../src';

jest.mock('../../../../src/base/change-utils', () => ({
    ...jest.requireActual('../../../../src/base/change-utils'),
    writeAnnotationChange: jest.fn(),
    writeChangeToFolder: jest.fn(),
    getGenericChange: jest.fn().mockReturnValue({}),
    findChangeWithInboundId: jest.fn(),
    writeChangeToFile: jest.fn()
}));

const writeAnnotationChangeMock = writeAnnotationChange as jest.Mock;
const getGenericChangeMock = getGenericChange as jest.Mock;
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
            oDataSource: '/sap/opu/odata/source',
            annotationFileSelectOption: AnnotationFileSelectType.ExistingFile,
            annotationFilePath: '/mock/path/to/annotation/file.xml',
            projectData: { namespace: 'apps/mock', layer: 'VENDOR', id: 'mockId' } as AdpProjectData,
            timestamp: Date.now(),
            isInternalUsage: false,
            annotationFileName: 'mockAnnotation.xml'
        };

        const writer = new AnnotationsWriter({} as Editor, mockProjectPath);

        await writer.write(mockData);

        expect(writeAnnotationChangeMock).toHaveBeenCalledWith(mockProjectPath, mockData, expect.any(Object), {});
    });
});

describe('ComponentUsagesWriter', () => {
    const mockData = {
        componentUsageID: 'mockID',
        componentName: 'mockName',
        isLazy: 'true',
        componentSettings: '"key": "value"',
        componentData: '"key": "value"',
        shouldAddComponentLibrary: true,
        componentLibraryReference: 'mockLibrary',
        libraryReferenceIsLazy: 'false',
        timestamp: 1234567890
    };

    let writer: ComponentUsagesWriter;

    beforeEach(() => {
        writer = new ComponentUsagesWriter({} as Editor, mockProjectPath);
        jest.clearAllMocks();
    });

    it('should write component usages and library reference changes when required', async () => {
        await writer.write(mockData as ComponentUsagesData);

        expect(getGenericChangeMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ componentUsages: expect.anything() }),
            ChangeTypes.ADD_COMPONENT_USAGES
        );

        expect(getGenericChangeMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ libraries: { mockLibrary: { lazy: false } } }),
            ChangeTypes.ADD_COMPONENT_USAGE_LIBRARY_REFERENCE
        );

        expect(writeChangeToFolderMock).toHaveBeenCalledTimes(2);
    });

    it('should only write component usages changes when library reference is not required', async () => {
        mockData.shouldAddComponentLibrary = false;

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
            oDataServiceName: 'ODataService',
            oDataServiceURI: '/sap/opu/odata/custom',
            oDataVersion: '4.0',
            oDataServiceModelName: 'ODataModel',
            oDataServiceModelSettings: '"someSetting": "someValue"',
            addAnnotationMode: true,
            oDataAnnotationDataSourceName: 'ODataAnnotations',
            oDataAnnotationDataSourceURI: 'some/path/annotations.xml',
            oDataAnnotationSettings: '"anotherSetting": "anotherValue"',
            timestamp: 1234567890
        };

        await writer.write(mockData);

        expect(getGenericChangeMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.any(Object),
            ChangeTypes.ADD_NEW_MODEL
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
        oDataSource: 'CustomOData',
        oDataSourceURI: '/sap/opu/odata/custom',
        oDataAnnotationSourceURI: '',
        maxAge: 60,
        projectData: {} as AdpProjectData,
        timestamp: 1234567890,
        dataSourcesDictionary: {
            CustomODataOData1: 'DataSource1'
        }
    };

    let writer: DataSourceWriter;

    beforeEach(() => {
        writer = new DataSourceWriter({} as Editor, mockProjectPath);
        jest.clearAllMocks();
    });

    it('should write data source change with provided data', async () => {
        await writer.write(mockData as unknown as DataSourceData);

        expect(getGenericChangeMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                dataSourceId: mockData.oDataSource,
                entityPropertyChange: expect.arrayContaining([
                    expect.objectContaining({
                        propertyPath: 'uri',
                        operation: 'UPDATE',
                        propertyValue: mockData.oDataSourceURI
                    }),
                    expect.objectContaining({
                        propertyPath: 'settings/maxAge',
                        operation: 'UPSERT',
                        propertyValue: mockData.maxAge
                    })
                ])
            }),
            expect.anything()
        );

        expect(writeChangeToFolder).toHaveBeenCalledWith(
            mockProjectPath,
            expect.any(Object),
            `id_${mockData.timestamp}_changeDataSource.change`,
            {},
            'manifest'
        );
    });

    it('should add annotation change if oDataAnnotationSourceURI is provided', async () => {
        mockData.oDataAnnotationSourceURI = 'some/path/annotations';

        await writer.write(mockData);

        expect(getGenericChange).toHaveBeenCalledTimes(2);
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
            title: 'Test Title',
            subTitle: 'Test SubTitle',
            icon: 'Test Icon',
            timestamp: 1234567890
        };

        findChangeWithInboundIdMock.mockReturnValue({ changeWithInboundId: null, filePath: '' });

        await writer.write(mockData as InboundData);

        expect(getGenericChangeMock).toHaveBeenCalled();
        expect(writeChangeToFolderMock).toHaveBeenCalled();
    });

    it('should enhance existing inbound change content when found', async () => {
        const mockData = {
            inboundId: 'testInboundId',
            title: 'New Title',
            subTitle: 'New SubTitle',
            icon: 'New Icon',
            timestamp: 1234567890
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
