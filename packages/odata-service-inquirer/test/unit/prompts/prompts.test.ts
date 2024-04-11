import { initI18nOdataServiceInquirer, t } from '../../../src/i18n';
import { getQuestions } from '../../../src/prompts';
import { DatasourceType } from '../../../src/types';
import * as btpUtils from '@sap-ux/btp-utils';

/**
 * Workaround to for spyOn TypeError: Jest cannot redefine property
 */
jest.mock('@sap-ux/btp-utils', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/btp-utils')
    };
});

describe('getQuestions', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    afterEach(() => {
        // Reset all spys (not mocks)
        // jest.restoreAllMocks() only works when the mock was created with jest.spyOn().
        jest.restoreAllMocks();
    });
    test('getQuestions, no options', async () => {
        // Tests all declaritive values
        expect(await getQuestions()).toMatchInlineSnapshot(`
            [
              {
                "additionalMessages": [Function],
                "choices": [
                  {
                    "name": "Connect to a SAP System",
                    "value": "sap_system",
                  },
                  {
                    "name": "Connect to an OData Service Url",
                    "value": "odata_service_url",
                  },
                  {
                    "name": "Connect to SAP Business Accelerator Hub",
                    "value": "business_hub",
                  },
                  {
                    "name": "Use a Local CAP Project",
                    "value": "cap_project",
                  },
                  {
                    "name": "Upload a Metadata File",
                    "value": "metadata_file",
                  },
                ],
                "default": -1,
                "guiOptions": {
                  "breadcrumb": true,
                },
                "message": "Data source",
                "name": "datasourceType",
                "type": "list",
              },
              {
                "guiOptions": {
                  "breadcrumb": true,
                  "mandatory": true,
                },
                "guiType": "file-browser",
                "message": "Metadata file path",
                "name": "metadata",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "choices": [Function],
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": "CAP Project",
                  "mandatory": true,
                },
                "message": "Choose your CAP project",
                "name": "capProject",
                "type": "list",
                "when": [Function],
              },
              {
                "default": [Function],
                "guiOptions": {
                  "breadcrumb": "CAP Project",
                  "mandatory": true,
                },
                "guiType": "folder-browser",
                "message": "CAP project folder path",
                "name": "capProjectPath",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "choices": [Function],
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": true,
                  "mandatory": true,
                },
                "message": "OData service",
                "name": "capService",
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              {
                "name": "capCliMetadata",
                "when": [Function],
              },
            ]
        `);

        // Test that default is correctly set by options
        expect((await getQuestions({ datasourceType: { default: DatasourceType.cap_project } }))[0]).toMatchObject({
            default: DatasourceType.cap_project
        });
        // Test that additional choices are added by options: 'includeNone'
        expect((await getQuestions({ datasourceType: { includeNone: true } }))[0]).toMatchObject({
            choices: expect.arrayContaining([
                { name: t('prompts.datasourceType.noneName'), value: DatasourceType.none }
            ])
        });
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValueOnce(true);
        // Test that additional choices are added by options: 'includeProjectSpecificDest'
        expect((await getQuestions({ datasourceType: { includeProjectSpecificDest: true } }))[0]).toMatchObject({
            choices: expect.arrayContaining([
                {
                    name: t('prompts.datasourceType.projectSpecificDestChoiceText'),
                    value: DatasourceType.project_specific_destination
                }
            ])
        });
    });
});
