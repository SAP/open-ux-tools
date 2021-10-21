import { getPackageJsonTasks } from '../src/packageConfig';

describe('Test common utils', () => {
    describe('package.json task generation', () => {
        test('sap-client is specified, flpAppId is specified', () => {
            expect(
                getPackageJsonTasks({
                    localOnly: false,
                    addMock: true,
                    sapClient: '100',
                    flpAppId: 'testApp-tile'
                })
            ).toMatchInlineSnapshot(`
            Object {
              "start": "fiori run --open 'test/flpSandbox.html?sap-client=100#testApp-tile'",
              "start-local": "fiori run --config ./ui5-local.yaml --open 'test/flpSandbox.html?sap-client=100#testApp-tile'",
              "start-mock": "fiori run --config ./ui5-mock.yaml --open 'test/flpSandbox.html?sap-client=100#testApp-tile'",
              "start-noflp": "fiori run --open 'index.html?sap-client=100'",
            }
        `);
        });

        test('addMock: true, sap-client not specified', () => {
            expect(getPackageJsonTasks({ localOnly: false, addMock: true })).toMatchInlineSnapshot(`
            Object {
              "start": "fiori run --open 'test/flpSandbox.html'",
              "start-local": "fiori run --config ./ui5-local.yaml --open 'test/flpSandbox.html'",
              "start-mock": "fiori run --config ./ui5-mock.yaml --open 'test/flpSandbox.html'",
              "start-noflp": "fiori run --open 'index.html'",
            }
        `);
        });

        test('addMock: false, correct end-user message generated', () => {
            expect(
                getPackageJsonTasks({
                    localOnly: true,
                    addMock: false,
                    flpAppId: 'testApp-tile',
                    localStartFile: 'testLocalStart.html'
                })
            ).toMatchInlineSnapshot(`
            Object {
              "start": "echo \\\\\\"This application was generated with a local metadata file and does not reference a live server. Please add the required server configuration or start this application with mock data using the target: npm run start-mock\\\\\\"",
              "start-local": "fiori run --config ./ui5-local.yaml --open 'testLocalStart.html#testApp-tile'",
              "start-noflp": "echo \\\\\\"This application was generated with a local metadata file and does not reference a live server. Please add the required server configuration or start this application with mock data using the target: npm run start-mock\\\\\\"",
            }
        `);
        });
    });
});
