import { join, basename } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { FFOPAConfig } from './types';
import type { Logger } from '@sap-ux/logger';
import { getFilePaths } from '@sap-ux/project-access';
import type { Package } from '@sap-ux/project-access';
import { ValidationError } from './types';
import { t } from './i18n';
import { compareUI5VersionGte, ui5LtsVersion_1_71 } from '@sap-ux/ui5-application-writer';

/**
 * Reads the Package for an app.
 *
 * @param fs - a reference to a mem-fs editor
 * @param basePath - the root folder of the app
 * @returns the Package object. An exception is thrown if the Package cannot be read.
 */
export function readPackage(fs: Editor, basePath: string): Package {
    const packageJose = fs.readJSON(join(basePath, 'package.json')) as any as Package;
    if (!packageJose) {
        throw new ValidationError(
            t('error.cannotReadPackage', {
                filePath: join(basePath, 'package.json')
            })
        );
    }
    return packageJose;
}

/**
 * Updates tsconfig.json to include paths for unit and integration tests.
 *
 * @param {Editor} fs - The file system editor instance.
 * @param {string} destinationRoot - The root directory where tsconfig.json exists.
 * @param log
 */
function writeOPATsconfigJsonUpdates(fs: Editor, destinationRoot: string, log?: Logger): void {
    try {
        const tsconfig: any = fs.readJSON(join(destinationRoot, 'tsconfig.json')) ?? {};

        tsconfig.compilerOptions = tsconfig.compilerOptions || {};
        tsconfig.compilerOptions.paths = tsconfig.compilerOptions.paths || {};

        tsconfig.compilerOptions.paths['unit/*'] = ['./webapp/test/unit/*'];
        tsconfig.compilerOptions.paths['integration/*'] = ['./webapp/test/integration/*'];

        fs.writeJSON(join(destinationRoot, 'tsconfig.json'), tsconfig);
    } catch (error) {
        log?.error(`Error updating tsconfig.json: ${error}`);
    }
}

/**
 * Formats a namespace by replacing dots with slashes.
 *
 * @param {string} namespace - The namespace to format.
 * @returns {string} - Formatted namespace.
 */
function formatNamespace(namespace: string): string {
    return namespace.replace(/\./g, '/');
}

/**
 * Gets the template UI5 version based on the provided UI5 version.
 *
 * @param ui5Version - The UI5 version.
 * @returns template UI5 version.
 */
function getTemplateUi5Version(ui5Version?: string): string {
    const templateLtsVersion_1_120 = '1.120.0';
    if (!ui5Version) {
        return templateLtsVersion_1_120;
    }
    return compareUI5VersionGte(ui5Version, templateLtsVersion_1_120) ? templateLtsVersion_1_120 : ui5LtsVersion_1_71;
}

/**
 * Copies filtered test template files from source directory to destination directory,
 * with file renaming logic based on the view name.
 *
 * @param {string} freestyleTemplateDirPath - The path to the source directory containing template files.
 * @param {string} testOutDirPath - The path to the destination directory where files should be copied.
 * @param {string[]} filteredFiles - An array of filtered file paths to copy.
 * @param {FFOPAConfig} opaConfig - The OPA test configuration object to write into template files.
 * @param {Editor} editor - The editor instance used to copy and render template files.
 * @param {Logger} [log] - The logger instance.
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the files were copied successfully,
 * or `false` if there was an error during the process.
 */
async function copyTestFiles(
    freestyleTemplateDirPath: string,
    testOutDirPath: string,
    filteredFiles: string[],
    opaConfig: FFOPAConfig,
    editor: Editor,
    log?: Logger
): Promise<boolean> {
    try {
        filteredFiles.forEach((filePath: string) => {
            const sourceFilePath = join(freestyleTemplateDirPath, filePath);
            let destinationFilePath = join(testOutDirPath, filePath);
            const viewName = opaConfig.viewName;

            // Rename files:
            // - viewName.js files are renamed to include the view name in their file path
            // - viewName.ts files are renamed with the view name appended with 'Page'
            const renameMap: Record<string, string> = {
                '/integration/pages/viewName.js': `integration/pages/${viewName}.js`,
                '/integration/pages/viewName.ts': `integration/pages/${viewName}Page.ts`,
                '/unit/controller/viewName.controller.js': `unit/controller/${viewName}.controller.js`,
                '/unit/controller/viewName.controller.ts': `unit/controller/${viewName}Page.controller.ts`
            };

            if (renameMap[filePath]) {
                destinationFilePath = join(testOutDirPath, renameMap[filePath]);
            }
            editor.copyTpl(sourceFilePath, destinationFilePath, { ...opaConfig, formatNamespace }, undefined, {
                globOptions: { dot: true }
            });
        });
        const rootCommonTemplateDirPath = join(__dirname, '../templates/common');
        editor.copyTpl(
            rootCommonTemplateDirPath,
            testOutDirPath,
            {
                appId: opaConfig.appId,
                addUnitTests: false
            },
            undefined,
            {
                globOptions: { dot: true }
            }
        );

        return true;
    } catch (error) {
        log?.error(`Error copying files: ${error}`);
        return false;
    }
}

/**
 * Generates formatted application ID with slashes based on namespace, name, and TypeScript settings.
 *
 * @param {string} [name] - The application name.
 * @param {string} [namespace] - The application namespace.
 * @param {boolean} [enableTypescript] - Whether TypeScript is enabled.
 * @returns {string} The formatted application ID with slashes.
 */
function getAppIdWithSlash(name: string = '', namespace: string = '', enableTypescript: boolean = false): string {
    // Replace dots with slashes in the namespace and remove any trailing slash
    const formattedNamespace = namespace.replace(/\./g, '/').replace(/\/$/, '');

    // Construct the AppIdWithSlash based on the conditions
    const appIdWithSlash = enableTypescript
        ? `${formattedNamespace}${namespace ? '/' : ''}${name.replace(/[_-]/g, '')}`
        : `${namespace.replace(/\./g, '')}${namespace ? '/' : ''}${name}`;

    return appIdWithSlash;
}

/**
 * Generates and copies freestyle test files based on configuration.
 *
 * @param {string} basePath - The base directory path.
 * @param {FFOPAConfig} opaConfig - Configuration object.
 * @param {Editor} fs - Optional file system editor instance.
 * @param {Logger} log - Optional logger instance.
 * @returns {Editor} - The modified file system editor.
 */
export async function generateFreestyleOPAFiles(
    basePath: string,
    opaConfig: FFOPAConfig,
    fs?: Editor,
    log?: Logger
): Promise<Editor> {
    const fsEditor = fs ?? create(createStorage());
    const { enableTypeScript, ui5Version, viewName, namespace } = opaConfig;

    const freestyleTemplateDirPath = join(__dirname, '../templates/freestyle/webapp/test');
    const testOutDirPath = join(basePath, 'webapp/test');
    const templateUi5Version = getTemplateUi5Version(ui5Version);
    const projectName = readPackage(fsEditor, basePath).name;
    const appIdWithSlash = getAppIdWithSlash(projectName, namespace, enableTypeScript);

    // Get template files
    const templateFiles = await getFilePaths(freestyleTemplateDirPath);
    const isTypeScript = Boolean(enableTypeScript);
    const commonJSTemplateFiles = ['initFlpSandbox.js', 'flpSandbox.js'];

    // Filter files based on TypeScript setting:
    // - If TypeScript is enabled, include only .ts files
    // - If TypeScript is disabled, include only .js files
    // - Include common JS files regardless of TypeScript setting
    const filteredFiles = templateFiles
        .filter((filePath: string) => {
            if (filePath.endsWith('.ts')) {
                return isTypeScript;
            }
            if (filePath.endsWith('.js')) {
                const includeCommonJSTemplate =
                    commonJSTemplateFiles.includes(basename(filePath)) && templateUi5Version === '1.71.0';
                return !isTypeScript || includeCommonJSTemplate;
            }
            return true; // keep other .html files
        })
        .map((filePath: string) => filePath.replace(freestyleTemplateDirPath, ''));

    const config = {
        ...opaConfig,
        viewNamePage: `${viewName}Page`,
        appIdWithSlash,
        ui5Version: templateUi5Version,
        navigationIntent: opaConfig.appId.replace(/[./\\\-\s]/g, '')
    };
    const filesCopiedSuccessfully = await copyTestFiles(
        freestyleTemplateDirPath,
        testOutDirPath,
        filteredFiles,
        config,
        fsEditor,
        log
    );

    // If files are copied successfully, update the package.json and tsconfig files
    if (filesCopiedSuccessfully && isTypeScript) {
        writeOPATsconfigJsonUpdates(fsEditor, basePath, log);
    }

    return fsEditor;
}
