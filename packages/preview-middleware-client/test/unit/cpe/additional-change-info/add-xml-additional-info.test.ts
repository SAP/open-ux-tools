import ElementMetadata from 'sap/ui/core/ElementMetadata';
import Element from 'sap/ui/core/Element';
import FlexChange from 'mock/sap/ui/fl/Change';

const getControlBySelectorMock = jest.fn();
const findViewByControlMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/utils/core', () => ({
    getControlById: jest.fn(),
    getControlBySelector: getControlBySelectorMock,
    getComponent: jest.fn(),
    isManagedObject: jest.fn(),
    isA: jest.fn(),
    hasParent: jest.fn(),
    findViewByControl: findViewByControlMock,
    findNestedElements: jest.fn()
}));

const { getAddXMLAdditionalInfo } = await import(
    'open/ux/preview/client/cpe/additional-change-info/add-xml-additional-info'
);

// Helper function to create mock elements with isA method
function createMockElement(metadataName: string): Element {
    return {
        getMetadata: () =>
            ({
                getName: () => metadataName
            } as unknown as ElementMetadata),
        isA: jest.fn(() => false)
    } as unknown as Element;
}

// Helper function to create mock elements with parent and isA method
function createMockElementWithParent(metadataName: string, parentMetadataName: string): Element {
    return {
        getParent: () => ({
            getMetadata: () => ({
                getName: () => parentMetadataName
            }),
            isA: jest.fn(() => false)
        }),
        getMetadata: () =>
            ({
                getName: () => metadataName
            } as unknown as ElementMetadata),
        isA: jest.fn(() => false)
    } as unknown as Element;
}

// Helper function to create mock elements with a view in the parent chain
function createMockElementWithView(metadataName: string): Element {
    const mockView = {
        getMetadata: () => ({
            getName: () => 'sap.ui.core.mvc.View'
        }),
        isA: jest.fn((type: string) => type === 'sap.ui.core.mvc.View'),
        getViewName: jest.fn(() => 'TestView')
    };

    return {
        getParent: () => mockView,
        getMetadata: () =>
            ({
                getName: () => metadataName
            } as unknown as ElementMetadata),
        isA: jest.fn(() => false)
    } as unknown as Element;
}

describe('add-xml-additional-info.ts', () => {
    const mockChange = new FlexChange({
        selector: { id: 'mockSelectorId', idIsLocal: false },
        changeType: 'testType',
        layer: 'CUSTOMER_BASE'
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAddXMLAdditionalInfo', () => {
        it('should return templateName for OBJECT_PAGE_CUSTOM_SECTION', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'sections' });
            getControlBySelectorMock.mockReturnValue(createMockElement('sap.uxap.ObjectPageLayout'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'OBJECT_PAGE_CUSTOM_SECTION' });
        });

        it('should return templateName for CUSTOM_ACTION', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'actions' });
            getControlBySelectorMock.mockReturnValue(createMockElement('sap.f.DynamicPageTitle'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'CUSTOM_ACTION' });
        });

        it('should return templateName for CUSTOM_ACTION - sap.m.OverflowToolbar', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'content' });
            getControlBySelectorMock.mockReturnValue(createMockElement('sap.m.OverflowToolbar'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'CUSTOM_ACTION' });
        });

        it('should return templateName for OBJECT_PAGE_HEADER_FIELD - sap.m.FlexBox, sap.uxap.ObjectPageDynamicHeaderContent', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'items' });
            getControlBySelectorMock.mockReturnValue(
                createMockElementWithParent('sap.m.FlexBox', 'sap.uxap.ObjectPageDynamicHeaderContent')
            );

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'OBJECT_PAGE_HEADER_FIELD' });
        });

        it('should return templateName for OBJECT_PAGE_HEADER_FIELD - sap.m.FlexBox, sap.uxap.ObjectPageLayout', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'items' });
            getControlBySelectorMock.mockReturnValue(
                createMockElementWithParent('sap.m.FlexBox', 'sap.uxap.ObjectPageLayout')
            );

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'OBJECT_PAGE_HEADER_FIELD' });
        });

        it('should return templateName for OBJECT_PAGE_HEADER_FIELD', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'headerContent' });
            getControlBySelectorMock.mockReturnValue(createMockElement('sap.uxap.ObjectPageLayout'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'OBJECT_PAGE_HEADER_FIELD' });
        });

        it('should return templateName for V4_MDC_TABLE_COLUMN', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'columns' });
            getControlBySelectorMock.mockReturnValue(createMockElement('sap.ui.mdc.Table'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'V4_MDC_TABLE_COLUMN' });
        });

        it('should return templateName for GRID_TREE_TABLE_COLUMN - sap.ui.table.Table', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'columns' });
            getControlBySelectorMock.mockReturnValue(createMockElement('sap.ui.table.Table'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'GRID_TREE_TABLE_COLUMN' });
        });

        it('should return templateName for GRID_TREE_TABLE_COLUMN - sap.ui.table.TreeTable', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'columns' });
            getControlBySelectorMock.mockReturnValue(createMockElement('sap.ui.table.TreeTable'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'GRID_TREE_TABLE_COLUMN' });
        });

        it('should return templateName for ANALYTICAL_TABLE_COLUMN', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'columns' });
            getControlBySelectorMock.mockReturnValue(createMockElement('sap.ui.table.AnalyticalTable'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'ANALYTICAL_TABLE_COLUMN' });
        });

        it('should return templateName for TABLE_ACTION', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'actions' });
            getControlBySelectorMock.mockReturnValue(createMockElement('sap.ui.mdc.Table'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'TABLE_ACTION' });
        });

        it('should return undefined for templateName', () => {
            mockChange.getContent.mockReturnValue({});
            getControlBySelectorMock.mockReturnValue(createMockElement('sap.ui.test.TestControl'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toBeUndefined();
        });

        it('should return undefined if no matching templateName is found', () => {
            getControlBySelectorMock.mockReturnValue(createMockElement('sap.uxap.ObjectPageLayout'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toBeUndefined();
        });

        it('should return targetAggregation, viewName and controlType if no matching templateName is found', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'content' });
            getControlBySelectorMock.mockReturnValue(
                createMockElementWithView('sap.uxap.ObjectPageLayout')
            );
            findViewByControlMock.mockReturnValue({ getViewName: () => 'TestView' });

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({
                controlType: 'sap.uxap.ObjectPageLayout',
                targetAggregation: 'content',
                viewName: 'TestView'
            });
        });

        it('should return undefined if control is not found', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'sections' });
            getControlBySelectorMock.mockReturnValue(undefined);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toBeUndefined();
        });

        it('should return undefined if missing selectorId and targetAggregation', () => {
            mockChange.getSelector.mockReturnValue(undefined);
            mockChange.getContent.mockReturnValue(undefined);
            getControlBySelectorMock.mockReturnValue(undefined);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toBeUndefined();
        });
    });
});
