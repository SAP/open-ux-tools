import { basename, join } from 'path';
import { getWebappPath } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { TEST_CONFIG_DEFAULTS } from './ui5-yaml';

const renameMessage = (filePath: string): string =>
    `Renamed '${filePath}' to '${filePath.slice(
        0,
        -5
    )}_old.html'. This file is no longer needed for the virtual endpoints. If you have not modified this file, you can delete it. If you have modified this file, move the modified content to a custom init script for the preview middleware. For more information, see https://github.com/SAP/open-ux-tools/tree/main/packages/preview-middleware#migration.`;

/**
 * Renames the sandbox file which is used in a given script.
 *
 * The corresponding file will be renamed from *.html to *_old.html.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param path - file path to be used for the renaming
 * @param logger logger to report info to the user
 */
export async function renameSandbox(fs: Editor, basePath: string, path: string, logger?: ToolsLogger): Promise<void> {
    const filePath = join(await getWebappPath(basePath), path);
    if (fs.exists(filePath)) {
        fs.move(filePath, filePath.replace('.html', '_old.html'));
        logger?.info(renameMessage(path));
    } else if (
        //checks if there is a file with the same name which has already been deleted/renamed to _old.html
        Object.keys(
            fs.dump(undefined, (file) => {
                return file.history.includes(filePath) && file.state !== 'deleted';
            })
        ).length === 0
    ) {
        logger?.debug(`The file '${path}', has already been renamed. Skipping renaming.`);
    } else {
        logger?.debug(`The file '${path}', has not been found. Skipping renaming.`);
    }
}

/**
 * Renames the default sandbox files.
 *
 * The default files are 'flpSandbox.html' and 'flpSandboxMockserver.html' and located under webapp/test.
 * It adds '_old' to 'test/flpSandbox.html' and 'test/flpSandboxMockserver.html' to indicate that they will no longer be used.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
export async function renameDefaultSandboxes(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const defaultSandboxPaths = [join('test', 'flpSandbox.html'), join('test', 'flpSandboxMockserver.html')];
    for (const path of defaultSandboxPaths) {
        await renameSandbox(fs, basePath, path, logger);
    }
}

/**
 * Renames the default test suite and runner files.
 *
 * The default files are 'testsuite.qunit.html', 'integration/opaTests.qunit.html' and 'unit/unitTests.qunit.html' located under webapp/test.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
export async function renameDefaultTestFiles(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    for (const path of Object.values(TEST_CONFIG_DEFAULTS).map((config) => config.path)) {
        await renameSandbox(fs, basePath, path, logger);
    }
}

/**
 * Deletes the *.js and *.ts files which are no longer used for the virtual preview.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param convertTests - indicator if test suite and test runner should be included in the conversion
 * @param logger logger to report info to the user
 */
export async function deleteNoLongerUsedFiles(
    fs: Editor,
    basePath: string,
    convertTests: boolean,
    logger?: ToolsLogger
): Promise<void> {
    const webappTestPath = join(await getWebappPath(basePath), 'test');
    const files = [
        join(webappTestPath, 'locate-reuse-libs.js'),
        join(webappTestPath, 'changes_loader.js'),
        join(webappTestPath, 'changes_loader.ts'),
        join(webappTestPath, 'changes_preview.js'),
        join(webappTestPath, 'changes_preview.ts'),
        join(webappTestPath, 'flpSandbox.js'),
        join(webappTestPath, 'flpSandbox.ts'),
        join(webappTestPath, 'initFlpSandbox.js'),
        join(webappTestPath, 'initFlpSandbox.ts')
    ];
    if (convertTests) {
        files.push(join(webappTestPath, 'testsuite.qunit.js'));
        files.push(join(webappTestPath, 'testsuite.qunit.ts'));
        files.push(join(webappTestPath, 'integration', 'opaTests.qunit.js'));
        files.push(join(webappTestPath, 'integration', 'opaTests.qunit.ts'));
        files.push(join(webappTestPath, 'unit', 'unitTests.qunit.js'));
        files.push(join(webappTestPath, 'unit', 'unitTests.qunit.ts'));
    }
    await deleteFiles(fs, files, logger);
}

/**
 * Deletes the given file.
 *
 * @param fs - file system reference
 * @param files - files to be deleted
 * @param logger logger to report info to the user
 */
export async function deleteFiles(fs: Editor, files: string[], logger?: ToolsLogger): Promise<void> {
    files.forEach((path: string): void => {
        if (fs.exists(path)) {
            fs.delete(path);
            logger?.info(
                `Deleted the '${basename(path)}' file. This file is no longer needed for the virtual endpoints.`
            );
        }
    });
}
