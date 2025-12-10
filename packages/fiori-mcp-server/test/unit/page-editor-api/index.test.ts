import { getTree } from '../../../src/page-editor-api/tree';
import type { TreeNode, TreeNodeProperty } from '../../../src/page-editor-api/tree';
import { join } from 'path';
import { createApplicationAccess } from '@sap-ux/project-access';
import type { ApplicationAccess } from '@sap-ux/project-access';
import { ApplicationModel } from '@sap/ux-specification/dist/types/src/parser';

const appPathLropV2 = join(__dirname, '../../test-data/original/lrop-v2');
const appPathLropV4 = join(__dirname, '../../test-data/original/lrop');

describe('getTree', () => {
    beforeEach(async () => {});

    const applications: { [key: string]: ApplicationAccess } = {};

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

    async function loadAppModel(path: string): Promise<ApplicationModel> {
        const moduleName = '@sap/ux-specification';
        // Workaround loading issue with '@sap-ux/odata-annotation-core-types'
        jest.mock(
            '@sap-ux/odata-annotation-core-types',
            () => ({
                DiagnosticSeverity: {}
            }),
            { virtual: true }
        );
        const specification = await import(moduleName);
        const result = await specification.readApp({
            app: applications[path] ?? path
        });
        return result.applicationModel;
    }

    beforeAll(async () => {
        applications[appPathLropV2] = await createApplicationAccess(appPathLropV2);
        applications[appPathLropV4] = await createApplicationAccess(appPathLropV4);
    });

    test('getTree - Application V4', async () => {
        const applicationModel = await loadAppModel(appPathLropV4);
        const data = getTree(applicationModel.model);
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ListReport V4', async () => {
        const applicationModel = await loadAppModel(appPathLropV4);
        const data = getTree(applicationModel.pages['TravelList'].model);
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ObjectPage V4', async () => {
        const applicationModel = await loadAppModel(appPathLropV4);
        const data = getTree(applicationModel.pages['TravelObjectPage'].model);
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });

    test('getTree - Application V2', async () => {
        const applicationModel = await loadAppModel(appPathLropV2);
        const data = getTree(applicationModel.model);
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ListReport V2', async () => {
        const applicationModel = await loadAppModel(appPathLropV2);
        const data = getTree(applicationModel.pages['ListReport_SEPMRA_C_PD_Product'].model);
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });

    test('getTree - ObjectPage V2', async () => {
        const applicationModel = await loadAppModel(appPathLropV2);
        const data = getTree(applicationModel.pages['ObjectPage_SEPMRA_C_PD_Product'].model);
        cleanupSchema(data);
        expect(data).toMatchSnapshot();
    });
});
