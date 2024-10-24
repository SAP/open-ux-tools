import { ErrorHandler } from '../../src/error-handler/error-handler';
import { getPrompts } from '../../src/index';
import * as prompts from '../../src/prompts';
import LoggerHelper from '../../src/prompts/logger-helper';
import { PromptState } from '../../src/utils';
import { hostEnvironment, getHostEnvironment } from '@sap-ux/fiori-generator-shared';

jest.mock('../../src/prompts', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('../../src/prompts')
}));

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    getHostEnvironment: jest.fn()
}));

const mockGetHostEnvironment = getHostEnvironment as jest.Mock;

describe('API tests', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    test('getPrompts', async () => {
        jest.spyOn(prompts, 'getQuestions').mockResolvedValue([
            {
                name: 'prompt1',
                validate: () => (PromptState.odataService.metadata = 'metadata contents')
            }
        ]);
        const { prompts: questions, answers } = await getPrompts(undefined, undefined, true, undefined, true);

        expect(questions).toHaveLength(1);
        // execute the validate function as it would be done by inquirer
        (questions[0].validate as Function)();
        expect(answers.metadata).toBe('metadata contents');

        // Ensure stateful properties are set correctly
        expect(PromptState.isYUI).toBe(true);
        expect(PromptState.odataService).toBe(answers);
        expect(LoggerHelper.logger).toBeDefined();
        expect(ErrorHandler.guidedAnswersEnabled).toBe(true);
        expect(ErrorHandler.logger).toBeDefined();
    });

    test('getPrompts, i18n is loaded', async () => {
        mockGetHostEnvironment.mockReturnValueOnce(hostEnvironment.cli);
        const { prompts: questions } = await getPrompts(undefined, undefined, true, undefined, true);

        expect(questions).toMatchInlineSnapshot(`
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
              {
                "choices": [
                  {
                    "name": "ABAP Environment on SAP Business Technology Platform",
                    "value": "abapOnBtp",
                  },
                  {
                    "name": "ABAP On Premise",
                    "value": "abapOnPrem",
                  },
                ],
                "message": "System type",
                "name": "newSystemType",
                "type": "list",
                "when": [Function],
              },
              {
                "guiOptions": {
                  "breadcrumb": true,
                  "hint": "Enter the URL of the SAP System",
                  "mandatory": true,
                },
                "message": "System URL",
                "name": "abapOnPrem:newSystemUrl",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "guiOptions": {
                  "breadcrumb": "SAP Client",
                },
                "message": "SAP client (leave empty for default)",
                "name": "sapClient",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "default": "",
                "guiOptions": {
                  "mandatory": true,
                },
                "message": "Username",
                "name": "abapSystemUsername",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "default": "",
                "guiOptions": {
                  "mandatory": true,
                },
                "guiType": "login",
                "mask": "*",
                "message": "Password",
                "name": "abapSystemPassword",
                "type": "password",
                "validate": [Function],
                "when": [Function],
              },
              {
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": true,
                  "hint": "Entering a system name will save the connection for re-use.",
                  "mandatory": true,
                },
                "message": "System name",
                "name": "abapOnPrem:userSystemName",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "additionalMessages": [Function],
                "choices": [Function],
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": "Service",
                  "mandatory": true,
                },
                "message": [Function],
                "name": "abapOnPrem:serviceSelection",
                "source": [Function],
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              {
                "choices": [
                  {
                    "name": "Discover a Cloud Foundry Service",
                    "value": "cloudFoundry",
                  },
                  {
                    "name": "Upload a Service Key File",
                    "value": "serviceKey",
                  },
                  {
                    "name": "Use Reentrance Ticket",
                    "value": "reentranceTicket",
                  },
                ],
                "message": "ABAP environment definition source",
                "name": "abapOnBtpAuthType",
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              {
                "guiOptions": {
                  "breadcrumb": true,
                  "hint": "Enter the URL of the SAP System",
                  "mandatory": true,
                },
                "message": "System URL",
                "name": "abapOnBtp:newSystemUrl",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "guiOptions": {
                  "hint": "Select a local file that defines the service connection for an ABAP Environment on SAP Business Technology Platform",
                  "mandatory": true,
                },
                "guiType": "file-browser",
                "message": "Service key file path",
                "name": "serviceKey",
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
                },
                "message": "ABAP environment",
                "name": "cloudFoundryAbapSystem",
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              {
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": true,
                  "hint": "Entering a system name will save the connection for re-use.",
                  "mandatory": true,
                },
                "message": "System name",
                "name": "abapOnBtp:userSystemName",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "additionalMessages": [Function],
                "choices": [Function],
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": "Service",
                  "mandatory": true,
                },
                "message": [Function],
                "name": "abapOnBtp:serviceSelection",
                "source": [Function],
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
            ]
        `);
    });
});
