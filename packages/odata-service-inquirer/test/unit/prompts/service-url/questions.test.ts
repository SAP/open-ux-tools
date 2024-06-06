import { initI18nOdataServiceInquirer } from '../../../../src/i18n';
import { OdataVersion } from '../../../../src/index';
import { getServiceUrlQuestions } from '../../../../src/prompts/datasources/service-url/questions';

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
                  "hint": "https://<hostname>:<port>/path/to/odata/service/",
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
                "name": "serviceUrlPassword",
                "type": "password",
                "validate": [Function],
                "when": [Function],
              },
            ]
        `);

        questions = getServiceUrlQuestions({ serviceUrl: { requiredOdataVersion: OdataVersion.v4 } });
        let serviceUrlQuestion = questions.find((q) => q.name === 'serviceUrl');
        expect(serviceUrlQuestion).toMatchObject({
            guiOptions: {
                breadcrumb: true,
                hint: 'https://<hostname>:<port>/path/to/odata/service/',
                mandatory: true
            },
            message: 'OData V4 service URL',
            name: 'serviceUrl',
            type: 'input',
            validate: expect.any(Function)
        });

        questions = getServiceUrlQuestions({ serviceUrl: { requiredOdataVersion: OdataVersion.v2 } });
        serviceUrlQuestion = questions.find((q) => q.name === 'serviceUrl');
        expect(serviceUrlQuestion).toMatchObject({
            guiOptions: {
                breadcrumb: true,
                hint: 'https://<hostname>:<port>/path/to/odata/service/',
                mandatory: true
            },
            message: 'OData V2 service URL',
            name: 'serviceUrl',
            type: 'input',
            validate: expect.any(Function)
        });
    });
});
