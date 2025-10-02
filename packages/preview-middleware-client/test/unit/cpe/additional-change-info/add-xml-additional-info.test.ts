import { getAddXMLAdditionalInfo } from '../../../../src/cpe/additional-change-info/add-xml-additional-info';
import * as utilsCore from '../../../../src/utils/core';
import ElementMetadata from 'sap/ui/core/ElementMetadata';
import Element from 'sap/ui/core/Element';
import FlexChange from 'mock/sap/ui/fl/Change';

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
    jest.spyOn(utilsCore, 'getControlById');
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAddXMLAdditionalInfo', () => {
        it('should return templateName for OBJECT_PAGE_CUSTOM_SECTION', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'sections' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(createMockElement('sap.uxap.ObjectPageLayout'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'OBJECT_PAGE_CUSTOM_SECTION' });
        });

        it('should return templateName for CUSTOM_ACTION', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'actions' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(createMockElement('sap.f.DynamicPageTitle'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'CUSTOM_ACTION' });
        });

        it('should return templateName for CUSTOM_ACTION - sap.m.OverflowToolbar', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'content' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(createMockElement('sap.m.OverflowToolbar'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'CUSTOM_ACTION' });
        });

        it('should return templateName for OBJECT_PAGE_HEADER_FIELD - sap.m.FlexBox, sap.uxap.ObjectPageDynamicHeaderContent', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'items' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(
                createMockElementWithParent('sap.m.FlexBox', 'sap.uxap.ObjectPageDynamicHeaderContent')
            );

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'OBJECT_PAGE_HEADER_FIELD' });
        });

        it('should return templateName for OBJECT_PAGE_HEADER_FIELD - sap.m.FlexBox, sap.uxap.ObjectPageLayout', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'items' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(
                createMockElementWithParent('sap.m.FlexBox', 'sap.uxap.ObjectPageLayout')
            );

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'OBJECT_PAGE_HEADER_FIELD' });
        });

        it('should return templateName for OBJECT_PAGE_HEADER_FIELD', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'headerContent' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(createMockElement('sap.uxap.ObjectPageLayout'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'OBJECT_PAGE_HEADER_FIELD' });
        });

        it('should return templateName for V4_MDC_TABLE_COLUMN', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'columns' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(createMockElement('sap.ui.mdc.Table'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'V4_MDC_TABLE_COLUMN' });
        });

        it('should return templateName for GRID_TREE_TABLE_COLUMN - sap.ui.table.Table', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'columns' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(createMockElement('sap.ui.table.Table'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'GRID_TREE_TABLE_COLUMN' });
        });

        it('should return templateName for GRID_TREE_TABLE_COLUMN - sap.ui.table.TreeTable', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'columns' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(createMockElement('sap.ui.table.TreeTable'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'GRID_TREE_TABLE_COLUMN' });
        });

        it('should return templateName for ANALYTICAL_TABLE_COLUMN', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'columns' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(createMockElement('sap.ui.table.AnalyticalTable'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'ANALYTICAL_TABLE_COLUMN' });
        });

        it('should return templateName for TABLE_ACTION', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'actions' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(createMockElement('sap.ui.mdc.Table'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'TABLE_ACTION' });
        });

        it('should return undefined for templateName', () => {
            mockChange.getContent.mockReturnValue({});
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(createMockElement('sap.ui.test.TestControl'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toBeUndefined();
        });

        it('should return undefined if no matching templateName is found', () => {
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(createMockElement('sap.uxap.ObjectPageLayout'));

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toBeUndefined();
        });

        it('should return targetAggregation, viewName and controlType if no matching templateName is found', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'content' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(
                createMockElementWithView('sap.uxap.ObjectPageLayout')
            );

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({
                controlType: 'sap.uxap.ObjectPageLayout',
                targetAggregation: 'content',
                viewName: 'TestView'
            });
        });

        it('should return undefined if control is not found', () => {
            mockChange.getContent.mockReturnValue({ targetAggregation: 'sections' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(undefined);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toBeUndefined();
        });

        it('should return undefined if missing selectorId and targetAggregation', () => {
            mockChange.getSelector.mockReturnValue(undefined);
            mockChange.getContent.mockReturnValue(undefined);
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(undefined);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toBeUndefined();
        });
    });
});
