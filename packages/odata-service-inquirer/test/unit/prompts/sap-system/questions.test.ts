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
                "name": "abapOnPrem:systemUsername",
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
                "name": "abapOnPrem:systemPassword",
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
                "name": "abapOnPrem:cliServiceSelection",
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
                "name": "cliCfAbapService",
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
              {
                "name": "abapOnBtp:cliServiceSelection",
                "when": [Function],
              },
            ]
        `);
    });
});
