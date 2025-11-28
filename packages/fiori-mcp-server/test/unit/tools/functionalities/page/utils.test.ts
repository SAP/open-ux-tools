import type { PageDef } from '../../../../../src/tools/functionalities/page/types';
import { generatePageId } from '../../../../../src/tools/functionalities/page/utils';
import { FioriElementsVersion } from '@sap/ux-specification/dist/types/src';

describe('page utils', () => {
    describe('generatePageId', () => {
        const emptyPage: PageDef = {
            pageId: '',
            entitySet: '',
            pageType: ''
        };
        const testCases = [
            {
                name: 'V4 new object page',
                pageData: {
                    ...emptyPage,
                    entitySet: 'Products',
                    pageType: 'ObjectPage'
                },
                parentPage: undefined,
                existingPages: [],
                version: FioriElementsVersion.v4,
                expectedId: 'ProductsObjectPage'
            },
            {
                name: 'V4 new object page - avoid duplication',
                pageData: {
                    ...emptyPage,
                    entitySet: 'Products',
                    pageType: 'ObjectPage'
                },
                parentPage: undefined,
                existingPages: [
                    {
                        ...emptyPage,
                        pageId: 'ProductsObjectPage'
                    }
                ],
                version: FioriElementsVersion.v4,
                expectedId: 'ProductsObjectPage0'
            },
            {
                name: 'V4 new custom page',
                pageData: {
                    ...emptyPage,
                    entitySet: 'Products',
                    pageType: 'FPMCustomPage',
                    viewName: 'my.app.DetailsView'
                },
                parentPage: undefined,
                existingPages: [],
                version: FioriElementsVersion.v4,
                expectedId: 'DetailsViewPage'
            },
            {
                name: 'V4 new object page with context path',
                pageData: {
                    ...emptyPage,
                    entitySet: 'Products',
                    pageType: 'ObjectPage',
                    contextPath: '/Travel/Booking'
                },
                parentPage: undefined,
                existingPages: [],
                version: FioriElementsVersion.v4,
                expectedId: 'Travel_BookingObjectPage'
            },
            {
                name: 'V2 new object page',
                pageData: {
                    ...emptyPage,
                    entitySet: 'Products',
                    pageType: 'ObjectPage'
                },
                parentPage: undefined,
                existingPages: [],
                version: FioriElementsVersion.v2,
                expectedId: 'ObjectPage_Products'
            },
            {
                name: 'V4 new object page - avoid duplication',
                pageData: {
                    ...emptyPage,
                    entitySet: 'Products',
                    pageType: 'ObjectPage'
                },
                parentPage: undefined,
                existingPages: [
                    {
                        ...emptyPage,
                        pageId: 'ObjectPage_Products'
                    }
                ],
                version: FioriElementsVersion.v2,
                expectedId: 'ObjectPage_Products0'
            }
        ];
        test.each(testCases)('$name', async ({ pageData, parentPage, existingPages, version, expectedId }) => {
            const id = generatePageId(pageData, parentPage, existingPages, version);
            expect(id).toEqual(expectedId);
        });
    });
});
