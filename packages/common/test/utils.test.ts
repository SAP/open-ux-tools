import { getPackageJsonTasks } from '../src/utils';

describe('Test common utils', () => {
    test('Test package json task generation', () => {
        let tasks = getPackageJsonTasks(false, true, '100', 'testApp-tile');
        expect(tasks).toMatchInlineSnapshot(`
            Object {
              "start": "fiori run --open 'test/flpSandbox.html?sap-client=100#testApp-tile'",
              "start-local": "fiori run --config ./ui5-local.yaml --open 'test/flpSandbox.html?sap-client=100#testApp-tile'",
              "start-mock": "fiori run --config ui5-mock.yaml --open 'test/flpSandbox.html?sap-client=100#testApp-tile'",
              "start-noflp": "fiori run --open 'index.html?sap-client=100'",
            }
        `);

        tasks = getPackageJsonTasks(false, true);
        expect(tasks).toMatchInlineSnapshot(`
            Object {
              "start": "fiori run --open 'test/flpSandbox.html'",
              "start-local": "fiori run --config ./ui5-local.yaml --open 'test/flpSandbox.html'",
              "start-mock": "fiori run --config ui5-mock.yaml --open 'test/flpSandbox.html'",
              "start-noflp": "fiori run --open 'index.html'",
            }
        `);

        tasks = getPackageJsonTasks(true, false, undefined, 'testApp-tile', undefined, 'testLocalStart.html');
        expect(tasks).toMatchInlineSnapshot(`
            Object {
              "start": "echo \\\\\\"This application was generated with a local metadata file and does not reference a live server. Please add the required server configuration or start this application with mock data using the target: npm run start-mock\\\\\\"",
              "start-local": "fiori run --config ./ui5-local.yaml --open 'testLocalStart.html#testApp-tile'",
              "start-noflp": "echo \\\\\\"This application was generated with a local metadata file and does not reference a live server. Please add the required server configuration or start this application with mock data using the target: npm run start-mock\\\\\\"",
            }
        `);
    });
});
