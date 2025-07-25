import { join, sep } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { FFOPAConfig } from './types';
import type { Logger } from '@sap-ux/logger';
import { getFilePaths, FileName } from '@sap-ux/project-access';
import { t } from './i18n';
import { compareUI5VersionGte, ui5LtsVersion_1_71, ui5LtsVersion_1_120 } from '@sap-ux/ui5-application-writer';

/**
 * Updates tsconfig.json to include paths for unit and integration tests.
 *
 * @param {Editor} fs - The file system editor instance.
 * @param {string} destinationRoot - The root directory where tsconfig.json exists.
 * @param log
 */
function writeOPATsconfigJsonUpdates(fs: Editor, destinationRoot: string, log?: Logger): void {
    try {
        const tsconfig: any = fs.readJSON(join(destinationRoot, FileName.Tsconfig)) ?? {};

        tsconfig.compilerOptions = tsconfig.compilerOptions || {};
        tsconfig.compilerOptions.paths = tsconfig.compilerOptions.paths || {};

        tsconfig.compilerOptions.paths['unit/*'] = ['./webapp/test/unit/*'];
        tsconfig.compilerOptions.paths['integration/*'] = ['./webapp/test/integration/*'];

        fs.writeJSON(join(destinationRoot, FileName.Tsconfig), tsconfig);
    } catch (error) {
        log?.error(
            t('error.errorWritingTsConfig', {
                error: error
            })
        );
    }
}

/**
 * Gets the template UI5 version based on the provided UI5 version.
 *
 * @param ui5Version - The UI5 version.
 * @returns template UI5 version.
 */
function getTemplateUi5Version(ui5Version?: string): string {
    if (!ui5Version) {
        return ui5LtsVersion_1_120;
    }
    return compareUI5VersionGte(ui5Version, ui5LtsVersion_1_120) ? ui5LtsVersion_1_120 : ui5LtsVersion_1_71;
}

/**
 * Filters files based on the template UI5 version.
 *
 * @param files - Array of file paths.
 * @param templateUi5Version - The current template Ui5 Version.
 * @returns Files that either are testsuite files or reside in the current template UI5 version folder.
 */
function filterByUi5Version(files: string[], templateUi5Version: string): string[] {
    return files.filter((filePath: string) => {
        // Always include testsuite files.
        if (filePath.includes('testsuite.qunit')) {
            return true;
        }
        // For all other files, include only those in the current UI5 version directory.
        return filePath.includes(`${sep}${templateUi5Version}${sep}`);
    });
}

/**
 * Filters files based on the TypeScript setting.
 *
 * @param files - Array of file paths.
 * @param isTypeScript - If true, include .ts files; if false, include .js files.
 * @returns Files filtered based on the file extension.
 */
function filterByTypeScript(files: string[], isTypeScript: boolean): string[] {
    return files.filter((filePath: string) => {
        if (filePath.endsWith('.ts')) {
            return isTypeScript;
        }
        if (filePath.endsWith('.js')) {
            return !isTypeScript;
        }
        // Keep all .html file types
        return true;
    });
}

/**
 * Determines the destination file path based on the provided file path.
 *
 * @param {string} filePath - The original file path.
 * @param {string} freestyleTemplateDir - The directory file path to be removed from the path.
 * @param {string} commonTemplateDir - The directory file to be removed for common templates path.
 * @param {string} templateUi5Version - The UI5 version to be replaced in the path.
 * @returns {string} - The transformed destination file path.
 */
function getDestFilePath(
    filePath: string,
    freestyleTemplateDir: string,
    commonTemplateDir: string,
    templateUi5Version: string
): string {
    if (filePath.includes(freestyleTemplateDir)) {
        return filePath.replace(freestyleTemplateDir, '').replace(`${sep}${templateUi5Version}${sep}`, sep);
    } else if (filePath.includes(commonTemplateDir)) {
        return filePath.replace(commonTemplateDir, '');
    } else {
        return filePath;
    }
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
    const { enableTypeScript, ui5Version, viewName, appId } = opaConfig;

    const freestyleTemplateDir = join(__dirname, '../templates/freestyle/webapp/test');
    const commonTemplateDir = join(__dirname, '../templates/common');
    const testOutDir = join(basePath, 'webapp/test');

    const templateUi5Version = getTemplateUi5Version(ui5Version);
    const appIdWithSlash = appId.replace(/[.]/g, '/'); // Replace all dots with slashes
    const navigationIntent = appId.replace(/[./\\\-\s]/g, ''); // Remove all dots, slashes, dashes, and spaces

    const templateFiles = await getFilePaths(freestyleTemplateDir);
    const isTypeScript = Boolean(enableTypeScript);

    const templateFilteredFiles = filterByUi5Version(templateFiles, templateUi5Version);
    const filteredFiles = filterByTypeScript(templateFilteredFiles, isTypeScript);

    // copy common templates
    const commonFiles = await getFilePaths(commonTemplateDir);
    const filteredCommonFiles = commonFiles.filter((filePath: string) => filePath.endsWith('.html'));
    filteredFiles.push(...filteredCommonFiles);

    const config = {
        ...opaConfig,
        viewNamePage: `${viewName}Page`,
        appIdWithSlash,
        navigationIntent,
        ui5Theme: opaConfig.ui5Theme ?? ''
    };

    // Rename files:
    // - viewName.js files are renamed to include the view name in their file path
    // - viewName.ts files are renamed with the view name appended with 'Page'
    const renameMap = {
        [join('/integration/pages/viewName.js')]: join(`integration/pages/${viewName}.js`),
        [join('/integration/pages/viewName.ts')]: join(`integration/pages/${viewName}Page.ts`),
        [join('/unit/controller/viewName.controller.js')]: join(`unit/controller/${viewName}.controller.js`),
        [join('/unit/controller/viewName.controller.ts')]: join(`unit/controller/${viewName}Page.controller.ts`)
    };
    // copy templates
    let freestyleTestTemplatesCopied = false;
    try {
        filteredFiles.forEach((filePath: string) => {
            // remove template UI5 version from the path
            const destFilePath = getDestFilePath(filePath, freestyleTemplateDir, commonTemplateDir, templateUi5Version);
            const destinationFilePath = join(testOutDir, renameMap?.[destFilePath] ?? destFilePath);
            fsEditor.copyTpl(filePath, destinationFilePath, config, undefined, {
                globOptions: { dot: true }
            });
        });
        freestyleTestTemplatesCopied = true;
    } catch (error) {
        log?.error(
            t('error.errorCopyingFreestyleTestTemplates', {
                error: error
            })
        );
    }

    if (freestyleTestTemplatesCopied && isTypeScript) {
        writeOPATsconfigJsonUpdates(fsEditor, basePath, log);
    }

    return fsEditor;
}
