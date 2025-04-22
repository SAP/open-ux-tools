import { getAddXMLAdditionalInfo } from '../../../../src/cpe/additional-change-info/add-xml-additional-info';
import * as utilsCore from '../../../../src/utils/core';
import ElementMetadata from 'sap/ui/core/ElementMetadata';
import Element from 'sap/ui/core/Element';
import FlexChange from 'sap/ui/fl/Change';

describe('add-xml-additional-info.ts', () => {
    const mockChange = {
        getSelector: jest.fn(),
        getContent: jest.fn()
    } as unknown as FlexChange<any>;
    jest.spyOn(utilsCore, 'getControlById');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAddXMLAdditionalInfo', () => {
        it('should return templateName for OBJECT_PAGE_CUSTOM_SECTION', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'sections' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getMetadata: () =>
                    ({
                        getName: () => 'sap.uxap.ObjectPageLayout'
                    } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'OBJECT_PAGE_CUSTOM_SECTION' });
        });

        it('should return templateName for CUSTOM_ACTION', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'actions' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getMetadata: () => ({
                    getName: () => 'sap.f.DynamicPageTitle'
                } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'CUSTOM_ACTION' });
        });

        it('should return templateName for CUSTOM_ACTION - sap.m.OverflowToolbar', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'content' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getMetadata: () => ({
                    getName: () => 'sap.m.OverflowToolbar'
                } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'CUSTOM_ACTION' });
        });

        it('should return templateName for OBJECT_PAGE_HEADER_FIELD - sap.m.FlexBox, sap.uxap.ObjectPageDynamicHeaderContent', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'items' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getParent: () => ({
                    getMetadata: () => ({
                         getName: () => 'sap.uxap.ObjectPageDynamicHeaderContent'
                    })
                }),
                
                getMetadata: () => ({
                    getName: () => 'sap.m.FlexBox'
                } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'OBJECT_PAGE_HEADER_FIELD' });
        });
        
        it('should return templateName for OBJECT_PAGE_HEADER_FIELD - sap.m.FlexBox, sap.uxap.ObjectPageLayout', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'items' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getParent: () => ({
                    getMetadata: () => ({
                         getName: () => 'sap.uxap.ObjectPageLayout'
                    })
                }),
                
                getMetadata: () => ({
                    getName: () => 'sap.m.FlexBox'
                } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'OBJECT_PAGE_HEADER_FIELD' });
        });

        it('should return templateName for OBJECT_PAGE_HEADER_FIELD', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'headerContent' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getMetadata: () => ({
                    getName: () => 'sap.uxap.ObjectPageLayout'
                } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'OBJECT_PAGE_HEADER_FIELD' });
        });

        it('should return templateName for V4_MDC_TABLE_COLUMN', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'columns' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getMetadata: () => ({
                    getName: () => 'sap.ui.mdc.Table'
                } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'V4_MDC_TABLE_COLUMN' });
        });

        it('should return templateName for GRID_TREE_TABLE_COLUMN - sap.ui.table.Table', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'columns' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getMetadata: () => ({
                    getName: () => 'sap.ui.table.Table'
                } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'GRID_TREE_TABLE_COLUMN' });
        });

        it('should return templateName for GRID_TREE_TABLE_COLUMN - sap.ui.table.TreeTable', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'columns' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getMetadata: () => ({
                    getName: () => 'sap.ui.table.TreeTable'
                } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'GRID_TREE_TABLE_COLUMN' });
        });

        it('should return templateName for ANALYTICAL_TABLE_COLUMN', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'columns' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getMetadata: () => ({
                    getName: () => 'sap.ui.table.AnalyticalTable'
                } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'ANALYTICAL_TABLE_COLUMN' });
        });

        it('should return templateName for TABLE_ACTION', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'actions' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getMetadata: () => ({
                    getName: () => 'sap.ui.mdc.Table'
                } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toEqual({ templateName: 'TABLE_ACTION' });
        });

        it('should return undefined for templateName', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'columns' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getMetadata: () => ({
                    getName: () => 'sap.ui.test.TestControl'
                } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toBeUndefined();
        });

        it('should return undefined if no matching templateName is found', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'unknownAggregation' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue({
                getMetadata: () => ({
                    getName: () => 'sap.uxap.ObjectPageLayout'
                } as unknown as ElementMetadata)
            } as Element);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toBeUndefined();
        });

        it('should return undefined if control is not found', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue({ id: 'mockSelectorId' });
            (mockChange.getContent as jest.Mock).mockReturnValue({ targetAggregation: 'sections' });
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(undefined);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toBeUndefined();
        });

        it('should return undefined if missing selectorId and targetAggregation', () => {
            (mockChange.getSelector as jest.Mock).mockReturnValue(undefined);
            (mockChange.getContent as jest.Mock).mockReturnValue(undefined);
            jest.spyOn(utilsCore, 'getControlById').mockReturnValue(undefined);

            const result = getAddXMLAdditionalInfo(mockChange);

            expect(result).toBeUndefined();
        });
    });
});
