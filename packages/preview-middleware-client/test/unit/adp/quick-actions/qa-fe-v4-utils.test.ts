import { getActionsPropertyPath } from '../../../../src/adp/quick-actions/fe-v4/utils';
import type { MacroTable } from '../../../../src/adp/quick-actions/fe-v4/utils';

describe('getActionsPropertyPath', () => {
    let mockTable: MacroTable;
    let mockMetaModel: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockMetaModel = {
            getObject: jest.fn()
        };

        mockTable = {
            metaPath: '',
            contextPath: '',
            getProperty: jest.fn(),
            getModel: jest.fn().mockReturnValue({
                getMetaModel: jest.fn().mockReturnValue(mockMetaModel)
            })
        } as unknown as MacroTable;
    });

    describe('getLineItemAnnotationForTable - default line item annotation', () => {
        test('returns actions path when no Visualizations or PresentationVariant', () => {
            mockTable.metaPath = '/EntitySet/@com.sap.vocabularies.UI.v1.LineItem';
            mockTable.contextPath = '/EntitySet/';
            (mockTable.getProperty as jest.Mock).mockReturnValue('/EntitySet/');

            mockMetaModel.getObject.mockReturnValue({});

            const result = getActionsPropertyPath(mockTable);

            expect(result).toBe('controlConfiguration/@com.sap.vocabularies.UI.v1.LineItem/actions/');
        });
    });

    describe('getLineItemAnnotationForTable - PresentationVariant Annotation', () => {
        test('returns actions path when Visualizations is present', () => {
            mockTable.metaPath = '/EntitySet/@com.sap.vocabularies.UI.v1.PresentationVariant';
            mockTable.contextPath = '/EntitySet/';
            (mockTable.getProperty as jest.Mock).mockReturnValue('/EntitySet/');

            mockMetaModel.getObject.mockReturnValue({
                Visualizations: [
                    {
                        $AnnotationPath: '@com.sap.vocabularies.UI.v1.LineItem'
                    }
                ]
            });

            const result = getActionsPropertyPath(mockTable);

            expect(result).toBe('controlConfiguration/@com.sap.vocabularies.UI.v1.LineItem/actions/');
        });
    });

    describe('getLineItemAnnotationForTable - SelectionPresentationVariantWith PresentationVariant record', () => {
        test('returns actions path when PresentationVariant.Visualizations is present', () => {
            mockTable.metaPath = '/EntitySet/@com.sap.vocabularies.UI.v1.SelectionPresentationVariant';
            mockTable.contextPath = '/EntitySet/';
            (mockTable.getProperty as jest.Mock).mockReturnValue('/EntitySet/');

            mockMetaModel.getObject.mockReturnValue({
                PresentationVariant: {
                    Visualizations: [
                        {
                            $AnnotationPath: '@com.sap.vocabularies.UI.v1.LineItem'
                        }
                    ]
                }
            });

            const result = getActionsPropertyPath(mockTable);

            expect(result).toBe('controlConfiguration/@com.sap.vocabularies.UI.v1.LineItem/actions/');
        });
    });

    describe('getLineItemAnnotationForTable - SelectionPresentation with PresentationVariant with $Path', () => {
        test('returns actions path when PresentationVariant has $Path (metaPath starts with /)', () => {
            mockTable.metaPath = '/EntitySet/@com.sap.vocabularies.UI.v1.SelectionPresentationVariant';
            mockTable.contextPath = '/EntitySet/';
            (mockTable.getProperty as jest.Mock).mockReturnValue('/EntitySet/');

            mockMetaModel.getObject
                .mockReturnValueOnce({
                    PresentationVariant: {
                        $Path: '@com.sap.vocabularies.UI.v1.PresentationVariant'
                    }
                })
                .mockReturnValueOnce({
                    Visualizations: [
                        {
                            $AnnotationPath: '@com.sap.vocabularies.UI.v1.LineItem'
                        }
                    ]
                });

            const result = getActionsPropertyPath(mockTable);

            expect(result).toBe('controlConfiguration/@com.sap.vocabularies.UI.v1.LineItem/actions/');
        });

        test('returns actions path when PresentationVariant has $Path (metaPath does not start with /)', () => {
            mockTable.metaPath = '/EntitySet/@com.sap.vocabularies.UI.v1.SelectionPresentationVariant';
            mockTable.contextPath = '/EntitySet/';
            (mockTable.getProperty as jest.Mock).mockReturnValue('/EntitySet/');

            mockMetaModel.getObject
                .mockReturnValueOnce({
                    PresentationVariant: {
                        $Path: '@com.sap.vocabularies.UI.v1.PresentationVariant'
                    }
                })
                .mockReturnValueOnce({
                    Visualizations: [
                        {
                            $AnnotationPath: '@com.sap.vocabularies.UI.v1.LineItem'
                        }
                    ]
                });

            const result = getActionsPropertyPath(mockTable);

            expect(result).toBe('controlConfiguration/@com.sap.vocabularies.UI.v1.LineItem/actions/');
        });
    });

    describe('with MultiEntity scenario', () => {
        test('returns actions path with navigation path', () => {
            mockTable.metaPath = '/NewEntity/@com.sap.vocabularies.UI.v1.LineItem';
            mockTable.contextPath = '{fullContextPath>}';
            (mockTable.getProperty as jest.Mock).mockReturnValue('/EntitySet/');

            mockMetaModel.getObject.mockReturnValue({
                // No Visualizations, no PresentationVariant
            });

            const result = getActionsPropertyPath(mockTable);

            expect(result).toBe('controlConfiguration//NewEntity/@com.sap.vocabularies.UI.v1.LineItem/actions/');
        });
    });
});
