/**
 * Helper functions for migrating legacy Fiori Elements folder structures
 * Handles migration from /src/main/webapp to /webapp structure
 */

import { join, sep } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { readFile, updateFile, readJSON, updateJSON, fileExists } from '../utils/index.js';
import { editorHasPath } from '../utils/fs-adapter.js';
import { TemplateFileName } from '../index.js';
import { FileName } from '@sap-ux/project-access';
import { legacyPath, getFFTestSuiteMap, MigrationError } from '../utils/common.js';
import { ProjectAccess } from '../utils/Project.js';
import { hasStore } from '../types/mem-fs-types.js';
import type { ImportProjectInfo } from '../types.js';
import { buildLegacyPaths, tryGitMove, fallbackFsMove, cleanupEmptyDirs } from './legacy-helpers.js';

/**
 * Migrate project from legacy Fiori Elements folder structure (/src/main/webapp) to new structure (/webapp)
 *
 * @param fs - mem-fs editor
 * @param projectInfo - Project information including current webapp path
 * @param rootPath - Root path of the project
 * @returns Object containing updated keepIndex flag and updated webapp path
 */
export async function migrateLegacyFolderStructure(
    fs: Editor,
    projectInfo: ImportProjectInfo,
    rootPath: string
): Promise<{ keepIndex: boolean; webappPath: string }> {
    let keepIndex = false;

    // Check if project uses legacy folder structure
    if (!join(projectInfo.webappPath).includes(legacyPath)) {
        return { keepIndex, webappPath: projectInfo.webappPath };
    }

    const paths = buildLegacyPaths(rootPath, legacyPath);
    if (!fileExists(fs, paths.ffLegacyWebappPath)) {
        return { keepIndex, webappPath: projectInfo.webappPath };
    }

    // Try to use git to move files (preserves history)
    await tryGitMove(fs, rootPath, paths);

    // Fallback using node fs to move folders (handles cases where git fails or isn't available)
    await fallbackFsMove(rootPath, paths);

    // Remove old src dirs if empty
    await cleanupEmptyDirs(rootPath, legacyPath, paths);

    // Update webapp path after migration
    const updatedWebappPath = await ProjectAccess.getWebappPath(rootPath, undefined, undefined, fs);
    const ffTestMap = getFFTestSuiteMap(updatedWebappPath);

    // Process legacy qunit runner file
    processLegacyQunitRunner(fs, paths.ffNewTestPath, ffTestMap);

    // Update ModulePathForTests.js files
    await updateModulePathForTests(fs, paths.ffNewTestPath);

    // Update paths in test files
    if (editorHasPath(fs, paths.ffNewTestPath)) {
        updateTestFilePaths(fs, paths.ffNewTestPath);
    }

    // Update various config files
    updateGitignore(fs, rootPath);
    await Promise.all([updateNeoApp(fs, rootPath), updateProjectJson(fs, rootPath)]);

    // Check for mockserver in index.html
    keepIndex = checkForMockserver(fs, rootPath, updatedWebappPath);

    return { keepIndex, webappPath: updatedWebappPath };
}

/**
 * Process legacy qunit runner file and generate new test suite
 *
 * @param fs
 * @param ffNewTestPath
 * @param ffTestMap
 */
function processLegacyQunitRunner(fs: Editor, ffNewTestPath: string, ffTestMap: any): void {
    const qunitRunner = 'qunit.runner.testsuite.html';
    const legacyRunner = join(ffNewTestPath, qunitRunner);

    if (!fileExists(fs, legacyRunner)) {
        return;
    }

    let legacyRunnerContent = '';
    try {
        legacyRunnerContent = readFile(fs, legacyRunner);
    } catch (e) {
        throw new MigrationError(e, qunitRunner);
    }

    // Update context path assignment
    const context = 'ontextPath';
    const contextIdx = legacyRunnerContent.indexOf(context);
    if (contextIdx !== -1) {
        const contextEnd = legacyRunnerContent.indexOf(';', contextIdx);
        const newContext = ' = location.pathname.substring(0, location.pathname.lastIndexOf("/"))';
        legacyRunnerContent = `${legacyRunnerContent.substring(0, contextIdx + context.length)}${newContext}${legacyRunnerContent.substring(contextEnd)}`;
    }

    // Remove all '/test-resources' references
    legacyRunnerContent = legacyRunnerContent.replaceAll('/test-resources', '');

    // Add qunit redirect script
    const bodyTag = '<body>';
    const bodyTagIdx = legacyRunnerContent.indexOf(bodyTag);
    if (bodyTagIdx !== -1) {
        const qunitScript =
            '\n<script type="text/javascript" src="/resources/sap/ui/qunit/qunit-redirect.js"></script>';
        legacyRunnerContent = `${legacyRunnerContent.slice(0, bodyTagIdx + bodyTag.length)}${qunitScript}${legacyRunnerContent.slice(bodyTagIdx + bodyTag.length)}`;
    }

    // Add leading slash to context paths if missing
    const pathRegEx = 'contextpath + ';
    let idx = legacyRunnerContent.toLowerCase().indexOf(pathRegEx);
    while (idx !== -1) {
        // +1 skips the opening quote to check the first char inside the string value
        if (legacyRunnerContent.charAt(idx + pathRegEx.length + 1) !== '/') {
            legacyRunnerContent = `${legacyRunnerContent.slice(0, idx + pathRegEx.length + 1)}/${legacyRunnerContent.slice(idx + pathRegEx.length + 1)}`;
        }
        idx = legacyRunnerContent.toLowerCase().indexOf(pathRegEx, idx + 1);
    }

    // Handle testsuite.qunit.html file
    const testSuiteRunner = join(ffNewTestPath, TemplateFileName.TestsuiteQunitHtml);
    if (!fileExists(fs, testSuiteRunner)) {
        updateFile(fs, testSuiteRunner, legacyRunnerContent);
        delete ffTestMap[TemplateFileName.TestsuiteQunitHtml];
    } else {
        // Rename using copy+delete pattern (mem-fs compatible)
        const oldTestSuite = join(ffNewTestPath, 'testsuite_old.qunit.html');
        fs.copy(testSuiteRunner, oldTestSuite);
        fs.delete(testSuiteRunner);

        // Update references to testsuite.qunit.html
        if (legacyRunnerContent.includes('testsuite.qunit.html')) {
            legacyRunnerContent = legacyRunnerContent.replaceAll('testsuite.qunit.html', 'testsuite_old.qunit.html');
        }
        updateFile(fs, testSuiteRunner, legacyRunnerContent);
        delete ffTestMap[TemplateFileName.TestsuiteQunitHtml];
    }
}

/**
 * Update ModulePathForTests.js files to fix path calculations for new structure
 *
 * @param fs
 * @param ffNewTestPath
 */
async function updateModulePathForTests(fs: Editor, ffNewTestPath: string): Promise<void> {
    const { findAll } = await import('../utils/file-discovery.js');
    const moduleFilePath: string[] = [];
    await findAll(ffNewTestPath, TemplateFileName.ModulePathForTests, moduleFilePath, []);

    for (const path of moduleFilePath) {
        let moduleFileContent;
        try {
            moduleFileContent = readFile(fs, join(path, TemplateFileName.ModulePathForTests));
        } catch (e) {
            throw new MigrationError(e, TemplateFileName.ModulePathForTests);
        }

        const pathToRootIdx = moduleFileContent.indexOf('getPathToRoot');
        if (pathToRootIdx !== -1) {
            const funcBracket = '{';
            const functionStart = moduleFileContent.indexOf(funcBracket, pathToRootIdx);
            const posReturn = moduleFileContent.indexOf('return', pathToRootIdx);
            if (functionStart !== -1 && posReturn !== -1) {
                const replaceContent =
                    "\r\n\t\tvar number = window.location.href.indexOf(\"/webapp/test/\") !== -1 ? 3 : 1;\r\n\t\tvar iGoUp = URI(window.location.href).segment().length - number;\r\n\t\tvar sRel = '';\r\n\t\tfor (var i = 0; i < iGoUp; i++) {\r\n\t\t\tsRel += '../';\r\n\t\t}\r\n\t\t";
                moduleFileContent = `${moduleFileContent.slice(
                    0,
                    functionStart + funcBracket.length
                )}${replaceContent}${moduleFileContent.slice(posReturn)}`;
                updateFile(fs, join(path, TemplateFileName.ModulePathForTests), moduleFileContent);
            }
        }
    }
}

/**
 * Update paths in test HTML files from legacy structure to new structure
 *
 * @param fs
 * @param ffNewTestPath
 */
function updateTestFilePaths(fs: Editor, ffNewTestPath: string): void {
    if (!hasStore(fs)) {
        return;
    }

    const htmlFiles: string[] = [];
    fs.store.each((file: { path: string }) => {
        const filePath = file.path;
        // Check if file is directly under ffNewTestPath (not nested) and ends with .html
        if (filePath.startsWith(ffNewTestPath + sep) && filePath.endsWith('.html')) {
            // Only include files directly in the test path (no further path separators after the base)
            const relativePath = filePath.substring(ffNewTestPath.length + 1);
            if (!relativePath.includes(sep)) {
                htmlFiles.push(filePath);
            }
        }
    });

    for (const filePath of htmlFiles) {
        let content;
        try {
            content = readFile(fs, filePath);
        } catch (e) {
            throw new MigrationError(e, filePath);
        }

        content = content.replaceAll('../../main/webapp', '../../webapp');
        content = content.replaceAll('/src/test/qunit', '/webapp/test');
        content = content.replace(
            '<script src="../../webapp/test-resources/sap/ushell/shells/sandbox/fioriSandboxConfig.js"></script>',
            ''
        );
        updateFile(fs, filePath, content);
    }
}

/**
 * Update .gitignore to remove legacy path references
 *
 * @param fs
 * @param rootPath
 */
function updateGitignore(fs: Editor, rootPath: string): void {
    const gitignore = join(rootPath, '.gitignore');
    if (!fileExists(fs, gitignore)) {
        return;
    }

    try {
        let gitignoreContent = readFile(fs, gitignore);
        gitignoreContent = gitignoreContent.replaceAll('/src/main', '');
        updateFile(fs, gitignore, gitignoreContent);
    } catch (e) {
        throw new MigrationError(e, '.gitignore');
    }
}

/**
 * Update neo-app.json to remove legacy path references.
 * Updates path properties structurally rather than via string replacement
 * to avoid corrupting other string-valued properties.
 *
 * @param fs
 * @param rootPath
 */
async function updateNeoApp(fs: Editor, rootPath: string): Promise<void> {
    const neoapp = join(rootPath, FileName.NeoApp);
    if (!fileExists(fs, neoapp)) {
        return;
    }

    try {
        const neoappContent: { routes?: Array<{ path?: string; target?: { entryPath?: string } }> } = await readJSON(
            fs,
            neoapp
        );
        if (Array.isArray(neoappContent.routes)) {
            neoappContent.routes = neoappContent.routes.map((route) => ({
                ...route,
                path: route.path?.replace('/src/main', '').replace('/src/test', '/webapp/test'),
                target: route.target
                    ? {
                          ...route.target,
                          entryPath: route.target.entryPath
                              ?.replace('/src/main', '')
                              .replace('/src/test', '/webapp/test')
                      }
                    : route.target
            }));
        }
        updateJSON(fs, neoapp, neoappContent);
    } catch (e) {
        throw new MigrationError(e, FileName.NeoApp);
    }
}

/**
 * Update .project.json (WEB IDE) to remove legacy path references.
 * Updates path properties structurally rather than via string replacement.
 *
 * @param fs
 * @param rootPath
 */
async function updateProjectJson(fs: Editor, rootPath: string): Promise<void> {
    const projectJson = join(rootPath, '.che', 'project.json');
    if (!fileExists(fs, projectJson)) {
        return;
    }

    try {
        const projectJsonContent: { contentRoot?: string; path?: string } = await readJSON(fs, projectJson);
        if (projectJsonContent.contentRoot) {
            projectJsonContent.contentRoot = projectJsonContent.contentRoot.replace('src/main', '');
        }
        if (projectJsonContent.path) {
            projectJsonContent.path = projectJsonContent.path.replace('src/main', '');
        }
        updateJSON(fs, projectJson, projectJsonContent);
    } catch (e) {
        throw new MigrationError(e, 'project.json');
    }
}

/**
 * Check if index.html contains mockserver references
 * If it does, the file should be preserved and new index will be named index_new.html
 *
 * @param fs - mem-fs editor
 * @param rootPath - Root path of the project
 * @param webappPath - Updated webapp path
 * @returns true if mockserver found and index.html should be preserved
 */
function checkForMockserver(fs: Editor, rootPath: string, webappPath: string): boolean {
    const indexPath = join(rootPath, webappPath, TemplateFileName.IndexHtml);
    if (!fileExists(fs, indexPath)) {
        return false;
    }

    try {
        const indexFile = readFile(fs, indexPath);
        // Check if mockserver is referenced (case-insensitive)
        if (indexFile.toLowerCase().includes('mockserver')) {
            // Found mockserver reference - mark that index.html should be renamed
            return true;
        }
    } catch (e) {
        throw new MigrationError(e, TemplateFileName.IndexHtml);
    }

    return false;
}
