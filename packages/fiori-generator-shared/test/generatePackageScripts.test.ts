import { generatePackageScripts } from '../src';

describe('package.json task generation', () => {
    test('sap-client is specified, flpAppId is specified', () => {
        expect(
            generatePackageScripts({
                localOnly: false,
                addMock: true,
                sapClient: '100',
                flpAppId: 'testApp-tile'
            })
        ).toMatchInlineSnapshot(`
            Object {
              "start": "fiori run --open \\"test/flpSandbox.html?sap-client=100&sap-ui-xx-viewCache=false#testApp-tile\\"",
              "start-local": "fiori run --config ./ui5-local.yaml --open \\"test/flpSandbox.html?sap-client=100&sap-ui-xx-viewCache=false#testApp-tile\\"",
              "start-mock": "fiori run --config ./ui5-mock.yaml --open \\"test/flpSandbox.html?sap-client=100&sap-ui-xx-viewCache=false#testApp-tile\\"",
              "start-noflp": "fiori run --open \\"index.html?sap-client=100&sap-ui-xx-viewCache=false\\"",
            }
        `);
    });

    test('addMock: true, sap-client not specified', () => {
        expect(generatePackageScripts({ localOnly: false, addMock: true })).toMatchInlineSnapshot(`
            Object {
              "start": "fiori run --open \\"test/flpSandbox.html?sap-ui-xx-viewCache=false\\"",
              "start-local": "fiori run --config ./ui5-local.yaml --open \\"test/flpSandbox.html?sap-ui-xx-viewCache=false\\"",
              "start-mock": "fiori run --config ./ui5-mock.yaml --open \\"test/flpSandbox.html?sap-ui-xx-viewCache=false\\"",
              "start-noflp": "fiori run --open \\"index.html?sap-ui-xx-viewCache=false\\"",
            }
        `);
    });

    test('addMock: false, correct end-user message generated', () => {
        expect(
            generatePackageScripts({
                localOnly: true,
                addMock: false,
                flpAppId: 'testApp-tile',
                localStartFile: 'testLocalStart.html'
            })
        ).toMatchInlineSnapshot(`
            Object {
              "start": "echo \\\\\\"This application was generated with a local metadata file and does not reference a live server. Please add the required server configuration or start this application with mock data using the target: npm run start-mock\\\\\\"",
              "start-local": "fiori run --config ./ui5-local.yaml --open \\"testLocalStart.html?sap-ui-xx-viewCache=false#testApp-tile\\"",
              "start-noflp": "echo \\\\\\"This application was generated with a local metadata file and does not reference a live server. Please add the required server configuration or start this application with mock data using the target: npm run start-mock\\\\\\"",
            }
        `);
    });

    test('addTest: true, should include int-test scripts', () => {
        expect(
            generatePackageScripts({
                localOnly: true,
                addMock: false,
                addTest: true,
                flpAppId: 'testApp-tile',
                localStartFile: 'testLocalStart.html'
            })
        ).toMatchInlineSnapshot(`
            Object {
              "int-test": "fiori run --config ./ui5-mock.yaml --open \\"test/integration/opaTests.qunit.html\\"",
              "start": "echo \\\\\\"This application was generated with a local metadata file and does not reference a live server. Please add the required server configuration or start this application with mock data using the target: npm run start-mock\\\\\\"",
              "start-local": "fiori run --config ./ui5-local.yaml --open \\"testLocalStart.html?sap-ui-xx-viewCache=false#testApp-tile\\"",
              "start-noflp": "echo \\\\\\"This application was generated with a local metadata file and does not reference a live server. Please add the required server configuration or start this application with mock data using the target: npm run start-mock\\\\\\"",
            }
        `);
    });
});
