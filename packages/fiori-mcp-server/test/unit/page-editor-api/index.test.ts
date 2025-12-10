import { PageTypeV4 } from '@sap/ux-specification/dist/types/src';
import { getTree } from '../../../src/page-editor-api/tree';
import type { PageAnnotations, TreeNode, TreeNodeProperty } from '../../../src/page-editor-api/tree';
import applicationSchema from './test-data/schema/App.json';
import applicationConfig from './test-data/config/App.json';
import listReportSchema from './test-data/schema/ListReport.json';
import listReportConfig from './test-data/config/ListReport.json';
import objectPageSchema from './test-data/schema/ObjectPage.json';
import objectPageConfig from './test-data/config/ObjectPage.json';
import multiViewListReportSchema from './test-data/schema/MultiViewListReport.json';
import multiViewListReportConfig from './test-data/config/MultiViewListReport.json';
import chartListReportSchema from './test-data/schema/ChartListReport.json';
import chartListReportConfig from './test-data/config/ChartListReport.json';
import listReportV2Schema from './test-data/schema/ListReportV2.json';
import listReportV2Config from './test-data/config/ListReportV2.json';
import objectPageV2Schema from './test-data/schema/ObjectPageV2.json';
import objectPageV2Config from './test-data/config/ObjectPageV2.json';
import visualFiltersSchema from './test-data/schema/VisualFilters.json';
import visualFiltersConfig from './test-data/config/VisualFilters.json';
import visualFiltersAnnotations from './test-data/annotations/VisualFilters.json';
import customPageSchema from './test-data/schema/CustomPage.json';
import customPageConfig from './test-data/config/CustomPage.json';

describe('getTree', () => {
    beforeEach(async () => {});

    function cleanupSchema(obj: TreeNode | TreeNodeProperty): void {
        if (obj && typeof obj === 'object' && 'schema' in obj) {
            delete (obj as unknown as { schema?: object }).schema;
            if ('children' in obj) {
                obj.children.forEach(cleanupSchema);
            }
            if ('properties' in obj) {
                obj.properties?.forEach(cleanupSchema);
            }
        }
    }

    test('getTree - Application', async () => {
        const data = getTree(JSON.stringify(applicationSchema), applicationConfig, PageTypeV4.ListReport);
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ListReport page', async () => {
        const data = getTree(JSON.stringify(listReportSchema), listReportConfig, PageTypeV4.ListReport);
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });

    test('getTree - multiview ListReport page', async () => {
        const data = getTree(
            JSON.stringify(multiViewListReportSchema),
            multiViewListReportConfig,
            PageTypeV4.ListReport
        );
        cleanupSchema(data);
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
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ObjectPage page', async () => {
        const data = getTree(JSON.stringify(objectPageSchema), objectPageConfig, PageTypeV4.ObjectPage);
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ListReport page V2', async () => {
        const data = getTree(JSON.stringify(listReportV2Schema), listReportV2Config, PageTypeV4.ListReport);
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ObjectPage page V2', async () => {
        const data = getTree(JSON.stringify(objectPageV2Schema), objectPageV2Config, PageTypeV4.ObjectPage);
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ListReport page Visual Filters', async () => {
        const data = getTree(
            JSON.stringify(visualFiltersSchema),
            visualFiltersConfig,
            PageTypeV4.ListReport,
            visualFiltersAnnotations as PageAnnotations
        );
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });

    test('getTree - CustomPage', async () => {
        const data = getTree(JSON.stringify(customPageSchema), customPageConfig, PageTypeV4.FPMCustomPage);
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });
});
