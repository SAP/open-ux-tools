import type { FioriElementsApp } from '../src';
import { generate, TableType, TemplateType } from '../src';
import { join } from 'node:path';
import { removeSync } from 'fs-extra';
import {
    testOutputDir,
    debug,
    v2Service,
    feBaseConfig,
    v2TemplateSettings,
    v4TemplateSettings,
    v4Service,
    projectChecks,
    updatePackageJSONDependencyToUseLocalPath,
    applyBaseConfigToFEApp,
    sampleCapService
} from './common';
import type { WorklistSettings } from '../src/types';
import type { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { generateAnnotations } from '@sap-ux/annotation-generator';

const TEST_NAME = 'worklistTemplate';
if (debug?.enabled) {
    jest.setTimeout(360000);
}

jest.mock('@sap-ux/annotation-generator', () => ({
    ...jest.requireActual('@sap-ux/annotation-generator'),
    generateAnnotations: jest.fn()
}));

describe(`Fiori Elements template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const configuration: Array<{ name: string; config: FioriElementsApp<WorklistSettings> }> = [
        {
            name: 'worklistV2',
            config: {
                ...Object.assign(feBaseConfig('fewrk1'), {
                    template: {
                        type: TemplateType.Worklist,
                        settings: v2TemplateSettings
                    }
                }),
                service: v2Service
            } as FioriElementsApp<WorklistSettings>
        },
        {
            name: 'worklistV2_table_type',
            config: {
                ...Object.assign(feBaseConfig('fewrk1'), {
                    template: {
                        type: TemplateType.Worklist,
                        settings: Object.assign(v2TemplateSettings, { tableType: TableType.TREE })
                    }
                }),
                service: v2Service
            } as FioriElementsApp<WorklistSettings>
        },
        {
            name: 'worklistV4',
            config: {
                ...Object.assign(feBaseConfig('fewrk2'), {
                    template: {
                        type: TemplateType.Worklist,
                        settings: v4TemplateSettings
                    },
                    ui5: {
                        ...feBaseConfig('fewrk2', true),
                        version: '1.99.0'
                    }
                }),
                service: v4Service
            } as FioriElementsApp<WorklistSettings>
        },
        {
            name: 'worklistV4_Add_tests',
            config: {
                ...Object.assign(feBaseConfig('fewrk2'), {
                    template: {
                        type: TemplateType.Worklist,
                        settings: v4TemplateSettings
                    },
                    ui5: {
                        ...feBaseConfig('fewrk2', true),
                        version: '1.99.0'
                    }
                }),
                service: v4Service,
                appOptions: {
                    ...feBaseConfig('fewrk2').appOptions,
                    addTests: true
                }
            } as FioriElementsApp<WorklistSettings>
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(curTestOutPath, name);
        const fs = await generate(testPath, config);
        expect(fs.dump(testPath)).toMatchSnapshot();

        return new Promise(async (resolve) => {
            // write out the files for debugging
            if (debug?.enabled) {
                await updatePackageJSONDependencyToUseLocalPath(testPath, fs);
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        }).then(async () => {
            await projectChecks(testPath, config, debug?.debugFull);
        });
    });
});

describe('Should generate annotations correctly for Worklist projects', () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);
    const fs = create(createStorage());

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    test('Should generate annotations for Worklist projects when service is OData V4 and addAnnotations is enabled', async () => {
        const fioriElementsApp = {
            ...applyBaseConfigToFEApp('worklistV4', TemplateType.Worklist),
            appOptions: {
                addAnnotations: true
            }
        };
        await generate(curTestOutPath, fioriElementsApp, fs);
        expect(generateAnnotations).toHaveBeenCalledTimes(1);

        expect(generateAnnotations).toHaveBeenCalledWith(
            fs,
            {
                serviceName: sampleCapService.serviceName,
                appName: fioriElementsApp.package.name,
                project: sampleCapService.projectPath
            },
            {
                entitySetName: v4TemplateSettings?.entityConfig?.mainEntityName,
                annotationFilePath: join('test', 'path', 'worklistV4', 'annotations.cds'),
                addFacets: true,
                addLineItems: true,
                addValueHelps: true
            }
        );
    });

    test('Should not generate annotations for Worklist projects when service is OData V4 and addAnnotations is disabled', async () => {
        const fioriElementsApp = {
            ...applyBaseConfigToFEApp('worklistV4', TemplateType.Worklist),
            appOptions: {
                addAnnotations: false
            }
        };
        await generate(curTestOutPath, fioriElementsApp, fs);
        expect(generateAnnotations).not.toHaveBeenCalled();
    });

    test('Should not generate annotations for Worklist projects when service is OData V2 and addAnnotations is enabled', async () => {
        const appInfo = applyBaseConfigToFEApp('worklistV2', TemplateType.Worklist);
        const fioriElementsApp = {
            ...appInfo,
            appOptions: {
                addAnnotations: true
            },
            service: {
                ...appInfo.service,
                version: OdataVersion.v2
            }
        };
        fioriElementsApp.service.version = OdataVersion.v2;
        await generate(curTestOutPath, fioriElementsApp, fs);
        expect(generateAnnotations).not.toHaveBeenCalled();
    });
});
