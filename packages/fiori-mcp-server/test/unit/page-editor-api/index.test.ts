import { PageTypeV4 } from '@sap/ux-specification/dist/types/src';
import { getTree } from '../../../src/page-editor-api/parser';
import type { PageAnnotations } from '../../../src/page-editor-api/parser';
import applicationSchema from './data/schema/App.json';
import applicationConfig from './data/config/App.json';
import listReportSchema from './data/schema/ListReport.json';
import listReportConfig from './data/config/ListReport.json';
import objectPageSchema from './data/schema/ObjectPage.json';
import objectPageConfig from './data/config/ObjectPage.json';
import multiViewListReportSchema from './data/schema/MultiViewListReport.json';
import multiViewListReportConfig from './data/config/MultiViewListReport.json';
import chartListReportSchema from './data/schema/ChartListReport.json';
import chartListReportConfig from './data/config/ChartListReport.json';
import listReportV2Schema from './data/schema/ListReportV2.json';
import listReportV2Config from './data/config/ListReportV2.json';
import objectPageV2Schema from './data/schema/ObjectPageV2.json';
import objectPageV2Config from './data/config/ObjectPageV2.json';
import visualFiltersSchema from './data/schema/VisualFilters.json';
import visualFiltersConfig from './data/config/VisualFilters.json';
import visualFiltersAnnotations from './data/annotations/VisualFilters.json';
import customPageSchema from './data/schema/CustomPage.json';
import customPageConfig from './data/config/CustomPage.json';

describe('getTree', () => {
    beforeEach(async () => {});

    test('getTree - Application', async () => {
        const data = getTree(JSON.stringify(applicationSchema), applicationConfig, PageTypeV4.ListReport);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ListReport page', async () => {
        const data = getTree(JSON.stringify(listReportSchema), listReportConfig, PageTypeV4.ListReport);
        expect(data).toMatchSnapshot();
    });

    test('getTree - multiview ListReport page', async () => {
        const data = getTree(
            JSON.stringify(multiViewListReportSchema),
            multiViewListReportConfig,
            PageTypeV4.ListReport
        );
        expect(data).toMatchSnapshot();
    });

    test('getTree - chart ListReport page', async () => {
        const data = getTree(JSON.stringify(chartListReportSchema), chartListReportConfig, PageTypeV4.ListReport, {
            dynamicNodes: {},
            nodes: [],
            dialogsContext: {
                analyticalChartSupport: {
                    creationEnabled: true,
                    creationTooltip: 'Add chart',
                    addToMultiViewEnabled: true,
                    deletionEnabled: true
                }
            }
        });
        expect(data).toMatchSnapshot();
    });

    test('getTree - ObjectPage page', async () => {
        const data = getTree(JSON.stringify(objectPageSchema), objectPageConfig, PageTypeV4.ObjectPage);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ListReport page V2', async () => {
        const data = getTree(JSON.stringify(listReportV2Schema), listReportV2Config, PageTypeV4.ListReport);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ObjectPage page V2', async () => {
        const data = getTree(JSON.stringify(objectPageV2Schema), objectPageV2Config, PageTypeV4.ObjectPage);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ListReport page Visual Filters', async () => {
        const data = getTree(
            JSON.stringify(visualFiltersSchema),
            visualFiltersConfig,
            PageTypeV4.ListReport,
            visualFiltersAnnotations as PageAnnotations
        );
        expect(data).toMatchSnapshot();
    });

    test('getTree - CustomPage', async () => {
        const data = getTree(JSON.stringify(customPageSchema), customPageConfig, PageTypeV4.FPMCustomPage);
        expect(data).toMatchSnapshot();
    });
});
