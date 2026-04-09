import { jest } from '@jest/globals';

let mockIsAppStudio = false;
const actualBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils,
    isAppStudio: jest.fn().mockImplementation(() => mockIsAppStudio)
}));

const { initI18nOdataServiceInquirer } = await import('../../../src/i18n');
const { getDatasourceTypeChoices } = await import('../../../src/prompts/prompt-helpers');

describe('prompt-helpers', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    afterEach(() => {
        // Ensure test isolation
        jest.restoreAllMocks();
        mockIsAppStudio = false;
    });

    test('getDatasourceTypeChoices', () => {
        expect(getDatasourceTypeChoices()).toMatchInlineSnapshot(`
            [
              {
                "name": "Connect to a System",
                "value": "sapSystem",
              },
              {
                "name": "Connect to an OData Service",
                "value": "odataServiceUrl",
              },
              {
                "name": "Use a Local CAP Project",
                "value": "capProject",
              },
              {
                "name": "Upload a Metadata Document",
                "value": "metadataFile",
              },
            ]
        `);

        mockIsAppStudio = true;
        expect(getDatasourceTypeChoices({ includeNone: true })).toMatchInlineSnapshot(`
            [
              {
                "name": "None",
                "value": "none",
              },
              {
                "name": "Connect to a System",
                "value": "sapSystem",
              },
              {
                "name": "Connect to an OData Service",
                "value": "odataServiceUrl",
              },
              {
                "name": "Use a Local CAP Project",
                "value": "capProject",
              },
              {
                "name": "Upload a Metadata Document",
                "value": "metadataFile",
              },
            ]
        `);
    });
});
