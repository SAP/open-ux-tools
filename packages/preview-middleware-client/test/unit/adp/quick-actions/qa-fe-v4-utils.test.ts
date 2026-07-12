import UI5Element from 'sap/ui/core/Element';
import { MacroTable } from '../../../../src/utils/fe-v4.js';
import type { QuickActionContext } from '../../../../src/cpe/quick-actions/quick-action-definition.js';

const mockAppComponent = { id: 'app-component' };
const getV4AppComponentMock = jest.fn();

const _feV4Utils = await import('open/ux/preview/client/utils/fe-v4');
jest.unstable_mockModule('open/ux/preview/client/utils/fe-v4', () => ({
    ..._feV4Utils,
    getV4AppComponent: getV4AppComponentMock
}));

const { getPropertyPath, getPageId, getAppDescriptorBase } =
    await import('open/ux/preview/client/adp/quick-actions/fe-v4/utils');

function makeContext(stableId: string | undefined): QuickActionContext {
    return {
        view: {
            getViewData: jest.fn().mockReturnValue(stableId !== undefined ? { stableId } : undefined)
        }
    } as unknown as QuickActionContext;
}

describe('getPageId', () => {
    test('returns last segment of stableId', () => {
        expect(getPageId(makeContext('appId::ListReport::Page'))).toBe('Page');
    });

    test('returns undefined when stableId is missing', () => {
        expect(getPageId(makeContext(undefined))).toBeUndefined();
    });
});

describe('getAppDescriptorBase', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns appComponent and pageId when both are available', () => {
        getV4AppComponentMock.mockReturnValue(mockAppComponent);
        const result = getAppDescriptorBase(makeContext('appId::ListReport'));
        expect(result).toEqual({ appComponent: mockAppComponent, pageId: 'ListReport' });
    });

    test('returns undefined when appComponent is missing', () => {
        getV4AppComponentMock.mockReturnValue(undefined);
        expect(getAppDescriptorBase(makeContext('appId::ListReport'))).toBeUndefined();
    });

    test('returns undefined when pageId cannot be derived', () => {
        getV4AppComponentMock.mockReturnValue(mockAppComponent);
        expect(getAppDescriptorBase(makeContext(undefined))).toBeUndefined();
    });
});

describe('getActionsPropertyPath', () => {
    let mockTable: MacroTable;
    let mdcTable: UI5Element;
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
            }),
            isA: (type: string) => type === 'sap.fe.macros.table.TableAPI'
        } as unknown as MacroTable;
        mdcTable = {
            getParent: jest.fn().mockReturnValue(mockTable)
        } as unknown as UI5Element;
    });

    describe('getLineItemAnnotationForTable - default line item annotation', () => {
        test('returns actions path when no Visualizations or PresentationVariant', () => {
            mockTable.metaPath = '/EntitySet/@com.sap.vocabularies.UI.v1.LineItem';
            mockTable.contextPath = '/EntitySet/';
            (mockTable.getProperty as jest.Mock).mockReturnValue('/EntitySet/');

            mockMetaModel.getObject.mockReturnValue({});

            const result = getPropertyPath(mdcTable);

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

            const result = getPropertyPath(mdcTable);

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

            const result = getPropertyPath(mdcTable);

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

            const result = getPropertyPath(mdcTable);

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

            const result = getPropertyPath(mdcTable);

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

            const result = getPropertyPath(mdcTable);

            expect(result).toBe('controlConfiguration//NewEntity/@com.sap.vocabularies.UI.v1.LineItem/actions/');
        });
    });
});
