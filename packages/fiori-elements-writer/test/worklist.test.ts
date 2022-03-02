import { FioriElementsApp, generate, TemplateType } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { testOutputDir, debug, v2Service } from './common';
import { WorklistSettings } from '../src/types';

const TEST_NAME = 'worklistTemplate';

describe(`Fiori Elements template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const worklistBaseConfig: FioriElementsApp<WorklistSettings> = {
        app: {
            id: 'fewrk1',
            title: 'App Title',
            description: 'A Fiori application.',
            flpAppId: 'fewrk1-tile',
            sourceTemplate: {
                version: '1.2.3-test',
                id: 'test-fe-template'
            }
        },
        package: {
            name: 'fewrk1',
            description: 'A Fiori application.'
        },
        ui5: {
            version: '1.98',
            descriptorVersion: '1.38.0',
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
            type: TemplateType.Worklist,
            settings: {
                entityConfig: {
                    mainEntity: {
                        entityName: 'Artists'
                    },
                    navigationEntity: {
                        EntitySet: 'Publications',
                        Name: '_Publication',
                        Role: ''
                    }
                }
            }
        },
        service: v2Service
    };

    const configuration: Array<{ name: string; config: FioriElementsApp<WorklistSettings> }> = [
        {
            name: 'worklistV2',
            config: {
                ...worklistBaseConfig,
                service: v2Service
            }
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(curTestOutPath, name);
        const fs = await generate(testPath, config);
        expect((fs as any).dump(testPath)).toMatchSnapshot();

        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug?.enabled) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });
});
