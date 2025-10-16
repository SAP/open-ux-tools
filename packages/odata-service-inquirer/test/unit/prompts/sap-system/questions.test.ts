import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { initI18nOdataServiceInquirer } from '../../../../src/i18n';
import { getNewSystemQuestions } from '../../../../src/prompts/datasources/sap-system/new-system/questions';
import type { ConnectedSystem } from '../../../../src/types';
import type { BackendSystem } from '@sap-ux/store';
import * as abapOnBtpQuestions from '../../../../src/prompts/datasources/sap-system/abap-on-btp/questions';
import { isFeatureEnabled } from '@sap-ux/feature-toggle';

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
                "message": "System Type",
                "name": "newSystemType",
                "type": "list",
              },
              {
                "additionalMessages": [Function],
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
                "additionalMessages": [Function],
                "default": "",
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
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
                "additionalMessages": [Function],
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

    test('Should use cached connected systems for new Abap on BTP connections if provided', () => {
        const backendSystemReentrance: BackendSystem = {
            name: 'http://s4hc:1234',
            url: 'http:/s4hc:1234',
            authenticationType: 'reentranceTicket'
        };
        const cachedConnectedSystem: ConnectedSystem = {
            serviceProvider: {
                catalog: {}
            } as unknown as AbapServiceProvider,
            backendSystem: backendSystemReentrance
        };
        const getAbapOnBTPSystemQuestionsSpy = jest.spyOn(abapOnBtpQuestions, 'getAbapOnBTPSystemQuestions');
        getNewSystemQuestions(undefined, cachedConnectedSystem);
        expect(getAbapOnBTPSystemQuestionsSpy).toHaveBeenCalledWith(undefined, cachedConnectedSystem);
    });
});
