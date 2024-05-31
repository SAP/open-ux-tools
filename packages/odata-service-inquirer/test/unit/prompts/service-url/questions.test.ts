import { OdataVersion } from '../../../../src/index';
import { initI18nOdataServiceInquirer } from '../../../../src/i18n';
import { getServiceUrlQuestions } from '../../../../src/prompts/datasources/service-url/questions';
import type { OdataServiceUrlPromptOptions } from '../../../../src/types';

describe('Service URL prompts', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });
    test('getQuestions', async () => {
        let questions = getServiceUrlQuestions();
        expect(questions).toMatchInlineSnapshot(`
            [
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

        questions = getServiceUrlQuestions({ requiredOdataVersion: OdataVersion.v4 } as OdataServiceUrlPromptOptions);
        let serviceUrlQuestion = questions.find((q) => q.name === 'serviceUrl');
        expect(serviceUrlQuestion).toMatchObject({
            guiOptions: {
                breadcrumb: true,
                hint: 'http://<hostname>:<port>/path/to/odata/service/',
                mandatory: true
            },
            message: 'OData V4 service URL',
            name: 'serviceUrl',
            type: 'input',
            validate: expect.any(Function)
        });

        questions = getServiceUrlQuestions({ requiredOdataVersion: OdataVersion.v2 } as OdataServiceUrlPromptOptions);
        serviceUrlQuestion = questions.find((q) => q.name === 'serviceUrl');
        expect(serviceUrlQuestion).toMatchObject({
            guiOptions: {
                breadcrumb: true,
                hint: 'http://<hostname>:<port>/path/to/odata/service/',
                mandatory: true
            },
            message: 'OData V2 service URL',
            name: 'serviceUrl',
            type: 'input',
            validate: expect.any(Function)
        });
    });
});
