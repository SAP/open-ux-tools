import { initI18nOdataServiceInquirer, t } from '../../../src/i18n';
import { getQuestions } from '../../../src/prompts';
import { DatasourceType } from '../../../src/types';
import * as btpUtils from '@sap-ux/btp-utils';
import { Severity } from '@sap-devx/yeoman-ui-types';
import { ToolsLogger } from '@sap-ux/logger';
import * as fioriGenShared from '@sap-ux/fiori-generator-shared';

/**
 * Workaround to for spyOn TypeError: Jest cannot redefine property
 */
jest.mock('@sap-ux/btp-utils', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/btp-utils')
    };
});

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    getHostEnvironment: jest.fn()
}));

describe('getQuestions', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    afterEach(() => {
        // Ensure test isolation
        jest.restoreAllMocks();
    });
    test('getQuestions', async () => {
        jest.spyOn(fioriGenShared, 'getHostEnvironment').mockReturnValue(fioriGenShared.hostEnvironment.cli);
        // Tests all declaritive values
        expect(await getQuestions()).toMatchInlineSnapshot(`
            [
              {
                "additionalMessages": [Function],
                "choices": [
                  {
                    "name": "Connect to a SAP System",
                    "value": "sapSystem",
                  },
                  {
                    "name": "Connect to an OData Service Url",
                    "value": "odataServiceUrl",
                  },
                  {
                    "name": "Connect to SAP Business Accelerator Hub",
                    "value": "businessHub",
                  },
                  {
                    "name": "Use a Local CAP Project",
                    "value": "capProject",
                  },
                  {
                    "name": "Upload a Metadata File",
                    "value": "metadataFile",
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
                "name": "metadataFilePath",
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
                "name": "capCliStateSetter",
                "when": [Function],
              },
              {
                "guiOptions": {
                  "breadcrumb": true,
                  "hint": "https://<hostname>:<port>/path/to/odata/service/",
                  "mandatory": true,
                },
                "message": "OData service URL",
                "name": "serviceUrl",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "default": false,
                "message": "Do you want to continue generation with the untrusted certificate?",
                "name": "ignoreCertError",
                "type": "confirm",
                "validate": [Function],
                "when": [Function],
              },
              {
                "name": "cliIgnoreCertValidate",
                "when": [Function],
              },
              {
                "guiOptions": {
                  "mandatory": true,
                },
                "message": "Service username",
                "name": "username",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "mandatory": true,
                },
                "guiType": "login",
                "mask": "*",
                "message": "Service password",
                "name": "serviceUrlPassword",
                "type": "password",
                "validate": [Function],
                "when": [Function],
              },
            ]
        `);

        // Test that default is correctly set by options
        expect((await getQuestions({ datasourceType: { default: DatasourceType.capProject } }))[0]).toMatchObject({
            default: DatasourceType.capProject
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
                    value: DatasourceType.projectSpecificDestination
                }
            ])
        });
    });

    test('datasourceTypeQuestion displays and logs not implemented yet message', async () => {
        const logWarnSpy = jest.spyOn(ToolsLogger.prototype, 'warn');
        const datasourceTypeQuestion = (await getQuestions())[0];
        expect(datasourceTypeQuestion.name).toEqual('datasourceType');

        [
            DatasourceType.businessHub,
            DatasourceType.none,
            DatasourceType.projectSpecificDestination,
            DatasourceType.sapSystem
        ].forEach((datasourceType) => {
            const additionalMessages = (datasourceTypeQuestion.additionalMessages as Function)(datasourceType);
            expect(additionalMessages).toMatchObject({
                message: t('prompts.datasourceType.notYetImplementedWarningMessage', { datasourceType }),
                severity: Severity.warning
            });
            expect(logWarnSpy).toHaveBeenCalledWith(
                t('prompts.datasourceType.notYetImplementedWarningMessage', { datasourceType })
            );
        });
    });
});
