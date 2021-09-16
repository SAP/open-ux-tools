import { FreestyleApp, generate, TemplateType } from '../src';
import { join } from 'path';
import { rmdirSync } from 'fs';
import { testOutputDir, debug } from './common';

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
                }
            }
        }
    ];

    beforeAll(() => {
        rmdirSync(testOutputDir, { recursive: true });
    });

    test.each(configuration)('generates files for template: $name', async ({ name, config }) => {
        const testPath = join(testOutputDir, TEST_NAME, name);
        const fs = await generate(testPath, config);
        if (debug.enabled) fs.commit(() => {});
        expect((fs as any).dump(testPath)).toMatchSnapshot();
    });
});
