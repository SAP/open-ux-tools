import { ErrorHandler } from '../../src/error-handler/error-handler';
import { getPrompts } from '../../src/index';
import * as prompts from '../../src/prompts';
import LoggerHelper from '../../src/prompts/logger-helper';
import { PromptState } from '../../src/utils';

jest.mock('../../src/prompts', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('../../src/prompts')
}));

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
        expect(answers.odataService.metadata).toBe('metadata contents');

        // Ensure stateful properties are set correctly
        expect(PromptState.isYUI).toBe(true);
        expect(PromptState.odataService).toBe(answers.odataService);
        expect(LoggerHelper.logger).toBeDefined();
        expect(ErrorHandler.guidedAnswersEnabled).toBe(true);
        expect(ErrorHandler.logger).toBeDefined();
    });

    test('getPrompts, i18n is loaded', async () => {
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
                "guiOptions": {
                  "breadcrumb": true,
                  "hint": "http://<hostname>:<port>/path/to/odata/service/",
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
                "name": "password",
                "type": "password",
                "validate": [Function],
                "when": [Function],
              },
            ]
        `);
    });
});
