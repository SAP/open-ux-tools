import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppConfig } from '@sap-ux/fiori-generator-shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use dynamic imports to allow jest.unstable_mockModule to take effect
const { default: HeadlessGenerator } = await import('../../src/headless');
const { default: yeomanTest } = await import('yeoman-test');
const { generatorNamespace } = await import('../../src/utils');
const { default: CFGen } = await import('@sap-ux/cf-deploy-config-sub-generator');
const { default: ABAPGen } = await import('@sap-ux/abap-deploy-config-sub-generator');
const { DeployTarget } = await import('@sap-ux/fiori-generator-shared');

/**
 * Runs the headless generator for deployment sub generators.
 *
 * @param testNameOrJsonOrPath - can be the partial test file name or the actual json as string, or a file path to the config file
 * @param target - the deploy target i.e ABAP or CF
 * @param targetDir - override the standard output path
 * @param projectName
 * @param opts - additional options
 */
export async function runHeadlessGen(
    testNameOrJsonOrPath: string,
    target: DeployTarget,
    targetDir?: string,
    projectName?: string,
    opts?: {}
): Promise<any> {
    let appConfig;
    const headlessGenPath = join(__dirname, '../../src/headless');

    if (existsSync(testNameOrJsonOrPath)) {
        appConfig = testNameOrJsonOrPath;
    } else {
        const testFilePath = join(
            __dirname,
            '/fixtures/headless-configs',
            target === DeployTarget.CF ? 'cf' : 'abap',
            `${testNameOrJsonOrPath}-config.json`
        );
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
        if (appConfig && projectName) {
            appConfig.project = {
                ...appConfig.project,
                name: projectName
            };
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
        .withGenerators([
            [CFGen as any, generatorNamespace('gen:test', 'cf')],
            [ABAPGen as any, generatorNamespace('gen:test', 'abap')]
        ])
        .run();
}
