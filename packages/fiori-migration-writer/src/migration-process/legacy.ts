/**
 * Helper functions for migrating legacy Fiori Elements folder structures
 * Handles migration from /src/main/webapp to /webapp structure
 */

import { join } from 'node:path';
import fs, { existsSync } from 'node:fs';
import { readFile, updateFile, readJSON, updateJSON, fileExists } from '../utils/index.js';
import { TemplateFileName } from '../index.js';
import { FileName } from '../project-spec-types.js';
import { legacyPath, getFFTestSuiteMap, MigrationError } from '../utils/common.js';
import { ProjectAccess } from '../utils/Project.js';
import type { ImportProjectInfo } from '../types.js';
import { buildLegacyPaths, tryGitMove, fallbackFsMove, cleanupEmptyDirs } from './legacy-helpers.js';

/**
 * Migrate project from legacy Fiori Elements folder structure (/src/main/webapp) to new structure (/webapp)
 *
 * @param projectInfo - Project information including current webapp path
 * @param rootPath - Root path of the project
 * @returns Object containing updated keepIndex flag and updated webapp path
 */
export async function migrateLegacyFolderStructure(
    projectInfo: ImportProjectInfo,
    rootPath: string
): Promise<{ keepIndex: boolean; webappPath: string }> {
    let keepIndex = false;

    // Check if project uses legacy folder structure
    if (!join(projectInfo.webappPath).includes(legacyPath)) {
        return { keepIndex, webappPath: projectInfo.webappPath };
    }

    const paths = buildLegacyPaths(rootPath, legacyPath);
    if (!existsSync(paths.ffLegacyWebappPath)) {
        return { keepIndex, webappPath: projectInfo.webappPath };
    }

    // Try to use git to move files (preserves history)
    await tryGitMove(rootPath, paths);

    // Fallback using node fs to move folders (handles cases where git fails or isn't available)
    fallbackFsMove(rootPath, paths);

    // Remove old src dirs if empty
    await cleanupEmptyDirs(rootPath, legacyPath, paths);

    // Update webapp path after migration
    const updatedWebappPath = await ProjectAccess.getWebappPath(rootPath);
    const ffTestMap = getFFTestSuiteMap(updatedWebappPath);

    // Process legacy qunit runner file
    await processLegacyQunitRunner(paths.ffNewTestPath, ffTestMap);

    // Update ModulePathForTests.js files
    await updateModulePathForTests(paths.ffNewTestPath);

    // Update paths in test files
    if (existsSync(paths.ffNewTestPath)) {
        await updateTestFilePaths(paths.ffNewTestPath);
    }

    // Update various config files
    await Promise.all([updateGitignore(rootPath), updateNeoApp(rootPath), updateProjectJson(rootPath)]);

    // Check for mockserver in index.html
    keepIndex = await checkForMockserver(rootPath, updatedWebappPath);

    return { keepIndex, webappPath: updatedWebappPath };
}

/**
 * Process legacy qunit runner file and generate new test suite
 *
 * @param ffNewTestPath
 * @param ffTestMap
 */
async function processLegacyQunitRunner(ffNewTestPath: string, ffTestMap: any): Promise<void> {
    const qunitRunner = 'qunit.runner.testsuite.html';
    const legacyRunner = join(ffNewTestPath, qunitRunner);

    if (!(await fileExists(legacyRunner))) {
        return;
    }

    let legacyRunnerContent = '';
    try {
        legacyRunnerContent = await readFile(legacyRunner);
    } catch (e) {
        throw new MigrationError(e, qunitRunner);
    }

    // Update context path assignment
    const context = 'ontextPath';
    const contextIdx = legacyRunnerContent.indexOf(context);
    const contextEnd = legacyRunnerContent.indexOf(';', contextIdx);
    const newContext = ' = location.pathname.substring(0, location.pathname.lastIndexOf("/"))';
    legacyRunnerContent = `${legacyRunnerContent.substring(0, contextIdx + context.length)}${newContext}${legacyRunnerContent.substring(contextEnd)}`;

    // Remove all '/test-resources' references
    legacyRunnerContent = legacyRunnerContent.replace(/\/test-resources/g, '');

    // Add qunit redirect script
    const bodyTag = '<body>';
    const bodyTagIdx = legacyRunnerContent.indexOf(bodyTag);
    const qunitScript = '\n<script type="text/javascript" src="/resources/sap/ui/qunit/qunit-redirect.js"></script>';
    legacyRunnerContent = `${legacyRunnerContent.slice(0, bodyTagIdx + bodyTag.length)}${qunitScript}${legacyRunnerContent.slice(bodyTagIdx + bodyTag.length)}`;

    // Add leading slash to context paths if missing
    const pathRegEx = 'contextpath + ';
    let idx = 0;
    do {
        // Search from current position (start at 0 on first iteration, then idx + 1)
        idx = legacyRunnerContent.toLowerCase().indexOf(pathRegEx, idx === 0 ? 0 : idx + 1);
        // +1 skips the opening quote to check the first char inside the string value
        if (idx !== -1 && legacyRunnerContent.charAt(idx + pathRegEx.length + 1) !== '/') {
            legacyRunnerContent = `${legacyRunnerContent.slice(0, idx + pathRegEx.length + 1)}/${legacyRunnerContent.slice(idx + pathRegEx.length + 1)}`;
        }
    } while (idx !== -1);

    // Handle testsuite.qunit.html file
    const testSuiteRunner = join(ffNewTestPath, TemplateFileName.TestsuiteQunitHtml);
    if (!(await fileExists(testSuiteRunner))) {
        await updateFile(testSuiteRunner, legacyRunnerContent);
        delete ffTestMap[TemplateFileName.TestsuiteQunitHtml];
    } else {
        fs.renameSync(testSuiteRunner, join(ffNewTestPath, 'testsuite_old.qunit.html'));

        // Update references to testsuite.qunit.html
        if (legacyRunnerContent.includes('testsuite.qunit.html')) {
            legacyRunnerContent = legacyRunnerContent.replace(/testsuite.qunit.html/g, 'testsuite_old.qunit.html');
        }
        await updateFile(testSuiteRunner, legacyRunnerContent);
        delete ffTestMap[TemplateFileName.TestsuiteQunitHtml];
    }
}

/**
 * Update ModulePathForTests.js files to fix path calculations for new structure
 *
 * @param ffNewTestPath
 */
async function updateModulePathForTests(ffNewTestPath: string): Promise<void> {
    const { findAll } = await import('../utils/file-discovery.js');
    const moduleFilePath: string[] = [];
    await findAll(ffNewTestPath, TemplateFileName.ModulePathForTests, moduleFilePath, []);

    for (const path of moduleFilePath) {
        let moduleFileContent;
        try {
            moduleFileContent = await readFile(join(path, TemplateFileName.ModulePathForTests));
        } catch (e) {
            throw new MigrationError(e, TemplateFileName.ModulePathForTests);
        }

        const pathToRootIdx = moduleFileContent.indexOf('getPathToRoot');
        const funcBracket = '{';
        const functionStart = moduleFileContent.indexOf(funcBracket, pathToRootIdx);
        const posReturn = moduleFileContent.indexOf('return', pathToRootIdx);
        const replaceContent =
            "\r\n\t\tvar number = window.location.href.indexOf(\"/webapp/test/\") !== -1 ? 3 : 1;\r\n\t\tvar iGoUp = URI(window.location.href).segment().length - number;\r\n\t\tvar sRel = '';\r\n\t\tfor (var i = 0; i < iGoUp; i++) {\r\n\t\t\tsRel += '../';\r\n\t\t}\r\n\t\t";
        moduleFileContent = `${moduleFileContent.slice(
            0,
            functionStart + funcBracket.length
        )}${replaceContent}${moduleFileContent.slice(posReturn)}`;
        await updateFile(join(path, TemplateFileName.ModulePathForTests), moduleFileContent);
    }
}

/**
 * Update paths in test HTML files from legacy structure to new structure
 *
 * @param ffNewTestPath
 */
async function updateTestFilePaths(ffNewTestPath: string): Promise<void> {
    const htmlFiles = fs.readdirSync(ffNewTestPath).filter((file) => file.endsWith('.html'));

    for (const file of htmlFiles) {
        const filePath = join(ffNewTestPath, file);
        let content;
        try {
            content = await readFile(filePath);
        } catch (e) {
            throw new MigrationError(e, file);
        }

        content = content.replace(/..\/..\/main\/webapp/g, '../../webapp');
        content = content.replace(/\/src\/test\/qunit/g, '/webapp/test');
        content = content.replace(
            '<script src="../../webapp/test-resources/sap/ushell/shells/sandbox/fioriSandboxConfig.js"></script>',
            ''
        );
        await updateFile(filePath, content);
    }
}

/**
 * Update .gitignore to remove legacy path references
 *
 * @param rootPath
 */
async function updateGitignore(rootPath: string): Promise<void> {
    const gitignore = join(rootPath, '.gitignore');
    if (!(await fileExists(gitignore))) {
        return;
    }

    try {
        let gitignoreContent = await readFile(gitignore);
        gitignoreContent = gitignoreContent.replace(/\/src\/main/g, '');
        await updateFile(gitignore, gitignoreContent);
    } catch (e) {
        throw new MigrationError(e, '.gitignore');
    }
}

/**
 * Update neo-app.json to remove legacy path references
 *
 * @param rootPath
 */
async function updateNeoApp(rootPath: string): Promise<void> {
    const neoapp = join(rootPath, FileName.NeoApp);
    if (!(await fileExists(neoapp))) {
        return;
    }

    try {
        let neoappContent: any = await readJSON(neoapp);
        neoappContent = JSON.stringify(neoappContent);
        neoappContent = neoappContent.replace(/\/src\/main/g, '');
        neoappContent = neoappContent.replace(/\/src\/test/g, '/webapp/test');
        await updateJSON(neoapp, JSON.parse(neoappContent));
    } catch (e) {
        throw new MigrationError(e, FileName.NeoApp);
    }
}

/**
 * Update .project.json (WEB IDE) to remove legacy path references
 *
 * @param rootPath
 */
async function updateProjectJson(rootPath: string): Promise<void> {
    const projectJson = join(rootPath, '.che', 'project.json');
    if (!(await fileExists(projectJson))) {
        return;
    }

    try {
        let projectJsonContent: any = await readJSON(projectJson);
        projectJsonContent = JSON.stringify(projectJsonContent).replace(/src\/main/g, '');
        await updateJSON(projectJson, JSON.parse(projectJsonContent));
    } catch (e) {
        throw new MigrationError(e, 'project.json');
    }
}

/**
 * Check if index.html contains mockserver references
 * If it does, the file should be preserved and new index will be named index_new.html
 *
 * @param rootPath - Root path of the project
 * @param webappPath - Updated webapp path
 * @returns true if mockserver found and index.html should be preserved
 */
async function checkForMockserver(rootPath: string, webappPath: string): Promise<boolean> {
    const indexPath = join(rootPath, webappPath, TemplateFileName.IndexHtml);
    if (!(await fileExists(indexPath))) {
        return false;
    }

    try {
        const indexFile = await readFile(indexPath);
        // Check if mockserver is referenced (case-insensitive)
        if (indexFile.toLowerCase().indexOf('mockserver') !== -1) {
            // Found mockserver reference - mark that index.html should be renamed
            return true;
        }
    } catch (e) {
        throw new MigrationError(e, TemplateFileName.IndexHtml);
    }

    return false;
}
