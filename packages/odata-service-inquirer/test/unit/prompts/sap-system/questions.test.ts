import { initI18nOdataServiceInquirer } from '../../../../src/i18n';
import { getNewSystemQuestions } from '../../../../src/prompts/datasources/sap-system/new-system/questions';

describe('questions', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    test('should return expected questions', () => {
        const newSystemQuestions = getNewSystemQuestions();
        expect(newSystemQuestions).toMatchInlineSnapshot(`
            [
              {
                "additionalMessages": [Function],
                "choices": [
                  {
                    "name": "prompts.newSystemType.choiceAbapOnBtp",
                    "value": "abapOnBtp",
                  },
                  {
                    "name": "prompts.newSystemType.choiceAbapOnPrem",
                    "value": "abapOnPrem",
                  },
                ],
                "message": "prompts.newSystemType.message",
                "name": "newSystemType",
                "type": "list",
              },
              {
                "guiOptions": {
                  "breadcrumb": true,
                  "hint": "Enter the URL of the SAP System",
                  "mandatory": true,
                },
                "message": "System URL",
                "name": "systemUrl",
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
                },
                "message": "System name",
                "name": "userSystemName",
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
                "message": "Service name",
                "name": "serviceSelection",
                "source": [Function],
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              {
                "name": "cliServicePromptName",
                "when": [Function],
              },
            ]
        `);
    });
});
