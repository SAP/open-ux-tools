/**
 * Specialized handlers for generating specific template files
 * Extracted from common.ts generateTemplate function to reduce complexity
 */
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { readFile, fileExists, readJSON, deleteFile } from '../file-access.js';
import { createMemFsEditor } from '../fs-adapter.js';
import mergeWith from 'lodash/mergeWith.js';
import { MigrationTypes } from '../constants.js';

/**
 * Handle .gitignore file generation - append to existing file
 *
 * @param targetFile
 * @param templateContent
 * @param fsEditor - optional mem-fs editor; a fresh one is created when omitted
 */
export function handleGitIgnoreFile(targetFile: string, templateContent: string, fsEditor?: Editor): string {
    const fs = fsEditor ?? createMemFsEditor();
    if (!fileExists(fs, targetFile)) {
        return templateContent;
    }

    const currentFileContent = readFile(fs, targetFile);
    let mergedContent = `${currentFileContent}\n${templateContent}`;

    // Replace `changes_preview.js` so it can be checked in after migration
    mergedContent = mergedContent.replaceAll(`/changes_preview.js`, '').replaceAll(`changes_preview.js`, '');

    return mergedContent;
}

/**
 * Rename scripts in the existing package.json that collide with template script names,
 * preserving the originals under a `<name>_old` key.
 *
 * @param currentFileContent - Parsed existing package.json (mutated in place)
 * @param templateContentJSON - Parsed template package.json
 */
function renameConflictingScripts(currentFileContent: any, templateContentJSON: any): void {
    const oldScripts: any = {};
    for (const script in templateContentJSON?.scripts) {
        if (currentFileContent?.scripts?.[script] && !currentFileContent.scripts[`${script}_old`]) {
            oldScripts[`${script}_old`] = currentFileContent.scripts[script];
            delete currentFileContent.scripts[script];
        } else if (currentFileContent?.scripts?.[script]) {
            delete currentFileContent.scripts[script];
        }
    }
    for (const oldScript in oldScripts) {
        currentFileContent.scripts[oldScript] = oldScripts[oldScript];
    }
}

/**
 * Add the extension-project `start-ui5-flp` script to the template package.json.
 *
 * @param templateContentJSON - Parsed template package.json (mutated in place)
 * @param templateData - Template data with project/service configuration
 */
function addExtensionStartScript(templateContentJSON: any, templateData: any): void {
    let queryStr = templateData.project.ui5Theme ? `sap-theme=${templateData.project.ui5Theme}&` : '';
    queryStr = templateData.service.client ? `${queryStr}sap-client=${templateData.service.client}&` : queryStr;

    templateContentJSON.scripts ??= {};
    templateContentJSON.scripts['start-ui5-flp'] =
        `fiori run --open "/test-resources/sap/ushell/shells/sandbox/fioriSandbox.html?${queryStr}sap-ushell-test-url-url=..%2F..%2F..%2F..%2F..%2F..&sap-ushell-test-url-additionalInformation=SAPUI5.Component%3D${templateData.fullyQualifiedProjectName}#Test-url"`;
}

/**
 * Handle package.json file generation - merge with existing file
 *
 * @param projectRoot
 * @param targetFile
 * @param templateContent
 * @param templateData
 * @param fsEditor - optional mem-fs editor; a fresh one is created when omitted
 */
export async function handlePackageJsonFile(
    projectRoot: string,
    targetFile: string,
    templateContent: string,
    templateData: any,
    fsEditor?: Editor
): Promise<string> {
    const fs = fsEditor ?? createMemFsEditor();
    const ownsEditor = !fsEditor;
    if (!fileExists(fs, targetFile)) {
        return templateContent;
    }

    let currentFileContent: any;
    try {
        currentFileContent = await readJSON(fs, targetFile);
    } catch (error) {
        // If file can't be read (shouldn't happen after fileExists check, but handle it anyway)
        // This can occur in legacy projects where package.json doesn't exist yet
        return templateContent;
    }
    const templateContentJSON = JSON.parse(templateContent);

    renameConflictingScripts(currentFileContent, templateContentJSON);

    // Handle extension project special script
    if (templateData.project.type === MigrationTypes.projectExtension) {
        addExtensionStartScript(templateContentJSON, templateData);
    }

    // Remove conflicting dependencies
    removeLegacyDependencies(currentFileContent, templateContentJSON);

    // Remove legacy Grunt module and file
    removeLegacyGruntModule(fs, projectRoot, currentFileContent);

    // Remove old beta ui5-tooling module
    removeBetaUi5ToolingModule(currentFileContent);

    // Filter duplicate keywords
    filterDuplicateKeywords(currentFileContent, templateContentJSON);

    // Merge with custom array concatenation
    const mergedContent = mergeWith(currentFileContent, templateContentJSON, function customizer(objValue, srcValue) {
        if (Array.isArray(objValue)) {
            return objValue.concat(srcValue);
        }
    });

    // When we created the editor ourselves, persist staged side effects (e.g. Gruntfile.js deletion).
    // When the caller passed an editor, they own the commit (migration flow commits once at the end).
    if (ownsEditor) {
        await new Promise<void>((resolve, reject) => fs.commit((err) => (err ? reject(err) : resolve())));
    }

    return JSON.stringify(mergedContent, null, 2);
}

/**
 * Remove conflicting dependencies from current file
 *
 * @param currentFileContent
 * @param templateContentJSON
 */
function removeLegacyDependencies(currentFileContent: any, templateContentJSON: any): void {
    // Remove deps/devDeps that are in new json
    for (const devDep in templateContentJSON?.dependencies) {
        if (currentFileContent?.dependencies?.[devDep]) {
            delete currentFileContent.dependencies[devDep];
        }
    }

    for (const dep in templateContentJSON?.devDependencies) {
        if (currentFileContent?.devDependencies?.[dep]) {
            delete currentFileContent.devDependencies[dep];
        }
    }

    // Delete legacy modules
    const legacyModules = ['@ui5/logger', '@ui5/fs', '@sap-ux/specification', '@sap/ux-specification'];
    for (const module of legacyModules) {
        if (currentFileContent?.devDependencies?.[module]) {
            delete currentFileContent.devDependencies[module];
        }
        if (currentFileContent?.dependencies?.[module]) {
            delete currentFileContent.dependencies[module];
        }
    }
}

/**
 * Remove legacy Grunt module and associated file
 *
 * @param fs - mem-fs editor
 * @param projectRoot
 * @param currentFileContent
 */
function removeLegacyGruntModule(fs: Editor, projectRoot: string, currentFileContent: any): void {
    const gruntModule = '@sap/grunt-sapui5-bestpractice-build';
    let deleteGruntFile = false;

    if (currentFileContent?.devDependencies?.[gruntModule]) {
        delete currentFileContent.devDependencies[gruntModule];
        deleteGruntFile = true;
    }

    if (currentFileContent?.dependencies?.[gruntModule]) {
        delete currentFileContent.dependencies[gruntModule];
        deleteGruntFile = true;
    }

    // If dependency exists, also remove the Gruntfile.js
    if (deleteGruntFile) {
        const gruntFilePath = join(projectRoot, 'Gruntfile.js');
        if (fileExists(fs, gruntFilePath)) {
            deleteFile(fs, gruntFilePath);
        }
    }
}

/**
 * Remove beta ui5-tooling module
 *
 * @param currentFileContent
 */
function removeBetaUi5ToolingModule(currentFileContent: any): void {
    const betaUi5ToolingModule = '@sap-ux/ui5-tooling';

    if (currentFileContent.devDependencies) {
        const { [betaUi5ToolingModule]: _remove, ...otherDevDeps } = currentFileContent.devDependencies;
        currentFileContent.devDependencies = otherDevDeps;
    }

    if (currentFileContent?.ui5?.dependencies) {
        currentFileContent.ui5.dependencies = currentFileContent.ui5.dependencies.filter(
            (currentDeps: string) => currentDeps !== betaUi5ToolingModule
        );
        if (currentFileContent.ui5.dependencies.length === 0) {
            delete currentFileContent.ui5;
        }
    }
}

/**
 * Filter duplicate keywords
 *
 * @param currentFileContent
 * @param templateContentJSON
 */
function filterDuplicateKeywords(currentFileContent: any, templateContentJSON: any): void {
    for (const keyword of templateContentJSON?.keywords ?? []) {
        if (currentFileContent?.keywords) {
            currentFileContent.keywords = currentFileContent.keywords.filter(
                (currentKeyword: string) => currentKeyword !== keyword
            );
        }
    }
}

/**
 * Handle locateReuseLibs file - replace mockserver path
 *
 * @param templateContent
 * @param templateData
 */
export function handleLocateReuseLibsFile(templateContent: string, templateData: any): string {
    return templateContent.replace(`/mockserver`, `/${templateData.mockServerJSFileName}`);
}
