import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import {
    type Package,
    findCapProjectRoot,
    FileName,
    checkCdsUi5PluginEnabled,
    hasDependency
} from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';
import { isLowerThanMinimalVersion } from '../common/package-json';

const packageName = {
    WDIO_QUNIT_SERVICE: 'wdio-qunit-service',
    KARMA_UI5: 'karma-ui5',
    UI5_CLI: '@ui5/cli',
    SAP_UX_UI5_TOOLING: '@sap/ux-ui5-tooling',
    SAP_UX_UI5_MIDDLEWARE_FE_MOCKSERVER: '@sap-ux/ui5-middleware-fe-mockserver',
    SAP_GRUNT_SAPUI5_BESTPRACTICE_BUILD: '@sap/grunt-sapui5-bestpractice-build'
} as const;

/**
 * Check if the project is a CAP project that uses 'cds-plugin-ui5'.
 *
 * @param basePath - base path of the app
 * @param fs - file system reference
 * @returns indicator if the project is a CAP project that uses 'cds-plugin-ui5'
 */
async function isUsingCdsPluginUi5(basePath: string, fs: Editor): Promise<boolean> {
    const capProjectRootPath = await findCapProjectRoot(basePath, false, fs);
    if (!capProjectRootPath) {
        return false;
    }
    return await checkCdsUi5PluginEnabled(capProjectRootPath, fs);
}

/**
 * Check if the prerequisites for the conversion are met.
 * - UI5 CLI version 3.0.0 or higher is being used.
 * - '@sap/grunt-sapui5-bestpractice-build' is not being used.
 * - '@sap-ux/ui5-middleware-fe-mockserver' or 'cds-plugin-ui5' is being used.
 *
 * @param basePath - base path to be used for the conversion
 * @param fs - file system reference
 * @param convertTests - if set to true, then test suite and test runners fill be included in the conversion
 * @param logger logger to report info to the user
 * @returns indicator if the prerequisites are met
 */
export async function checkPrerequisites(
    basePath: string,
    fs: Editor,
    convertTests: boolean = false,
    logger?: ToolsLogger
): Promise<boolean> {
    const packageJsonPath = join(basePath, FileName.Package);
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    let prerequisitesMet = true;

    if (!packageJson) {
        throw Error(`File '${FileName.Package}' not found at '${basePath}'`);
    }

    if (hasDependency(packageJson, packageName.SAP_GRUNT_SAPUI5_BESTPRACTICE_BUILD)) {
        logger?.error(
            `Conversion from '${packageName.SAP_GRUNT_SAPUI5_BESTPRACTICE_BUILD}' is not supported. You must migrate to UI5 CLI version 3.0.0 or higher. For more information, see https://sap.github.io/ui5-tooling/v3/updates/migrate-v3.`
        );
        prerequisitesMet = false;
    }

    if (isLowerThanMinimalVersion(packageJson, packageName.UI5_CLI, '3.0.0')) {
        logger?.error(
            'UI5 CLI version 3.0.0 or higher is required to convert the preview to virtual files. For more information, see https://sap.github.io/ui5-tooling/v3/updates/migrate-v3.'
        );
        prerequisitesMet = false;
    }

    if (isLowerThanMinimalVersion(packageJson, packageName.SAP_UX_UI5_TOOLING, '1.15.4', false)) {
        logger?.error(
            'UX UI5 Tooling version 1.15.4 or higher is required to convert the preview to virtual files. For more information, see https://www.npmjs.com/package/@sap/ux-ui5-tooling.'
        );
        prerequisitesMet = false;
    }

    if (
        !hasDependency(packageJson, packageName.SAP_UX_UI5_MIDDLEWARE_FE_MOCKSERVER) &&
        !(await isUsingCdsPluginUi5(basePath, fs))
    ) {
        logger?.error(
            `Conversion from 'sap/ui/core/util/MockServer' or '@sap/ux-ui5-fe-mockserver-middleware' is not supported. You must migrate to '${packageName.SAP_UX_UI5_MIDDLEWARE_FE_MOCKSERVER}' first. For more information, see https://www.npmjs.com/package/@sap-ux/ui5-middleware-fe-mockserver.`
        );
        prerequisitesMet = false;
    }

    if (convertTests && hasDependency(packageJson, packageName.KARMA_UI5)) {
        logger?.warn(
            "This app seems to use Karma as a test runner. Please note that the converter does not convert any Karma configuration files. Please update your karma configuration ('ui5.configPath' and 'ui5.testpage') according to the new virtual endpoints after the conversion."
        );
    }

    if (convertTests && hasDependency(packageJson, packageName.WDIO_QUNIT_SERVICE)) {
        logger?.warn(
            'This app seems to use the WebdriverIO QUnit Service as a test runner. Please note that the converter does not convert any WebdriverIO configuration files. Please update your WebdriverIO QUnit Service test paths according to the new virtual endpoints after the conversion.'
        );
    }

    return prerequisitesMet;
}
