import HeadlessGenerator from '../../src/headless';
import yeomanTest from 'yeoman-test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { generatorNamespace } from '../../src/utils';
import CFGen from '@sap-ux/cf-deploy-config-sub-generator';
import type { AppConfig } from '@sap-ux/fiori-app-sub-generator';

/**
 *
 * @param testNameOrJsonOrPath - can be the partial test file name or the actual json as string, or a file path to the config file
 * @param targetDir - override the standard output path
 */
export async function runHeadlessGen(testNameOrJsonOrPath: string, targetDir?: string, opts?: {}): Promise<any> {
    let appConfig;
    const headlessGenPath = join(__dirname, '../../src/headless');

    if (existsSync(testNameOrJsonOrPath)) {
        appConfig = testNameOrJsonOrPath;
    } else {
        const testFilePath = join(__dirname, '/fixtures/headless-configs', `${testNameOrJsonOrPath}-config.json`);
        if (testFilePath) {
            const testConfig = existsSync(testFilePath)
                ? readFileSync(testFilePath, { encoding: 'utf-8' })
                : testNameOrJsonOrPath;
            if (testConfig) {
                appConfig = JSON.parse(testConfig) as AppConfig;
            }
        }
        if (appConfig?.project?.targetFolder) {
            appConfig.project.targetFolder = targetDir;
        }
    }
    opts = Object.assign({}, opts, { appConfig });

    return yeomanTest
        .create(
            HeadlessGenerator,
            {
                resolved: headlessGenPath
            },
            { cwd: targetDir }
        )
        .withOptions(
            Object.assign(
                {
                    'skip-install': true
                },
                opts
            )
        )
        .withGenerators([[CFGen as any, generatorNamespace('gen:test', 'CF')]])
        .run();
}
