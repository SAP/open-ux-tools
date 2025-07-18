import type { FioriElementsApp } from '../src';
import { generate, TemplateType } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import {
    testOutputDir,
    debug,
    feBaseConfig,
    v4TemplateSettings,
    v4Service,
    projectChecks,
    updatePackageJSONDependencyToUseLocalPath,
    applyBaseConfigToFEApp,
    sampleCapService
} from './common';
import type { FEOPSettings } from '../src/types';
import type { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { generateAnnotations } from '@sap-ux/annotation-generator';

const TEST_NAME = 'feopTemplate';
if (debug?.enabled) {
    jest.setTimeout(360000);
}

jest.mock('@sap-ux/annotation-generator', () => ({
    ...jest.requireActual('@sap-ux/annotation-generator'),
    generateAnnotations: jest.fn()
}));

describe(`Fiori Elements template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const feopConfigs: Array<{ name: string; config: FioriElementsApp<FEOPSettings> }> = [
        {
            name: 'fefeop1',
            config: {
                ...Object.assign(feBaseConfig('fefeop1'), {
                    template: {
                        type: TemplateType.FormEntryObjectPage,
                        settings: v4TemplateSettings
                    }
                }),
                service: v4Service
            } as FioriElementsApp<FEOPSettings>
        },
        {
            name: 'fefeop2ts',
            config: {
                ...Object.assign(feBaseConfig('fefeop2ts'), {
                    template: {
                        type: TemplateType.FormEntryObjectPage,
                        settings: v4TemplateSettings
                    }
                }),
                service: v4Service,
                appOptions: {
                    typescript: true
                }
            } as FioriElementsApp<FEOPSettings>
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(feopConfigs)('Generate files for template: $name', async ({ name, config }) => {
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

describe('Should generate annotations correctly for FEOP projects', () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);
    const fs = create(createStorage());

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    test('Should generate annotations for FEOP projects when addAnnotations is enabled, regardless of service availability', async () => {
        const fioriElementsApp = {
            ...applyBaseConfigToFEApp('fefeop1', TemplateType.FormEntryObjectPage),
            appOptions: {
                addAnnotations: true
            }
        };
        await generate(curTestOutPath, fioriElementsApp, fs);
        expect(generateAnnotations).toBeCalledTimes(1);

        // ensure addLineItems is false for feop project
        expect(generateAnnotations).toBeCalledWith(
            fs,
            {
                serviceName: sampleCapService.serviceName,
                appName: fioriElementsApp.package.name,
                project: sampleCapService.projectPath
            },
            {
                entitySetName: v4TemplateSettings?.entityConfig?.mainEntityName,
                annotationFilePath: join('test', 'path', 'fefeop1', 'annotations.cds'),
                addFacets: true,
                addLineItems: false,
                addValueHelps: true
            }
        );
    });

    test('Should generate annotations for FEOP projects when addAnnotations is disabled', async () => {
        const fioriElementsApp = {
            ...applyBaseConfigToFEApp('fefeop1', TemplateType.FormEntryObjectPage),
            appOptions: {
                addAnnotations: false
            }
        };
        await generate(curTestOutPath, fioriElementsApp, fs);
        expect(generateAnnotations).not.toBeCalled();
    });
});
