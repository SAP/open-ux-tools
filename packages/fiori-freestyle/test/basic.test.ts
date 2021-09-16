import { FreestyleApp, generate, TemplateType } from '../src';
import { join } from 'path';
import { rmdirSync } from 'fs';
import { testOutputDir, debug } from './common';
import { OdataVersion } from '@sap/open-ux-tools-types';

const TEST_NAME = 'Template: Basic';

describe(`Fiori freestyle template: ${TEST_NAME}`, () => {
    const configuration: Array<{ name: string; config: FreestyleApp<unknown> }> = [
        {
            name: 'basic:no_datasource',
            config: {
                app: {
                    id: 'nods1',
                    title: 'App Title',
                    description: 'A Fiori application.'
                },
                package: {
                    name: 'nods1',
                    description: 'A Fiori application.'
                },
                ui5: {
                    version: '1.78.16',
                    descriptorVersion: '1.22.0',
                    ui5Libs: [
                        'sap.f',
                        'sap.m',
                        'sap.suite.ui.generic.template',
                        'sap.ui.comp',
                        'sap.ui.core',
                        'sap.ui.generic.app',
                        'sap.ui.table',
                        'sap.ushell'
                    ],
                    ui5Theme: 'sap_belize',
                    localVersion: '1.86.3'
                },
                template: {
                    type: TemplateType.Basic,
                    settings: {}
                },
                // Add a placeholder middleware, required for local run
                service: {
                    path: '/sap/opu/odata/',
                    url: 'http://localhost',
                    version: OdataVersion.v2
                }
            }
        }
    ];

    /**
     * server:
  customMiddleware:
  - name: fiori-tools-proxy
    afterMiddleware: compression
    configuration:
      ignoreCertError: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
      backend:
      - path: /sap/opu/odata
        url: http://localhost
      ui5:
        path: 
        - /resources
        - /test-resources
        url: https://ui5.sap.com
        version: 1.86.3 # The UI5 version, for instance, 1.78.1. Empty means latest version
  - name: fiori-tools-appreload
    afterMiddleware: compression
    configuration:
     port: 35729
     path: webapp
     */

    beforeAll(() => {
        rmdirSync(testOutputDir, { recursive: true });
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(testOutputDir, TEST_NAME, name);
        const fs = await generate(testPath, config);
        if (debug.enabled) fs.commit(() => {});
        expect((fs as any).dump(testPath)).toMatchSnapshot();
    });
});
