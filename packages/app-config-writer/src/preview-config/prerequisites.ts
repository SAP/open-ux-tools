import { join } from 'path';
import { prompt } from 'prompts';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import type { PromptObject } from 'prompts';
import type { ToolsLogger } from '@sap-ux/logger';
import { satisfies } from 'semver';

/**
 * Check if the version of the given package is lower than the minimal version.
 *
 * @param packageJson - the package.json file content
 * @param dependencyName - the name of the (dev)dependency to check
 * @param minVersionInfo - the minimal version to check against
 * @param mandatory - (default true) if the existence of the dependency is mandatory
 * @returns indicator if the version is lower than the minimal version
 */
function isLowerThanMinimalVersion(
    packageJson: Package,
    dependencyName: string,
    minVersionInfo: string,
    mandatory: boolean = true
): boolean {
    const versionInfo = packageJson?.devDependencies?.[dependencyName] ?? packageJson?.dependencies?.[dependencyName];
    if (!versionInfo) {
        return mandatory;
    }
    return !satisfies(minVersionInfo, versionInfo);
}

/**
 * Check if the prerequisites for the conversion are met.
 * - UI5 CLI version 3.0.0 or higher is being used.
 * - '@sap/grunt-sapui5-bestpractice-build' is not being used.
 * - '@sap-ux/ui5-middleware-fe-mockserver' or 'cds-plugin-ui5' is being used.
 *
 * @param basePath - base path to be used for the conversion
 * @param fs - file system reference
 * @param logger logger to report info to the user
 * @returns indicator if the prerequisites are met
 */
export async function checkPrerequisites(basePath: string, fs: Editor, logger?: ToolsLogger): Promise<boolean> {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    let prerequisitesMet = true;

    if (!packageJson) {
        throw Error(`File 'package.json' not found at '${basePath}'`);
    }

    const sapui5BestpracticeBuildExists =
        !!packageJson?.devDependencies?.['@sap/grunt-sapui5-bestpractice-build'] ||
        !!packageJson?.dependencies?.['@sap/grunt-sapui5-bestpractice-build'];
    if (sapui5BestpracticeBuildExists) {
        logger?.error(
            "Conversion from '@sap/grunt-sapui5-bestpractice-build' is not supported. You must migrate to UI5 CLI version 3.0.0 or higher. For more information, see https://sap.github.io/ui5-tooling/v3/updates/migrate-v3."
        );
        prerequisitesMet = false;
    }

    if (isLowerThanMinimalVersion(packageJson, '@ui5/cli', '3.0.0')) {
        logger?.error(
            'UI5 CLI version 3.0.0 or higher is required to convert the preview to virtual files. For more information, see https://sap.github.io/ui5-tooling/v3/updates/migrate-v3.'
        );
        prerequisitesMet = false;
    }

    if (isLowerThanMinimalVersion(packageJson, '@sap/ux-ui5-tooling', '1.15.4', false)) {
        logger?.error(
            'UX UI5 Tooling version 1.15.4 or higher is required to convert the preview to virtual files. For more information, see https://www.npmjs.com/package/@sap/ux-ui5-tooling.'
        );
        prerequisitesMet = false;
    }

    const ui5MiddlewareMockserverExists =
        !!packageJson?.devDependencies?.['@sap-ux/ui5-middleware-fe-mockserver'] ||
        !!packageJson?.dependencies?.['@sap-ux/ui5-middleware-fe-mockserver'];
    const cdsPluginUi5Exists =
        !!packageJson?.devDependencies?.['cds-plugin-ui5'] || !!packageJson?.dependencies?.['cds-plugin-ui5'];
    if (!ui5MiddlewareMockserverExists && !cdsPluginUi5Exists) {
        logger?.error(
            "Conversion from 'sap/ui/core/util/MockServer' is not supported. You must migrate from '@sap-ux/ui5-middleware-fe-mockserver'. For more information, see https://www.npmjs.com/package/@sap-ux/ui5-middleware-fe-mockserver."
        );
        prerequisitesMet = false;
    }

    return prerequisitesMet;
}

/**
 * Get the explicit approval form the user to do the conversion.
 *
 * @returns Explicit user approval to do the conversion.
 */
export async function getExplicitApprovalToAdjustFiles(): Promise<boolean> {
    const question: PromptObject = {
        type: 'confirm',
        name: 'approval',
        initial: false,
        message:
            'The converter will rename the HTML files and delete the JS and TS files used for the existing preview functionality and configure virtual files instead. Do you want to proceed with the conversion?'
    };
    return Boolean((await prompt([question])).approval);
}
