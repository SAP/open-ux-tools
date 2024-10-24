import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { getWebappPath, type Package } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';
import { prompt, type PromptObject } from 'prompts';

/**
 * Converts the local preview files of a project to virtual files.
 *
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 * @param fs - file system reference
 * @returns file system reference
 */
export async function convertToVirtualPreview(basePath: string, logger?: ToolsLogger, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    if (!(await checkPrerequisites(basePath, fs, logger))) {
        throw Error('Prerequisites not met. See above log messages for details.');
    }

    if (!(await getExplicitApprovalToAdjustFiles())) {
        throw Error('Approval not given');
    }

    await renameSandboxes(fs, basePath);
    await deleteNoLongerUsedFiles(fs, basePath);

    //todo: implement the function logic (re-use from variants management script)
    // - read from the script (start-variants-management) in the package.json which configuration should be used
    // - update the scrip in the package.json if required (e.g. variants script needs an update of the intent).
    // - add/update the configuration of the fiori-tools-preview (if no devDependency to ux-tooling: use preview-middleware)
    // - remove url parameters for RTA editor run scripts depending on preview-middleware/fiori-tools-preview version
    // - adjust all *.yaml files in webapp (not just ui5.yaml, ui5-local.yaml and ui5-mock.yaml)

    return fs;
}

/**
 * Add '_old' to webapp/test/flpSandbox.html and webapp/test/flpSandboxMockserver.html to indicate that they will no longer be used.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
async function renameSandboxes(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const message = (filename: string): string =>
        `Renamed ${filename} to ${filename}_old.html. This file is no longer needed for the preview. In case there have not been done any modifications you can delete this file. In case of modifications please move the respective content e.g. to a custom init script of the preview middleware (see migration information https://www.npmjs.com/package/preview-middleware#migration).`;
    const flpSandboxPath = join(await getWebappPath(basePath), 'test', 'flpSandbox.html');
    if (fs.exists(flpSandboxPath)) {
        fs.move(flpSandboxPath, flpSandboxPath.replace('.html', '_old.html'));
        logger?.info(message('webapp/test/flpSandbox.html'));
    }
    const flpSandboxMockserverPath = join(await getWebappPath(basePath), 'test', 'flpSandboxMockserver.html');
    if (fs.exists(flpSandboxMockserverPath)) {
        fs.move(flpSandboxMockserverPath, flpSandboxMockserverPath.replace('.html', '_old.html'));
        logger?.info(message('webapp/test/flpSandboxMockserver.html'));
    }
}

/**
 * Delete files that are no longer used for the virtual preview.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
async function deleteNoLongerUsedFiles(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const webappTestPath = join(await getWebappPath(basePath), 'test');
    // todo: check if the list of files is complete
    [
        join(webappTestPath, 'locate-reuse-libs.js'),
        join(webappTestPath, 'changes_loader.js'),
        join(webappTestPath, 'changes_loader.ts'),
        join(webappTestPath, 'changes_preview.js'),
        join(webappTestPath, 'changes_preview.ts'),
        join(webappTestPath, 'flpSandbox.js'),
        join(webappTestPath, 'flpSandbox.ts'),
        join(webappTestPath, 'initFlpSandbox.js'),
        join(webappTestPath, 'initFlpSandbox.ts')
    ].forEach((path: string): void => {
        if (fs.exists(path)) {
            fs.delete(path);
            logger?.info(`Deleted ${path}. This file is no longer needed for the preview.`);
        }
    });
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
async function checkPrerequisites(basePath: string, fs: Editor, logger?: ToolsLogger): Promise<boolean> {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    let prerequisitesMet = true;

    if (!packageJson) {
        throw Error(`File 'package.json' not found at ${basePath}`);
    }

    const sapui5BestpracticeBuildExists =
        !!packageJson?.devDependencies?.['@sap/grunt-sapui5-bestpractice-build'] ||
        !!packageJson?.dependencies?.['@sap/grunt-sapui5-bestpractice-build'];
    if (sapui5BestpracticeBuildExists) {
        logger?.error(
            "A conversion from '@sap/grunt-sapui5-bestpractice-build' is not supported. Please migrate to UI5 CLI version 3.0.0 or higher first. See https://sap.github.io/ui5-tooling/v3/updates/migrate-v3/ for more information."
        );
        prerequisitesMet = false;
    }

    const ui5CliVersion = packageJson?.devDependencies?.['@ui5/cli'] ?? packageJson?.dependencies?.['@ui5/cli'] ?? '0';
    if (parseInt(ui5CliVersion.split('.')[0], 10) < 3) {
        logger?.error(
            'UI5 CLI version 3.0.0 or higher is required to convert the preview to virtual files. See https://sap.github.io/ui5-tooling/v3/updates/migrate-v3/ for more information.'
        );
        prerequisitesMet = false;
    }

    const ui5MiddlewareMockserverExists =
        !!packageJson?.devDependencies?.['@sap-ux/ui5-middleware-fe-mockserver'] ||
        !!packageJson?.dependencies?.['@sap-ux/ui5-middleware-fe-mockserver'];
    const cdsPluginUi5Exists =
        !!packageJson?.devDependencies?.['cds-plugin-ui5'] || !!packageJson?.dependencies?.['cds-plugin-ui5'];
    if (!ui5MiddlewareMockserverExists && !cdsPluginUi5Exists) {
        //todo: add link to migration guide
        logger?.error(
            "A conversion from 'sap/ui/core/util/MockServer' is not supported. Please migrate to '@sap-ux/ui5-middleware-fe-mockserver' first."
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
async function getExplicitApprovalToAdjustFiles(): Promise<boolean> {
    /* todo: is this needed?
    const cancel = {
        onCancel: () => {
            logger?.info(yellow(t('info.operationAborted')));
            return process.exit(1);
        }
    };
    */

    const question: PromptObject = {
        name: 'approval',
        type: 'confirm',
        initial: false,
        message:
            'The converter will rename html files and delete js files used for the existing preview and configure the usage of virtual files instead. Do you want to proceed with the conversion?'
    };

    //return (await prompt([question], cancel)) as boolean;
    return (await prompt([question])) as boolean;
}
