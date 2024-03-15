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
    test('getQuestions, no options', () => {
        // Tests all declaritive values
        expect(getQuestions()).toMatchInlineSnapshot(`
            [
              {
                "additionalMessages": [Function],
                "choices": [
                  {
                    "name": "Connect to a SAP System",
                    "value": "SAP_SYSTEM",
                  },
                  {
                    "name": "Connect to an OData Service Url",
                    "value": "ODATA_SERVICE_URL",
                  },
                  {
                    "name": "Connect to SAP Business Accelerator Hub",
                    "value": "BUSINESS_HUB",
                  },
                  {
                    "name": "Use a Local CAP Project",
                    "value": "CAP_PROJECT",
                  },
                  {
                    "name": "Upload a Metadata File",
                    "value": "METADATA_FILE",
                  },
                ],
                "default": "SAP_SYSTEM",
                "guiOptions": {
                  "breadcrumb": true,
                },
                "message": "Data source",
                "name": "datasourceType",
                "type": "list",
              },
            ]
        `);

        expect(getQuestions({ datasourceType: { default: DatasourceType.CAP_PROJECT } })).toMatchObject([
            { default: DatasourceType.CAP_PROJECT }
        ]);
        expect(getQuestions({ datasourceType: { includeNone: true } })).toMatchObject([
            {
                choices: expect.arrayContaining([
                    { name: t('prompts.datasourceType.noneName'), value: DatasourceType.NONE }
                ])
            }
        ]);
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValueOnce(true);
        expect(getQuestions({ datasourceType: { includeProjectSpecificDest: true } })).toMatchObject([
            {
                choices: expect.arrayContaining([
                    {
                        name: t('prompts.datasourceType.projectSpecificDestChoiceText'),
                        value: DatasourceType.PROJECT_SPECIFIC_DESTINATION
                    }
                ])
            }
        ]);
    });
});
