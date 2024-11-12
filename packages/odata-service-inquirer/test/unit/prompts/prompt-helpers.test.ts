import { initI18nOdataServiceInquirer } from '../../../src/i18n';
import { getDatasourceTypeChoices } from '../../../src/prompts/prompt-helpers';
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

describe('prompt-helpers', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    afterEach(() => {
        // Ensure test isolation
        jest.restoreAllMocks();
    });

    test('getDatasourceTypeChoices', () => {
        expect(getDatasourceTypeChoices()).toMatchInlineSnapshot(`
            [
              {
                "name": "Connect to a SAP System",
                "value": "sapSystem",
              },
              {
                "name": "Connect to an OData Service Url",
                "value": "odataServiceUrl",
              },
              {
                "name": "Use a Local CAP Project",
                "value": "capProject",
              },
              {
                "name": "Upload a Metadata File",
                "value": "metadataFile",
              },
            ]
        `);

        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValueOnce(true);
        expect(getDatasourceTypeChoices({ includeNone: true })).toMatchInlineSnapshot(`
            [
              {
                "name": "None",
                "value": "none",
              },
              {
                "name": "Connect to a SAP System",
                "value": "sapSystem",
              },
              {
                "name": "Connect to an OData Service Url",
                "value": "odataServiceUrl",
              },
              {
                "name": "Use a Local CAP Project",
                "value": "capProject",
              },
              {
                "name": "Upload a Metadata File",
                "value": "metadataFile",
              },
            ]
        `);
    });
});
