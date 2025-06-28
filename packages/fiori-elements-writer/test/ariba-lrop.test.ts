import type { FioriElementsApp, LROPSettings } from '../src';
import { generate, TemplateType } from '../src';
import { join } from 'path';
import {
    testOutputDir,
    debug,
    feBaseConfig,
    v4TemplateSettings,
    v4Service,
    projectChecks,
    updatePackageJSONDependencyToUseLocalPath
} from './common';

const TEST_NAME = 'aribaLropTemplates';

describe(`Fiori Elements template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);
    const aribaConfig = {
        name: 'ariba_lrop_v4',
        config: {
            ...Object.assign(feBaseConfig('fearibalrop1'), {
                template: {
                    type: TemplateType.AribaListReportObjectPage,
                    settings: v4TemplateSettings
                },
                ui5: {
                    ...feBaseConfig('fearibalrop1'),
                    version: '1.137.0' // ariba template option only available from 1.137.0
                }
            }),
            service: v4Service
        } as FioriElementsApp<LROPSettings>
    };

    test('should generate ariba lrop app', async () => {
        const testPath = join(curTestOutPath, aribaConfig.name);
        const fs = await generate(testPath, aribaConfig.config);
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
            await projectChecks(testPath, aribaConfig.config, debug?.debugFull);
        });
    });
});
