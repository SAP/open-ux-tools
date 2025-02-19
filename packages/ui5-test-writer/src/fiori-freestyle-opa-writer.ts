import { join, basename } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { FFOPAConfig } from './types';
import type { Logger } from '@sap-ux/logger';
import { getFilePaths } from '@sap-ux/project-access';
import { t } from './i18n';
import { compareUI5VersionGte, ui5LtsVersion_1_71 } from '@sap-ux/ui5-application-writer';

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
 * @param {string} sourceDir - The path to the source directory containing template files.
 * @param {string} ouputDir - The path to the destination directory where files should be copied.
 * @param {string[]} filteredFiles - An array of filtered file paths to copy.
 * @param {FFOPAConfig} opaConfig - The OPA test configuration object to write into template files.
 * @param {Editor} editor - The editor instance used to copy and render template files.
 * @param {Logger} [log] - The logger instance.
 * @param {Record<string, string>} [renameMap] - Optional rename mapping for file paths.
 * @returns {boolean} - resolves to `true` if the files were copied successfully,
 * or `false` if there was an error during the process.
 */
function copyTemplates(
    sourceDir: string,
    ouputDir: string,
    filteredFiles: string[],
    opaConfig: FFOPAConfig & { addUnitTests?: boolean },
    editor: Editor,
    log?: Logger,
    renameMap?: Record<string, string>
): boolean {
    try {
        filteredFiles.forEach((filePath: string) => {
            const destFilePath = filePath.replace(sourceDir, '');
            const destinationFilePath = join(ouputDir, renameMap?.[destFilePath] ?? destFilePath);
            editor.copyTpl(filePath, destinationFilePath, opaConfig, undefined, {
                globOptions: { dot: true }
            });
        });
        return true;
    } catch (error) {
        log?.error(
            t('error.errorCopyingFreestyleTestTemplates', {
                error: error
            })
        );
        return false;
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
    const appIdWithSlash = appId.replace(/\./g, '/'); // Replace all dots with slashes
    const navigationIntent = appId.replace(/[./\\\-\s]/g, ''); // Remove all dots, slashes, dashes, and spaces

    const templateFiles = await getFilePaths(freestyleTemplateDir);
    const isTypeScript = Boolean(enableTypeScript);
    const commonJSTemplates = ['initFlpSandbox.js', 'flpSandbox.js'];

    // Filter files based on TypeScript setting:
    // - If TypeScript is enabled, include only .ts files
    // - If TypeScript is disabled, include only .js files
    // - Include common JS files regardless of TypeScript setting
    const filteredFiles = templateFiles.filter((filePath: string) => {
        if (filePath.endsWith('.ts')) {
            return isTypeScript;
        }
        if (filePath.endsWith('.js')) {
            const includeCommonJSTemplate =
                commonJSTemplates.includes(basename(filePath)) && templateUi5Version === '1.71.0';
            return !isTypeScript || includeCommonJSTemplate;
        }
        return true; // keep other .html files
    });

    const config = {
        ...opaConfig,
        viewNamePage: `${viewName}Page`,
        appIdWithSlash,
        ui5Version: templateUi5Version,
        navigationIntent,
        ui5Theme: opaConfig.ui5Theme ?? ''
    };

    // Rename files:
    // - viewName.js files are renamed to include the view name in their file path
    // - viewName.ts files are renamed with the view name appended with 'Page'
    const renameMap: Record<string, string> = {
        '/integration/pages/viewName.js': `integration/pages/${viewName}.js`,
        '/integration/pages/viewName.ts': `integration/pages/${viewName}Page.ts`,
        '/unit/controller/viewName.controller.js': `unit/controller/${viewName}.controller.js`,
        '/unit/controller/viewName.controller.ts': `unit/controller/${viewName}Page.controller.ts`
    };
    // copy freestyle templates
    const freestyleTestTemplatesCopied = copyTemplates(
        freestyleTemplateDir,
        testOutDir,
        filteredFiles,
        config,
        fsEditor,
        log,
        renameMap
    );

    // copy common templates
    const commonFiles = await getFilePaths(commonTemplateDir);
    const filteredCommonFiles = commonFiles.filter((filePath: string) => !filePath.endsWith('.js') || !isTypeScript);

    const commonTemplatesCopied = copyTemplates(
        commonTemplateDir,
        testOutDir,
        filteredCommonFiles,
        { appId, addUnitTests: true },
        fsEditor,
        log
    );

    if (commonTemplatesCopied && freestyleTestTemplatesCopied && isTypeScript) {
        writeOPATsconfigJsonUpdates(fsEditor, basePath, log);
    }

    return fsEditor;
}
